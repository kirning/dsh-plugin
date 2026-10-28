/**
 * dsh-token-calendar — host half.
 *
 * Mounts the magpie statistics service, the `/api/dsh-token-calendar` route
 * family the panel calls, the `token_calendar` agent tool, and a system-prompt
 * announcement. The browser half (`./client`) renders the sidebar
 * "Token 日历" panel.
 *
 * Zero runtime dependencies: only Node builtins and this package's own
 * modules, so a locally linked checkout needs no install step.
 *
 * Config is the row's raw `config` object (no Config schema is declared):
 *
 * ```yaml
 * - id: token-calendar
 *   name: 'dsh-token-calendar'
 *   config:
 *     enabled: true
 *     announceToAgent: true
 *     defaultCurrency: 'cny'          # 'cny' | 'usd'
 *     cacheTtlMs: 15000
 *     usageFile: '~/.config/magpie/usage.jsonl'      # optional override
 *     modelsFile: '~/.cache/magpie/models.json'       # optional override
 *     providersFile: '~/.config/magpie/providers.json' # optional override
 *     fxFile: '~/.cache/magpie/fxrate.json'           # optional override
 * ```
 *
 * @module dsh-token-calendar
 */

import { TokenCalendarService } from './lib/service.js'
import { makeRoute } from './lib/routes.js'
import { tokenCalendarTool } from './lib/tools.js'

/** Stable cordis plugin name. */
export const name = 'token-calendar'

/** Services required before the calendar surfaces can mount. */
export const inject = ['webServer', 'tools', 'systemPrompt']

/** Guidance announced to every agent, mirroring the plugin family's style. */
export const TOKEN_CALENDAR_GUIDANCE =
  '本机已安装 dsh-token-calendar 插件（token 消耗日历）：侧边栏「Token 日历」入口 + token_calendar 工具。' +
  '数据来源是本机 magpie 网关的统计文件（~/.config/magpie/usage.jsonl 请求流水 + ~/.cache/magpie/models.json models.dev 价格表 + fxrate.json 汇率），' +
  '不依赖 magpie 进程是否在运行。' +
  '查看：token_calendar 工具 action=month 看某月（YYYY-MM）逐日的 token 数与花费、action=day 看某天明细（YYYY-MM-DD）、' +
  'action=range 看任意日期区间、action=summary 只要总量、action=sources 看数据文件与覆盖范围。' +
  '计数口径：一天的 token = input + output + cache_read + cache_write；金额按 models.dev 单价折算 USD，再按 magpie 缓存的 USD/CNY 汇率折人民币。' +
  '订阅制/编码套餐（coding plan）单价为 0，因此只体现 token 量与套餐额度（credits），不体现现金花费；无价格表的模型记为 0 并在结果中注明条数。' +
  '用户提到「token 用量 / token 消耗 / 消耗日历 / 花了多少钱 / token 统计 / 花销」时即指本插件，请据此协作。'

/** Order of the announcement section (after dsh-easytier's 152). */
const SECTION_ORDER = 153

/** Process-wide single-mount registry (survives duplicate module instances). */
const MOUNTED = Symbol.for('dsh-token-calendar.mounted')

/**
 * Register the service, routes, tool and prompt section.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host plugin context.
 * @param {{enabled?: boolean, announceToAgent?: boolean, usageFile?: string, providersFile?: string, modelsFile?: string, fxFile?: string, defaultCurrency?: string, cacheTtlMs?: number}} [config] - row config.
 */
export function apply(ctx, config) {
  const registry = globalThis
  const mounted = (registry[MOUNTED] ??= new Set())
  if (mounted.has('dsh-token-calendar')) return
  mounted.add('dsh-token-calendar')
  ctx.effect(() => () => {
    mounted.delete('dsh-token-calendar')
  }, 'dsh-token-calendar: mount guard')

  const resolved = config !== null && typeof config === 'object' ? config : {}
  const service = new TokenCalendarService({
    ...(typeof resolved.usageFile === 'string' ? { usageFile: resolved.usageFile } : {}),
    ...(typeof resolved.providersFile === 'string' ? { providersFile: resolved.providersFile } : {}),
    ...(typeof resolved.modelsFile === 'string' ? { modelsFile: resolved.modelsFile } : {}),
    ...(typeof resolved.fxFile === 'string' ? { fxFile: resolved.fxFile } : {}),
    ...(typeof resolved.cacheTtlMs === 'number' ? { ttlMs: resolved.cacheTtlMs } : {}),
    ...(resolved.defaultCurrency === 'usd' || resolved.defaultCurrency === 'cny' ? { defaultCurrency: resolved.defaultCurrency } : {}),
  })

  const disposers = []
  if (resolved.enabled === false) return

  if (resolved.announceToAgent !== false) {
    disposers.push(ctx.systemPrompt.section({
      name: 'plugin:dsh-token-calendar',
      order: SECTION_ORDER,
      text: TOKEN_CALENDAR_GUIDANCE,
    }))
  }

  disposers.push(ctx.webServer.register(makeRoute({ service })))
  disposers.push(ctx.tools.register(tokenCalendarTool(service)))

  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        /* already released */
      }
    }
  }, 'dsh-token-calendar: teardown')
}
