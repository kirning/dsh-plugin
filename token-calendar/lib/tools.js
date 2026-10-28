/**
 * The `token_calendar` agent tool.
 *
 * Registered as a plain definition object rather than through `defineTool`, so
 * this package needs no runtime dependency: `parameters` and `output.schema`
 * are written directly in the supported JSON-Schema subset, and every action
 * returns one rendered text block.
 *
 * The tool calls the same `TokenCalendarService` as the panel, so the month
 * the model reads is the month shown in the sidebar.
 *
 * @module dsh-token-calendar/lib/tools
 */

/**
 * Render a token count the way the panel does: three significant digits and
 * the largest unit that keeps the number readable.
 * @param {number} value - the token count.
 * @returns {string} the formatted number.
 */
export function formatTokens(value) {
  const count = Number(value) || 0
  if (Math.abs(count) >= 1e9) return `${trim(count / 1e9)}B`
  if (Math.abs(count) >= 1e6) return `${trim(count / 1e6)}M`
  if (Math.abs(count) >= 1e3) return `${trim(count / 1e3)}K`
  return String(Math.round(count))
}

/**
 * Round to three significant digits and drop trailing zeros.
 * @param {number} value - the value.
 * @returns {string} the formatted number.
 */
function trim(value) {
  if (!Number.isFinite(value) || value === 0) return '0'
  const exponent = Math.floor(Math.log10(Math.abs(value)))
  const factor = 10 ** (2 - exponent)
  return String(Math.round(value * factor) / factor)
}

/**
 * Render a money amount.
 * @param {number} value - the amount.
 * @param {string} currency - `cny` or `usd`.
 * @returns {string} the formatted amount.
 */
function formatMoney(value, currency) {
  const amount = Number(value) || 0
  const symbol = currency === 'usd' ? '$' : '¥'
  return `${symbol}${amount.toFixed(2)}`
}

/**
 * Render the totals of a month.
 * @param {object} payload - the month payload.
 * @returns {string} the text block.
 */
function renderSummary(payload) {
  const { totals, meta } = payload
  const lines = [
    `Token calendar for ${payload.month} (magpie ledger, agent=${meta.agent}):`,
    `total: ${formatTokens(totals.tokens)} tokens in ${totals.requests} request(s) across ${totals.activeDays} active day(s)`,
    `cost: ${formatMoney(totals.costUsd, 'usd')} / ${formatMoney(totals.costCny, 'cny')} (fx ${meta.fxRate}${meta.fxAt === null ? '' : ` @ ${meta.fxAt}`})`,
  ]
  if (totals.credits > 0) lines.push(`credits: ${totals.credits.toFixed(2)}`)
  if (totals.unpricedRequests > 0) {
    lines.push(`note: ${totals.unpricedRequests} request(s) had no catalog price and contribute 0 to the cost`)
  }
  if ((totals.estimatedCostUsd ?? 0) > 0 && totals.costUsd > 0) {
    lines.push(`note: ${Math.round((totals.estimatedCostUsd / totals.costUsd) * 100)}% of the amount is estimated with another provider's list price`)
  }
  if (payload.agents.length > 1) {
    lines.push(`agents: ${payload.agents.map(agent => `${agent.agent} ${formatTokens(agent.tokens)}`).join(', ')}`)
  }
  return lines.join('\n')
}

/**
 * Render the month summary.
 * @param {object} payload - the month payload.
 * @returns {string} the text block.
 */
function renderMonth(payload) {
  const { totals, meta } = payload
  const lines = [
    `Token calendar for ${payload.month} (magpie ledger, agent=${meta.agent}):`,
    `total: ${formatTokens(totals.tokens)} tokens in ${totals.requests} request(s) across ${totals.activeDays} active day(s)`,
    `cost: ${formatMoney(totals.costUsd, 'usd')} / ${formatMoney(totals.costCny, 'cny')} (fx ${meta.fxRate}${meta.fxAt === null ? '' : ` @ ${meta.fxAt}`})`,
  ]
  if (totals.credits > 0) lines.push(`credits: ${totals.credits.toFixed(2)}`)
  if (totals.unpricedRequests > 0) {
    lines.push(`note: ${totals.unpricedRequests} request(s) had no catalog price and contribute 0 to the cost`)
  }
  if ((totals.estimatedCostUsd ?? 0) > 0 && totals.costUsd > 0) {
    lines.push(`note: ${Math.round((totals.estimatedCostUsd / totals.costUsd) * 100)}% of the amount is estimated with another provider's list price`)
  }
  const days = payload.days.filter(day => day.requests > 0)
  if (days.length === 0) {
    lines.push('no requests recorded in this month.')
    return lines.join('\n')
  }
  lines.push('')
  lines.push('date | requests | tokens | cost (CNY)')
  lines.push('--- | --- | --- | ---')
  for (const day of days) {
    lines.push(`${day.date} | ${day.requests} | ${formatTokens(day.tokens)} | ${formatMoney(day.costCny, 'cny')}`)
  }
  if (payload.models.length > 0) {
    lines.push('')
    lines.push('top models by cost:')
    for (const model of payload.models.slice(0, 10)) {
      lines.push(`- ${model.provider}/${model.model || '-'}: ${formatTokens(model.tokens)} tokens, ${formatMoney(model.costUsd * (meta.fxRate ?? 1), 'cny')}, ${model.requests} request(s)`)
    }
  }
  return lines.join('\n')
}

/**
 * Render the day detail.
 * @param {object} payload - the range payload.
 * @param {string} date - the day.
 * @returns {string} the text block.
 */
function renderDay(payload, date) {
  const day = payload.days.find(entry => entry.date === date)
  if (day === undefined) return `No magpie requests recorded on ${date}.`
  const lines = [
    `${date}: ${formatTokens(day.tokens)} tokens in ${day.requests} request(s), ${formatMoney(day.costCny, 'cny')} (${formatMoney(day.costUsd, 'usd')})`,
    `input ${formatTokens(day.input)} | output ${formatTokens(day.output)} | cache read ${formatTokens(day.cacheRead)}`,
  ]
  if (day.errors > 0) lines.push(`failed requests: ${day.errors}`)
  if (day.models.length > 0) {
    lines.push('')
    lines.push('model | requests | tokens | cost (CNY)')
    lines.push('--- | --- | --- | ---')
    for (const model of day.models.slice(0, 12)) {
      lines.push(`${model.provider}/${model.model || '-'} | ${model.requests} | ${formatTokens(model.tokens)} | ${formatMoney(model.costUsd * payload.fxRate, 'cny')}`)
    }
    if (day.models.length > 12) lines.push(`... ${day.models.length - 12} more model(s) with less cost`)
  }
  return lines.join('\n')
}

/**
 * Render the data sources.
 * @param {object} payload - the sources payload.
 * @returns {string} the text block.
 */
function renderSources(payload) {
  const lines = [
    'magpie statistics on this machine:',
    `ledger: ${payload.paths.usage} (${payload.ledger.records} record(s), ${payload.ledger.size} bytes)`,
    `models: ${payload.paths.models}`,
    `providers: ${payload.paths.providers}`,
    `fx: ${payload.paths.fx} (rate ${payload.fx.rate}${payload.fx.at === null ? '' : ` @ ${payload.fx.at}`})`,
    `coverage: ${payload.firstDate ?? 'n/a'} .. ${payload.lastDate ?? 'n/a'}`,
  ]
  if (payload.agents.length > 0) lines.push(`agents: ${payload.agents.join(', ')}`)
  if (payload.errors.length > 0) lines.push(`problems: ${payload.errors.join('; ')}`)
  return lines.join('\n')
}

/**
 * Build the `token_calendar` tool definition.
 * @param {{service: import('./service.js').TokenCalendarService}} service - the domain service.
 * @returns {object} the tool definition.
 */
export function tokenCalendarTool(service) {
  return {
    name: 'token_calendar',
    description:
      'Read the token consumption statistics this machine\'s magpie gateway has recorded, and lay them out as a calendar. ' +
      'Covers every request magpie proxied (agent, provider, model, input/output/cache tokens) with per-day spend priced ' +
      'against the models.dev catalog and converted with magpie\'s cached USD/CNY rate. ' +
      'Actions: month (one month of per-day rows plus model/provider breakdowns), day (one date in detail), ' +
      'range (every day between two dates), summary (totals only), sources (the files behind the numbers). ' +
      'Triggers: token 用量, token 消耗, 消耗日历, 花了多少钱, token 统计, 花销, token calendar, usage calendar, spend.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['month', 'day', 'range', 'summary', 'sources'],
          description: 'The operation to perform.',
        },
        month: { type: 'string', description: 'month: the month to report, as YYYY-MM. Defaults to the current month.' },
        date: { type: 'string', description: 'day: the date to report, as YYYY-MM-DD.' },
        from: { type: 'string', description: 'range: the first date, as YYYY-MM-DD.' },
        to: { type: 'string', description: 'range: the last date, as YYYY-MM-DD.' },
        agent: { type: 'string', description: 'Only count one agent (dsh, claude, codex, ...). Defaults to all agents.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['text'],
        properties: { text: { type: 'string' } },
      },
      render: (_args, value) => [{ type: 'text', text: typeof value?.text === 'string' ? value.text : 'no output' }],
    },
    async execute(args) {
      try {
        const action = String(args.action)
        if (action === 'month') {
          return { text: renderMonth(await service.month({ month: args.month, agent: args.agent })) }
        }
        if (action === 'day') {
          const date = typeof args.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : null
          if (date === null) return { text: 'day: give the date as YYYY-MM-DD.' }
          const payload = await service.range({ from: date, to: date, agent: args.agent })
          return { text: renderDay(payload, date) }
        }
        if (action === 'range') {
          const payload = await service.range({ from: args.from, to: args.to, agent: args.agent })
          if (payload.days.length === 0) return { text: 'No magpie requests recorded in that range.' }
          return { text: renderMonth({ ...payload, month: `${payload.from ?? 'start'} .. ${payload.to ?? 'end'}`, days: payload.days, totals: payload.totals, models: [], meta: payload.meta }) }
        }
        if (action === 'summary') {
          const payload = await service.month({ month: args.month, agent: args.agent })
          return { text: renderSummary(payload) }
        }
        if (action === 'sources') {
          return { text: renderSources(await service.sources()) }
        }
        return { text: `unknown action: ${action}` }
      } catch (error) {
        return { text: `[error] ${error instanceof Error ? error.message : String(error)}` }
      }
    },
  }
}
