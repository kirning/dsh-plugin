/**
 * Daily aggregation of magpie's request ledger.
 *
 * Every ledger line describes one proxied request: when it happened, which
 * agent sent it, which provider served it, and how many tokens it moved.
 * This module folds those lines into per-day totals plus the breakdowns the
 * calendar panel and the agent tool both read.
 *
 * A day's token count is `input + output + cache_read + cache_write`.
 * Reasoning tokens are counted separately: they are already part of `output`
 * for the providers that report them.
 *
 * @module dsh-token-calendar/lib/aggregate
 */

/** Empty per-day bucket. */
function newBucket(date) {
  return {
    date,
    tokens: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    reasoning: 0,
    requests: 0,
    errors: 0,
    costUsd: 0,
    estimatedCostUsd: 0,
    pricedRequests: 0,
    unpricedRequests: 0,
    credits: 0,
    agents: new Map(),
    models: new Map(),
    providers: new Map(),
  }
}

/**
 * Add one request to its day bucket.
 * @param {object} bucket - the day bucket.
 * @param {object} record - the ledger record.
 * @param {object} price - the resolved price.
 */
function applyRecord(bucket, record, price) {
  const input = Number(record.in ?? 0) || 0
  const output = Number(record.out ?? 0) || 0
  const cacheRead = Number(record.cache_read ?? 0) || 0
  const cacheWrite = Number(record.cache_write ?? 0) || 0
  const reasoning = Number(record.reasoning ?? 0) || 0
  const tokens = input + output + cacheRead + cacheWrite

  bucket.tokens += tokens
  bucket.input += input
  bucket.output += output
  bucket.cacheRead += cacheRead
  bucket.cacheWrite += cacheWrite
  bucket.reasoning += reasoning
  bucket.requests += 1
  const status = Number(record.status ?? 0) || 0
  if (status >= 400) bucket.errors += 1

  const cost = (tokens === 0 && input === 0 && output === 0)
    ? 0
    : (input / 1e6) * price.price.input +
      (output / 1e6) * price.price.output +
      (cacheRead / 1e6) * price.price.cacheRead +
      (cacheWrite / 1e6) * price.price.cacheWrite
  bucket.costUsd += cost
  if (price.estimated) bucket.estimatedCostUsd += cost
  if (price.source === 'none') bucket.unpricedRequests += 1
  else bucket.pricedRequests += 1

  const credits = Number(record.credits ?? 0) || 0
  bucket.credits += credits

  const agent = typeof record.agent === 'string' && record.agent !== '' ? record.agent : 'unknown'
  const agentEntry = bucket.agents.get(agent) ?? { agent, tokens: 0, requests: 0, costUsd: 0 }
  agentEntry.tokens += tokens
  agentEntry.requests += 1
  agentEntry.costUsd += cost
  bucket.agents.set(agent, agentEntry)

  const provider = typeof record.provider === 'string' && record.provider !== '' ? record.provider : 'unknown'
  const model = price.modelId !== ''
    ? price.modelId
    : typeof record.served === 'string' && record.served !== ''
      ? record.served
      : typeof record.model === 'string' && record.model !== ''
        ? record.model
        : provider
  const modelKey = `${provider}::${model}`
  const modelEntry = bucket.models.get(modelKey) ?? { provider, model, tokens: 0, requests: 0, costUsd: 0 }
  modelEntry.tokens += tokens
  modelEntry.requests += 1
  modelEntry.costUsd += cost
  bucket.models.set(modelKey, modelEntry)

  const providerEntry = bucket.providers.get(provider) ?? { provider, tokens: 0, requests: 0, costUsd: 0 }
  providerEntry.tokens += tokens
  providerEntry.requests += 1
  providerEntry.costUsd += cost
  bucket.providers.set(provider, providerEntry)
}

/**
 * Fold the whole ledger into per-day buckets.
 * @param {{records: object[], pricing: object, agent?: string|null}} options - the ledger, the pricing index and an optional agent filter.
 * @returns {{days: Map<string, object>, meta: object}} the buckets and ledger-wide facts.
 */
export function aggregateRecords({ records, pricing, agent = null }) {
  const filter = typeof agent === 'string' && agent !== '' && agent !== 'all' ? agent : null
  /** @type {Map<string, object>} */
  const days = new Map()
  let firstDate = null
  let lastDate = null
  let considered = 0

  for (const record of records) {
    const date = String(record.t).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    if (filter !== null && (record.agent ?? 'unknown') !== filter) continue
    considered += 1
    if (firstDate === null || date < firstDate) firstDate = date
    if (lastDate === null || date > lastDate) lastDate = date

    let bucket = days.get(date)
    if (bucket === undefined) {
      bucket = newBucket(date)
      days.set(date, bucket)
    }
    const input = Number(record.in ?? 0) || 0
    const cacheRead = Number(record.cache_read ?? 0) || 0
    const price = pricing.resolve({
      provider: String(record.provider ?? ''),
      model: String(record.model ?? ''),
      served: String(record.served ?? ''),
      contextTokens: input + cacheRead,
    })
    applyRecord(bucket, record, price)
  }

  return {
    days,
    meta: {
      records: records.length,
      considered,
      firstDate,
      lastDate,
      agent: filter ?? 'all',
    },
  }
}

/**
 * Serialize one day bucket.
 * @param {object} bucket - the day bucket.
 * @param {number} fxRate - the USD/CNY rate.
 * @returns {object} the day row.
 */
function serializeDay(bucket, fxRate) {
  const models = [...bucket.models.values()].sort((a, b) => b.costUsd - a.costUsd || b.tokens - a.tokens)
  const providers = [...bucket.providers.values()].sort((a, b) => b.costUsd - a.costUsd || b.tokens - a.tokens)
  const agents = [...bucket.agents.values()].sort((a, b) => b.tokens - a.tokens)
  return {
    date: bucket.date,
    day: Number(bucket.date.slice(8, 10)),
    tokens: bucket.tokens,
    input: bucket.input,
    output: bucket.output,
    cacheRead: bucket.cacheRead,
    cacheWrite: bucket.cacheWrite,
    reasoning: bucket.reasoning,
    requests: bucket.requests,
    errors: bucket.errors,
    costUsd: round(bucket.costUsd, 6),
    costCny: round(bucket.costUsd * fxRate, 4),
    estimatedCostUsd: round(bucket.estimatedCostUsd, 6),
    credits: round(bucket.credits, 4),
    pricedRequests: bucket.pricedRequests,
    unpricedRequests: bucket.unpricedRequests,
    agents,
    models,
    providers,
  }
}

/**
 * Round a number to a fixed number of decimals.
 * @param {number} value - the value.
 * @param {number} digits - decimal places.
 * @returns {number} the rounded value.
 */
function round(value, digits) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * The number of days in a month.
 * @param {number} year - the year.
 * @param {number} month - the 1-based month.
 * @returns {number} the day count.
 */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Build one month of calendar rows, zero-filled for days without traffic.
 * @param {{days: Map<string, object>}} aggregation - the aggregated buckets.
 * @param {string} month - the `YYYY-MM` key.
 * @param {number} fxRate - the USD/CNY rate.
 * @returns {{month: string, firstWeekday: number, days: object[], totals: object}} the month payload.
 */
export function buildMonth(aggregation, month, fxRate) {
  const [yearText, monthText] = String(month).split('-')
  const year = Number(yearText)
  const monthIndex = Number(monthText)
  const total = Number.isFinite(year) && Number.isFinite(monthIndex) ? daysInMonth(year, monthIndex) : 30
  const firstWeekday = Number.isFinite(year) && Number.isFinite(monthIndex)
    ? (new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay() + 6) % 7
    : 0

  const days = []
  const totals = {
    tokens: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    reasoning: 0,
    requests: 0,
    errors: 0,
    costUsd: 0,
    estimatedCostUsd: 0,
    credits: 0,
    pricedRequests: 0,
    unpricedRequests: 0,
    activeDays: 0,
  }
  const modelTotals = new Map()
  const providerTotals = new Map()
  const agentTotals = new Map()

  for (let day = 1; day <= total; day += 1) {
    const date = `${String(year).padStart(4, '0')}-${String(monthIndex).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const bucket = aggregation.days.get(date)
    if (bucket === undefined) {
      days.push({
        date,
        day,
        tokens: 0,
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        reasoning: 0,
        requests: 0,
        errors: 0,
        costUsd: 0,
        costCny: 0,
        estimatedCostUsd: 0,
        credits: 0,
        pricedRequests: 0,
        unpricedRequests: 0,
        agents: [],
        models: [],
        providers: [],
      })
      continue
    }
    const row = serializeDay(bucket, fxRate)
    days.push(row)
    totals.tokens += row.tokens
    totals.input += row.input
    totals.output += row.output
    totals.cacheRead += row.cacheRead
    totals.cacheWrite += row.cacheWrite
    totals.reasoning += row.reasoning
    totals.requests += row.requests
    totals.errors += row.errors
    totals.costUsd += row.costUsd
    totals.estimatedCostUsd += row.estimatedCostUsd
    totals.credits += row.credits
    totals.pricedRequests += row.pricedRequests
    totals.unpricedRequests += row.unpricedRequests
    totals.activeDays += 1
    for (const entry of row.models) {
      const key = `${entry.provider}::${entry.model}`
      const item = modelTotals.get(key) ?? { provider: entry.provider, model: entry.model, tokens: 0, requests: 0, costUsd: 0 }
      item.tokens += entry.tokens
      item.requests += entry.requests
      item.costUsd += entry.costUsd
      modelTotals.set(key, item)
    }
    for (const entry of row.providers) {
      const item = providerTotals.get(entry.provider) ?? { provider: entry.provider, tokens: 0, requests: 0, costUsd: 0 }
      item.tokens += entry.tokens
      item.requests += entry.requests
      item.costUsd += entry.costUsd
      providerTotals.set(entry.provider, item)
    }
    for (const entry of row.agents) {
      const item = agentTotals.get(entry.agent) ?? { agent: entry.agent, tokens: 0, requests: 0, costUsd: 0 }
      item.tokens += entry.tokens
      item.requests += entry.requests
      item.costUsd += entry.costUsd
      agentTotals.set(entry.agent, item)
    }
  }

  totals.costUsd = round(totals.costUsd, 6)
  totals.estimatedCostUsd = round(totals.estimatedCostUsd, 6)
  totals.costCny = round(totals.costUsd * fxRate, 4)
  totals.credits = round(totals.credits, 4)
  totals.estimatedShare = totals.costUsd > 0 ? round(totals.estimatedCostUsd / totals.costUsd, 4) : 0

  const sortByCost = (a, b) => b.costUsd - a.costUsd || b.tokens - a.tokens
  return {
    month: `${String(year).padStart(4, '0')}-${String(monthIndex).padStart(2, '0')}`,
    firstWeekday,
    days,
    totals,
    models: [...modelTotals.values()].sort(sortByCost),
    providers: [...providerTotals.values()].sort(sortByCost),
    agents: [...agentTotals.values()].sort((a, b) => b.tokens - a.tokens),
  }
}

/**
 * The ledger's agents, for the panel's filter.
 * @param {object[]} records - the ledger records.
 * @returns {string[]} the distinct agent names, sorted.
 */
export function listAgents(records) {
  const names = new Set()
  for (const record of records) {
    if (typeof record.agent === 'string' && record.agent !== '') names.add(record.agent)
  }
  return [...names].sort()
}
