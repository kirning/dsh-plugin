/**
 * Model pricing for magpie's request ledger.
 *
 * magpie prices requests against the models.dev catalog it caches in
 * `~/.cache/magpie/models.json`: every provider entry lists its models with
 * a `cost` object holding USD prices per million tokens
 * (`input`, `output`, `cache_read`, `cache_write`).
 *
 * The provider id inside the ledger is magpie's own provider id, which is not
 * always the catalog id: `providers.json` maps one to the other through
 * `catalog` or `preset`. When a model is missing from that provider's
 * catalog, a global fallback finds the same model id in another provider and
 * marks the price as an estimate.
 *
 * @module dsh-token-calendar/lib/pricing
 */

/**
 * Normalize a model id for comparison: case and separators do not matter.
 * @param {string} value - a model id or name.
 * @returns {string} the comparison key.
 */
export function normalizeModelKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Pull the provider list out of magpie's `providers.json`.
 * @param {unknown} doc - the parsed document.
 * @returns {object[]} the provider entries.
 */
function providerEntries(doc) {
  if (Array.isArray(doc)) return doc.filter(entry => entry !== null && typeof entry === 'object')
  if (doc !== null && typeof doc === 'object') {
    const list = /** @type {{providers?: unknown}} */ (doc).providers
    if (Array.isArray(list)) return list.filter(entry => entry !== null && typeof entry === 'object')
  }
  return []
}

/**
 * Build the pricing index.
 * @param {unknown} modelsDoc - the parsed `models.json`.
 * @param {unknown} providersDoc - the parsed `providers.json`.
 * @returns {{catalogs: Map<string, Map<string, object>>, catalogOf: Map<string, string>, global: Map<string, object>}} the index.
 */
export function buildPricingIndex(modelsDoc, providersDoc) {
  /** @type {Map<string, Map<string, object>>} */
  const catalogs = new Map()
  /** @type {Map<string, string>} */
  const catalogOf = new Map()
  /** @type {Map<string, object>} */
  const global = new Map()

  if (modelsDoc !== null && typeof modelsDoc === 'object' && !Array.isArray(modelsDoc)) {
    for (const [catalogId, provider] of Object.entries(/** @type {Record<string, unknown>} */ (modelsDoc))) {
      if (provider === null || typeof provider !== 'object') continue
      const models = /** @type {{models?: unknown}} */ (provider).models
      if (models === null || typeof models !== 'object') continue
      /** @type {Map<string, object>} */
      const table = new Map()
      for (const [modelId, model] of Object.entries(/** @type {Record<string, unknown>} */ (models))) {
        if (model === null || typeof model !== 'object') continue
        const cost = /** @type {{cost?: unknown}} */ (model).cost
        if (cost === null || typeof cost !== 'object') continue
        table.set(normalizeModelKey(modelId), { id: modelId, cost })
        const alias = normalizeModelKey(/** @type {{name?: unknown}} */ (model).name ?? '')
        if (alias !== '' && !table.has(alias)) table.set(alias, { id: modelId, cost })
        const globalEntry = global.get(normalizeModelKey(modelId))
        if (globalEntry === undefined) {
          global.set(normalizeModelKey(modelId), { id: modelId, cost, catalogs: new Set([catalogId]) })
        } else {
          globalEntry.catalogs.add(catalogId)
        }
      }
      catalogs.set(catalogId, table)
    }
  }

  for (const entry of providerEntries(providersDoc)) {
    const id = entry.id
    if (typeof id !== 'string' || id === '') continue
    const catalog = typeof entry.catalog === 'string' && entry.catalog !== ''
      ? entry.catalog
      : typeof entry.preset === 'string' && entry.preset !== ''
        ? entry.preset
        : id
    catalogOf.set(id, catalog)
    if (!catalogOf.has(catalog)) catalogOf.set(catalog, catalog)
  }

  return { catalogs, catalogOf, global }
}

/**
 * The effective price for one request, honouring context-size tiers.
 * @param {{cost?: object}} entry - a catalog entry.
 * @param {number} contextTokens - the request's context size in tokens.
 * @returns {{input: number, output: number, cacheRead: number, cacheWrite: number}} the USD price per million tokens.
 */
export function selectCost(entry, contextTokens) {
  const cost = entry?.cost ?? {}
  const pick = (source) => ({
    input: Number(source?.input ?? 0) || 0,
    output: Number(source?.output ?? 0) || 0,
    cacheRead: Number(source?.cache_read ?? 0) || 0,
    cacheWrite: Number(source?.cache_write ?? 0) || 0,
  })

  const tiers = Array.isArray(cost.tiers) ? cost.tiers : []
  let selected = null
  for (const tier of tiers) {
    const size = Number(tier?.tier?.size ?? 0) || 0
    if (size <= contextTokens && (selected === null || size > (selected?.tier?.size ?? -1))) selected = tier
  }
  if (selected !== null) return pick(selected)

  const over = cost.context_over_200k
  if (over !== null && typeof over === 'object' && contextTokens > 200000) return pick(over)

  return pick(cost)
}

/**
 * Resolve the price of one ledger record.
 * @param {{catalogs: Map<string, Map<string, object>>, catalogOf: Map<string, string>, global: Map<string, object>}} index - the pricing index.
 * @param {{provider: string, model: string, contextTokens: number}} request - the request.
 * @returns {{price: {input: number, output: number, cacheRead: number, cacheWrite: number}, source: 'provider'|'global'|'none', estimated: boolean, modelId: string}} the resolution.
 */
export function resolvePrice(index, request) {
  const names = [request.model, request.served].filter(name => typeof name === 'string' && name !== '')
  const candidates = []
  const catalog = index.catalogOf.get(request.provider)
  for (const catalogId of catalog === undefined ? [] : [catalog]) {
    const table = index.catalogs.get(catalogId)
    if (table === undefined) continue
    for (const name of names) {
      const entry = table.get(normalizeModelKey(name))
      if (entry !== undefined) candidates.push({ entry, source: 'provider' })
    }
  }
  if (candidates.length === 0) {
    const own = index.catalogs.get(request.provider)
    if (own !== undefined) {
      for (const name of names) {
        const entry = own.get(normalizeModelKey(name))
        if (entry !== undefined) candidates.push({ entry, source: 'provider' })
      }
    }
  }
  if (candidates.length === 0) {
    for (const name of names) {
      const entry = index.global.get(normalizeModelKey(name))
      if (entry !== undefined) candidates.push({ entry, source: 'global' })
    }
  }
  if (candidates.length === 0) {
    return {
      price: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      source: 'none',
      estimated: false,
      modelId: names[0] ?? '',
    }
  }
  const chosen = candidates[0]
  return {
    price: selectCost(chosen.entry, request.contextTokens),
    source: chosen.source,
    estimated: chosen.source === 'global',
    modelId: chosen.entry.id ?? names[0] ?? '',
  }
}
