/**
 * The domain service behind the panel and the agent tool.
 *
 * It reads magpie's statistics through `MagpieStore`, prices the ledger
 * against the models.dev catalog, and folds the result into month or range
 * payloads. The panel and the `token_calendar` tool share this one service,
 * so a month shown in the UI is the month the model reads.
 *
 * @module dsh-token-calendar/lib/service
 */

import { MagpieStore } from './magpie.js'
import { buildPricingIndex, resolvePrice } from './pricing.js'
import { aggregateRecords, buildMonth, listAgents } from './aggregate.js'

/** The month a request means when it names none: the current one. */
function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Whether a string is a `YYYY-MM` month key.
 * @param {unknown} value - the candidate.
 * @returns {boolean} true when it is a month key.
 */
function isMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

/**
 * The token calendar service.
 */
export class TokenCalendarService {
  /**
   * @param {{usageFile?: string, providersFile?: string, modelsFile?: string, fxFile?: string, ttlMs?: number}} [options] - file overrides and cache age.
   */
  constructor(options = {}) {
    this.store = new MagpieStore(options)
    this.defaultCurrency = options.defaultCurrency === 'usd' ? 'usd' : 'cny'
  }

  /**
   * One month of calendar rows plus the breakdowns.
   * @param {{month?: string, agent?: string|null, force?: boolean}} [options] - the request.
   * @returns {Promise<object>} the payload.
   */
  async month(options = {}) {
    const month = isMonth(options.month) ? options.month : currentMonth()
    const agent = typeof options.agent === 'string' && options.agent !== '' ? options.agent : null
    const snapshot = await this.store.snapshot({ force: options.force === true })
    const pricing = buildPricingIndex(snapshot.models, snapshot.providers)
    const resolver = {
      resolve: (request) => resolvePrice(pricing, request),
    }
    const aggregation = aggregateRecords({ records: snapshot.records, pricing: resolver, agent })
    const fxRate = readFxRate(snapshot.fx)
    const payload = buildMonth(aggregation, month, fxRate)
    return {
      ...payload,
      currency: this.defaultCurrency,
      fxRate,
      meta: {
        ...aggregation.meta,
        fxRate,
        fxAt: readFxAt(snapshot.fx),
        currency: this.defaultCurrency,
        agents: listAgents(snapshot.records),
        paths: snapshot.paths,
        ledger: {
          exists: snapshot.ledger.exists,
          size: snapshot.ledger.size,
          mtimeMs: snapshot.ledger.mtimeMs,
          records: snapshot.ledger.records.length,
          skipped: snapshot.ledger.skipped,
          truncated: snapshot.ledger.truncated === true,
        },
        errors: snapshot.errors,
        generatedAt: new Date().toISOString(),
      },
    }
  }

  /**
   * A flat list of the days that carry traffic, for a date range.
   * @param {{from?: string, to?: string, agent?: string|null, force?: boolean}} [options] - the request.
   * @returns {Promise<object>} the payload.
   */
  async range(options = {}) {
    const from = typeof options.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(options.from) ? options.from : null
    const to = typeof options.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(options.to) ? options.to : null
    const agent = typeof options.agent === 'string' && options.agent !== '' ? options.agent : null
    const snapshot = await this.store.snapshot({ force: options.force === true })
    const pricing = buildPricingIndex(snapshot.models, snapshot.providers)
    const resolver = { resolve: (request) => resolvePrice(pricing, request) }
    const aggregation = aggregateRecords({ records: snapshot.records, pricing: resolver, agent })
    const fxRate = readFxRate(snapshot.fx)
    const days = [...aggregation.days.values()]
      .filter(day => (from === null || day.date >= from) && (to === null || day.date <= to))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map(day => ({
        date: day.date,
        tokens: day.tokens,
        input: day.input,
        output: day.output,
        cacheRead: day.cacheRead,
        requests: day.requests,
        errors: day.errors,
        costUsd: Number(day.costUsd.toFixed(6)),
        costCny: Number((day.costUsd * fxRate).toFixed(4)),
        credits: Number(day.credits.toFixed(4)),
        models: [...day.models.values()].sort((a, b) => b.costUsd - a.costUsd),
        providers: [...day.providers.values()].sort((a, b) => b.costUsd - a.costUsd),
      }))
    return {
      from,
      to,
      agent: agent ?? 'all',
      days,
      totals: {
        tokens: days.reduce((sum, day) => sum + day.tokens, 0),
        requests: days.reduce((sum, day) => sum + day.requests, 0),
        costUsd: Number(days.reduce((sum, day) => sum + day.costUsd, 0).toFixed(6)),
        costCny: Number((days.reduce((sum, day) => sum + day.costUsd, 0) * fxRate).toFixed(4)),
        activeDays: days.length,
      },
      fxRate,
      meta: {
        ...aggregation.meta,
        paths: snapshot.paths,
        errors: snapshot.errors,
        generatedAt: new Date().toISOString(),
      },
    }
  }

  /**
   * Where the numbers come from, and whether they were readable.
   * @param {{force?: boolean}} [options] - the request.
   * @returns {Promise<object>} the diagnostics.
   */
  async sources(options = {}) {
    const snapshot = await this.store.snapshot({ force: options.force === true })
    return {
      paths: snapshot.paths,
      errors: snapshot.errors,
      ledger: {
        exists: snapshot.ledger.exists,
        size: snapshot.ledger.size,
        mtimeMs: snapshot.ledger.mtimeMs,
        records: snapshot.ledger.records.length,
        skipped: snapshot.ledger.skipped,
        truncated: snapshot.ledger.truncated === true,
      },
      fx: {
        rate: readFxRate(snapshot.fx),
        at: readFxAt(snapshot.fx),
      },
      agents: listAgents(snapshot.records),
      firstDate: snapshot.records.length === 0
        ? null
        : snapshot.records.reduce((min, record) => {
          const date = String(record.t).slice(0, 10)
          return min === null || date < min ? date : min
        }, null),
      lastDate: snapshot.records.length === 0
        ? null
        : snapshot.records.reduce((max, record) => {
          const date = String(record.t).slice(0, 10)
          return max === null || date > max ? date : max
        }, null),
    }
  }
}

/**
 * The USD/CNY rate, defaulting to 1 when magpie has no cached rate.
 * @param {unknown} fx - the parsed `fxrate.json`.
 * @returns {number} the rate.
 */
function readFxRate(fx) {
  const rate = fx !== null && typeof fx === 'object' ? Number(/** @type {{rate?: unknown}} */ (fx).rate) : Number.NaN
  return Number.isFinite(rate) && rate > 0 ? rate : 1
}

/**
 * When the cached rate was taken.
 * @param {unknown} fx - the parsed `fxrate.json`.
 * @returns {string|null} the timestamp.
 */
function readFxAt(fx) {
  if (fx === null || typeof fx !== 'object') return null
  const at = /** @type {{at?: unknown}} */ (fx).at
  return typeof at === 'string' ? at : null
}
