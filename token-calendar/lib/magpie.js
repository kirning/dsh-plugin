/**
 * Access to the local magpie installation's statistics files.
 *
 * magpie keeps its request ledger as an append-only JSONL file and prices
 * every model through the models.dev catalog it caches next to the ledger.
 * Nothing here needs magpie to be running: the files are plain data on disk.
 *
 * Layout on this machine (magpie 0.x, Windows):
 *
 * | file                                    | content                                  |
 * | --------------------------------------- | ---------------------------------------- |
 * | `~/.config/magpie/usage.jsonl`          | one JSON object per proxied request      |
 * | `~/.config/magpie/providers.json`       | the user's providers and their catalogs  |
 * | `~/.cache/magpie/models.json`           | models.dev catalog with per-token prices |
 * | `~/.cache/magpie/fxrate.json`           | the USD/CNY rate used for display        |
 *
 * @module dsh-token-calendar/lib/magpie
 */

import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

/** Default locations of a magpie installation on this machine. */
export const DEFAULT_PATHS = {
  usage: '~/.config/magpie/usage.jsonl',
  providers: '~/.config/magpie/providers.json',
  models: '~/.cache/magpie/models.json',
  fx: '~/.cache/magpie/fxrate.json',
}

/** Largest ledger slice read in one go; older lines are dropped past it. */
const MAX_LEDGER_BYTES = 64 * 1024 * 1024

/**
 * Expand a configured path: `~`, `%VAR%` and `${VAR}` are resolved.
 * @param {string} input - the configured path.
 * @returns {string} an absolute path.
 */
export function expandPath(input) {
  const raw = String(input ?? '')
  const home = homedir()
  let value = raw
  if (value === '~') value = home
  else if (value.startsWith('~/') || value.startsWith('~\\')) value = join(home, value.slice(2))
  value = value.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (whole, name) => process.env[name] ?? whole)
  value = value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (whole, name) => process.env[name] ?? whole)
  return isAbsolute(value) ? resolve(value) : resolve(process.cwd(), value)
}

/**
 * Resolve the four file paths this plugin reads.
 * @param {{usageFile?: string, providersFile?: string, modelsFile?: string, fxFile?: string}} [options] - overrides.
 * @returns {{usage: string, providers: string, models: string, fx: string}} absolute paths.
 */
export function resolvePaths(options = {}) {
  return {
    usage: expandPath(options.usageFile ?? DEFAULT_PATHS.usage),
    providers: expandPath(options.providersFile ?? DEFAULT_PATHS.providers),
    models: expandPath(options.modelsFile ?? DEFAULT_PATHS.models),
    fx: expandPath(options.fxFile ?? DEFAULT_PATHS.fx),
  }
}

/**
 * Read and parse a JSON file, reporting the failure instead of throwing.
 * @param {string} path - absolute path.
 * @returns {Promise<{ok: boolean, value: unknown, error: string|null, exists: boolean, size: number, mtimeMs: number}>} the read result.
 */
async function readJsonFile(path) {
  try {
    const info = await stat(path)
    const text = await readFile(path, 'utf8')
    let value = null
    try {
      value = JSON.parse(text)
    } catch (error) {
      return { ok: false, value: null, error: `invalid JSON: ${String(error?.message ?? error)}`, exists: true, size: info.size, mtimeMs: info.mtimeMs }
    }
    return { ok: true, value, error: null, exists: true, size: info.size, mtimeMs: info.mtimeMs }
  } catch (error) {
    const code = error?.code ?? 'EUNKNOWN'
    return { ok: false, value: null, error: code === 'ENOENT' ? 'file not found' : String(error?.message ?? error), exists: false, size: 0, mtimeMs: 0 }
  }
}

/**
 * Read the request ledger.
 *
 * The ledger is append-only, so the last line may be half-written while
 * magpie is running: unparsable lines are skipped instead of failing the
 * whole read. Very large ledgers are read from the tail only.
 * @param {string} path - absolute path of `usage.jsonl`.
 * @returns {Promise<{ok: boolean, records: object[], skipped: number, error: string|null, exists: boolean, size: number, mtimeMs: number}>} the ledger.
 */
export async function readUsageLedger(path) {
  try {
    const info = await stat(path)
    let text
    let truncated = false
    if (info.size > MAX_LEDGER_BYTES) {
      const handle = await readFile(path, 'utf8')
      text = handle.slice(-MAX_LEDGER_BYTES)
      truncated = true
    } else {
      text = await readFile(path, 'utf8')
    }
    const records = []
    let skipped = 0
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (trimmed === '') continue
      let parsed = null
      try {
        parsed = JSON.parse(trimmed)
      } catch {
        skipped += 1
        continue
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        skipped += 1
        continue
      }
      if (typeof parsed.t !== 'string' || parsed.t.length < 10) {
        skipped += 1
        continue
      }
      records.push(parsed)
    }
    return { ok: true, records, skipped, error: null, exists: true, size: info.size, mtimeMs: info.mtimeMs, truncated }
  } catch (error) {
    const code = error?.code ?? 'EUNKNOWN'
    return {
      ok: false,
      records: [],
      skipped: 0,
      error: code === 'ENOENT' ? 'file not found' : String(error?.message ?? error),
      exists: false,
      size: 0,
      mtimeMs: 0,
      truncated: false,
    }
  }
}

/**
 * Cached reader over magpie's statistics files.
 *
 * The ledger grows while magpie runs; re-reading it for every panel request
 * would be wasteful, so the parsed snapshot is kept until one of the files
 * changes on disk or the cache grows older than `ttlMs`.
 */
export class MagpieStore {
  /**
   * @param {{usageFile?: string, providersFile?: string, modelsFile?: string, fxFile?: string, ttlMs?: number}} [options] - file overrides and cache age.
   */
  constructor(options = {}) {
    this.paths = resolvePaths(options)
    this.ttlMs = typeof options.ttlMs === 'number' && options.ttlMs >= 0 ? options.ttlMs : 15000
    this._snapshot = null
    this._readAt = 0
    this._signature = ''
  }

  /**
   * Read the current statistics snapshot.
   * @param {{force?: boolean}} [options] - bypass the cache.
   * @returns {Promise<{records: object[], ledger: object, models: object, providers: object, fx: object, errors: string[], paths: object}>} the snapshot.
   */
  async snapshot({ force = false } = {}) {
    const now = Date.now()
    if (!force && this._snapshot !== null && now - this._readAt < this.ttlMs) return this._snapshot
    const signature = await this._fileSignature()
    if (!force && this._snapshot !== null && signature === this._signature) {
      this._readAt = now
      return this._snapshot
    }

    const [ledger, models, providers, fx] = await Promise.all([
      readUsageLedger(this.paths.usage),
      readJsonFile(this.paths.models),
      readJsonFile(this.paths.providers),
      readJsonFile(this.paths.fx),
    ])

    const errors = []
    if (!ledger.ok) errors.push(`usage ledger: ${ledger.error}`)
    if (!models.ok) errors.push(`model catalog: ${models.error}`)
    if (!providers.ok) errors.push(`providers: ${providers.error}`)
    if (!fx.ok) errors.push(`exchange rate: ${fx.error}`)

    this._snapshot = {
      records: ledger.records,
      ledger,
      models: models.value,
      providers: providers.value,
      fx: fx.value,
      errors,
      paths: this.paths,
    }
    this._signature = signature
    this._readAt = now
    return this._snapshot
  }

  /**
   * A cheap fingerprint of the files, used to detect changes.
   * @returns {Promise<string>} the signature.
   */
  async _fileSignature() {
    const parts = []
    for (const path of [this.paths.usage, this.paths.models, this.paths.providers, this.paths.fx]) {
      try {
        const info = await stat(path)
        parts.push(`${path}:${info.size}:${info.mtimeMs}`)
      } catch {
        parts.push(`${path}:missing`)
      }
    }
    return parts.join('|')
  }
}
