/**
 * 「公司额度」插件宿主半。
 *
 * 把两处事实合成一个 overview 文档，供浏览器半的设置分区渲染：
 *  - 逐日用量：$DSH_HOME/dsh-usage/usage-ledger.json 里公司路由的
 *    分桶数据（只把它当磁盘数据读，不引用 @linxin666/dsh-usage 的代码）；
 *  - 当月额度：公司 token-kanban 的 member-quota 接口，Bearer = 公司路由的
 *    apiKeyEnv 凭据，经宿主 credentials 服务解析 —— API key 永不进入浏览器。
 *
 * 公司路由不写死 id：宿主读 llm-pi-ai 设置命名空间（settings.describe →
 * loader entries 两级兜底），枚举 providers，凡 baseURL 命中公司网关前缀
 * （默认 https://ai.meicloud.com/，可用 COMPANY_URL_PREFIX 覆盖）的都算
 * 公司路由；额度接口的 origin 也随之从 baseURL 推导。一个都没匹配到时
 * 退回历史 id `midea` + `MIDEA_API_KEY` + 硬编码地址。台账聚合永远包含
 * 历史桶 `midea`，路由改名后旧数据不丢。
 *
 * 路由：
 *  - GET  /api/company-quota/overview  读缓存（60s）或取一次额度
 *  - POST /api/company-quota/refresh   强制重取额度
 * @module dsh-plugin-company-quota
 */
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { API_PREFIX, PROVIDER_ID, type DailyRow, type Forecast, type OverviewDocument, type QuotaFact } from './shared.ts'

export const name = 'company-quota'
export const inject = ['webServer']

/** MIP 账号（额度接口的 user_id）；可用 MIP_USER_ID 环境变量覆盖。模型配置里推不出来，保持显式。 */
const MIP_USER_ID = process.env.MIP_USER_ID ?? 'wuxw32'

/** 额度接口兜底地址（识别不到公司路由时使用）。 */
const QUOTA_URL = `https://ai.meicloud.com/token-kanban/api/v1/openapi/member-quota?user_id=${encodeURIComponent(MIP_USER_ID)}`

/** 公司网关 URL 前缀；可用 COMPANY_URL_PREFIX 环境变量覆盖。 */
const COMPANY_URL_PREFIX = process.env.COMPANY_URL_PREFIX ?? 'https://ai.meicloud.com/'

/** 兜底凭据引用名（.credentials.yaml 的 refs / 环境变量）。 */
const API_KEY_REF = 'MIDEA_API_KEY'

/** 额度结果的缓存时长。 */
const CACHE_MS = 60_000

/** 公司路由识别结果的缓存时长（settings 不常变，别每次请求都翻一遍）。 */
const ROUTES_CACHE_MS = 60_000

/** 单次额度请求超时：公司网关偶发慢（实测 6s 上下），放宽到 25s。 */
const TIMEOUT_MS = 25_000

/**
 * 公司网关价目表（CNY / 百万 tokens）：[输入, 输出, 缓存命中]。
 * 未列入的模型（历史 free / token-plan id）按不计费处理。
 */
const PRICES: Readonly<Record<string, readonly [number, number, number]>> = {
  'glm-5.3-flash-aliyun': [0.4, 1.4, 0.12],
  'qwen3.8-flash-aliyun': [0.8, 2.7, 0.1],
  'qwen3.7-plus-aliyun': [1.28, 5.12, 0.26],
  'deepseek-v4-flash-deepseek': [2, 8, 0.04],
  'deepseek-v4-flash-vision-exp-deepseek': [2, 8, 0.04],
  'glm-5.2-aliyun': [4, 14, 1],
  'qwen3.7-max-aliyun': [6, 18, 2],
  'deepseek-v4-pro-deepseek': [9, 27, 0.3],
  'qwen3.8-max-aliyun': [12, 36, 1.5],
  'kimi-k3-aliyun': [20, 100, 2],
}

/** 台账里一个模型一天的分桶。 */
interface TokenTotals {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  calls: number
}

/** 宿主 credentials 服务的结构面（避免引入整条 dsh-credentials 类型链）。 */
interface CredentialsService {
  resolve(ref: string): Promise<{ value: string } | undefined>
}

/** llm-pi-ai 一条 provider 档案的结构面（只取本插件用到的字段）。 */
interface PiAiProfile {
  baseURL?: unknown
  apiKeyEnv?: unknown
}

/** 一条识别出的公司路由。 */
interface CompanyRoute {
  /** 路由 id = 台账分桶键（llm-pi-ai providers 的键名）。 */
  id: string
  /** 该路由的凭据引用名（apiKeyEnv）。 */
  apiKeyEnv?: string
  /** 该路由配置的 baseURL（额度接口 origin 从它推导）。 */
  baseURL?: string
}

/** 最近一次额度结果（成功或失败），供 60s 缓存复用。 */
let quotaCache: { at: number; quota?: QuotaFact; error?: string } | undefined

/** 进行中的额度请求：并发调用共用同一次网络往返。 */
let quotaInflight: Promise<void> | undefined

/** 最近一次路由识别结果。 */
let routesCache: { at: number; routes: CompanyRoute[] } | undefined

/** DSH 主目录。 */
function dshHome(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

/** 本地日期键 `YYYY-MM-DD`。 */
function localDateKey(ms: number): string {
  const date = new Date(ms)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 一个模型当天的金额（价目表未收录时按 0）。 */
function modelCost(model: string, totals: TokenTotals): number {
  const key = model.slice(model.lastIndexOf('/') + 1)
  const price = PRICES[key]
  if (price === undefined) return 0
  return (totals.inputTokens * price[0] + totals.outputTokens * price[1] + totals.cacheReadTokens * price[2]) / 1e6
}

/** 分桶 tokens 合计。 */
function totalTokens(totals: TokenTotals): number {
  return totals.inputTokens + totals.outputTokens + totals.cacheReadTokens + totals.cacheWriteTokens
}

/** 是否普通对象（数组不算）。 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 展开宿主配置里的 volatile 包装（带 get() 函数的对象取其返回值）。 */
function unwrapVolatile(value: unknown): unknown {
  if (!isPlainObject(value)) return value
  if (typeof value.get === 'function') {
    try {
      return unwrapVolatile((value.get as () => unknown)())
    } catch {
      return value
    }
  }
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) result[key] = unwrapVolatile(entry)
  return result
}

/** 取一次宿主服务（未注册/未就绪时 undefined）。 */
function serviceOf<T>(ctx: Context, serviceName: string): T | undefined {
  try {
    const get = (ctx as unknown as { get?: (name: string) => unknown }).get
    return typeof get === 'function' ? (get.call(ctx, serviceName) as T | undefined) : undefined
  } catch {
    return undefined
  }
}

/** 从 settings.describe() 读 llm-pi-ai 命名空间的 providers（0.1.7+ 的活值路径）。 */
function providersFromDescribe(ctx: Context): Record<string, PiAiProfile> | undefined {
  const settings = serviceOf<{ describe(options?: { redactSecrets?: boolean }): unknown }>(ctx, 'settings')
  if (settings === undefined || typeof settings.describe !== 'function') return undefined
  try {
    const descriptors = settings.describe({ redactSecrets: false })
    if (!Array.isArray(descriptors)) return undefined
    for (const descriptor of descriptors) {
      if (!isPlainObject(descriptor)) continue
      if (descriptor.ns !== 'llm-pi-ai' && descriptor.ns !== 'llm') continue
      const value = unwrapVolatile(descriptor.value)
      const providers = isPlainObject(value) ? value.providers : undefined
      if (isPlainObject(providers)) return providers as Record<string, PiAiProfile>
    }
  } catch {
    // 服务未就绪或形状变化：交给下一级兜底。
  }
  return undefined
}

/** 从 loader 条目读 llm-pi-ai 插件的已解析配置（describe 不可用时的兜底）。 */
function providersFromLoader(ctx: Context): Record<string, PiAiProfile> | undefined {
  const owner = ctx as unknown as { root?: { loader?: unknown }; loader?: unknown }
  const loader = owner.root?.loader ?? owner.loader
  if (!isPlainObject(loader) || typeof loader.entries !== 'function') return undefined
  try {
    for (const entry of loader.entries()) {
      if (!isPlainObject(entry) || !isPlainObject(entry.options)) continue
      const id = typeof entry.options.id === 'string' ? entry.options.id : undefined
      const name = typeof entry.options.name === 'string' ? entry.options.name : undefined
      const isPiAi = id === 'llm-pi-ai' || id === 'llm'
        || name === '@deepseek-ai/dsh-llm-pi-ai'
        || (name !== undefined && name.endsWith('/llm-pi-ai'))
      if (!isPiAi) continue
      const fiber = isPlainObject(entry.fiber) ? entry.fiber : undefined
      const value = unwrapVolatile(fiber?.config)
      const providers = isPlainObject(value) ? value.providers : undefined
      if (isPlainObject(providers)) return providers as Record<string, PiAiProfile>
    }
  } catch {
    // loader 未就绪：走兜底路由。
  }
  return undefined
}

/** baseURL 是否命中公司网关（前缀或 origin 一致都算）。 */
function matchesCompanyBaseURL(baseURL: string): boolean {
  const candidate = baseURL.trim()
  if (candidate === '') return false
  if (candidate.toLowerCase().startsWith(COMPANY_URL_PREFIX.toLowerCase())) return true
  try {
    return new URL(candidate).origin === new URL(COMPANY_URL_PREFIX).origin
  } catch {
    return false
  }
}

/** 一条 provider 档案 → 公司路由（baseURL 不命中时 undefined）。 */
function toCompanyRoute(id: string, profile: unknown): CompanyRoute | undefined {
  if (!isPlainObject(profile)) return undefined
  const baseURL = typeof profile.baseURL === 'string' ? profile.baseURL : undefined
  if (baseURL === undefined || !matchesCompanyBaseURL(baseURL)) return undefined
  return {
    id,
    ...(typeof profile.apiKeyEnv === 'string' && profile.apiKeyEnv !== '' ? { apiKeyEnv: profile.apiKeyEnv } : {}),
    ...(baseURL !== undefined ? { baseURL } : {}),
  }
}

/**
 * 识别公司路由：读 llm-pi-ai providers，凡 baseURL 命中公司网关的都算
 * （两个路由都指向公司网关时两把桶都算公司消费）。识别不出时退回历史
 * id `midea` + `MIDEA_API_KEY`。结果缓存 60s。
 */
function resolveCompanyRoutes(ctx: Context): CompanyRoute[] {
  const cached = routesCache
  if (cached !== undefined && Date.now() - cached.at < ROUTES_CACHE_MS) return cached.routes
  const providers = providersFromDescribe(ctx) ?? providersFromLoader(ctx)
  const routes: CompanyRoute[] = []
  if (providers !== undefined) {
    for (const [id, profile] of Object.entries(providers)) {
      const route = toCompanyRoute(id, profile)
      if (route !== undefined) routes.push(route)
    }
  }
  const resolved = routes.length > 0 ? routes : [{ id: PROVIDER_ID, apiKeyEnv: API_KEY_REF }]
  routesCache = { at: Date.now(), routes: resolved }
  return resolved
}

/** 本次聚合覆盖的台账分桶键：识别出的路由 + 历史桶 `midea`（改名前的数据）。 */
function ledgerRouteIds(routes: CompanyRoute[]): Set<string> {
  const ids = new Set<string>([PROVIDER_ID])
  for (const route of routes) ids.add(route.id)
  return ids
}

/** 额度接口地址：优先用识别出的公司 baseURL 的 origin，识别不出用兜底地址。 */
function quotaUrlFor(routes: CompanyRoute[]): string {
  const baseURL = routes[0]?.baseURL
  if (baseURL !== undefined) {
    try {
      return `${new URL(baseURL).origin}/token-kanban/api/v1/openapi/member-quota?user_id=${encodeURIComponent(MIP_USER_ID)}`
    } catch {
      // baseURL 形状异常：用兜底地址。
    }
  }
  return QUOTA_URL
}

/** 读台账并折叠出公司路由的逐日用量；文件缺失或损坏时返回空数组。 */
async function readDaily(routeIds: ReadonlySet<string>): Promise<DailyRow[]> {
  let raw: string
  try {
    raw = await readFile(join(dshHome(), 'dsh-usage', 'usage-ledger.json'), 'utf8')
  } catch {
    return []
  }
  let doc: { days?: Record<string, Record<string, Record<string, TokenTotals>>> }
  try {
    doc = JSON.parse(raw) as typeof doc
  } catch {
    return []
  }
  const days = doc.days ?? {}
  const rows: DailyRow[] = []
  for (const date of Object.keys(days).sort()) {
    const buckets = days[date]
    let tokens = 0
    let calls = 0
    let cost = 0
    for (const id of routeIds) {
      const models = buckets?.[id]
      if (models === undefined) continue
      for (const [model, totals] of Object.entries(models)) {
        tokens += totalTokens(totals)
        calls += totals.calls ?? 0
        cost += modelCost(model, totals)
      }
    }
    rows.push({ date, tokens, calls, cost: Math.round(cost * 1e6) / 1e6 })
  }
  return rows
}

/** 经 credentials 服务解析指定引用名的 API key。 */
async function resolveApiKey(ctx: Context, ref: string): Promise<string | undefined> {
  const credentials = serviceOf<CredentialsService>(ctx, 'credentials')
  if (credentials === undefined) return undefined
  try {
    const resolved = await credentials.resolve(ref)
    return resolved?.value !== undefined && resolved.value !== '' ? resolved.value : undefined
  } catch {
    return undefined
  }
}

/** 调额度接口并归一化响应。 */
async function fetchQuota(apiKey: string, url: string): Promise<QuotaFact> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const body: unknown = await response.json().catch(() => undefined)
  const root = (typeof body === 'object' && body !== null ? body : {}) as {
    code?: number
    message?: string
    data?: { planName?: string; billingMethod?: string; quota?: { unit?: string; total?: number; remaining?: number; resetAt?: string } }
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (root.code !== 0) throw new Error(`接口 code ${String(root.code)}${root.message ? `: ${root.message}` : ''}`)
  const quota = root.data?.quota
  if (quota === undefined || typeof quota.total !== 'number' || typeof quota.remaining !== 'number') {
    throw new Error('额度响应缺少 quota.total/remaining')
  }
  return {
    unit: typeof quota.unit === 'string' && quota.unit !== '' ? quota.unit : 'CNY',
    total: quota.total,
    remaining: quota.remaining,
    ...(typeof quota.resetAt === 'string' ? { resetsAt: quota.resetAt } : {}),
    ...(typeof root.data?.planName === 'string' && root.data.planName !== '无' ? { planName: root.data.planName } : {}),
    ...(typeof root.data?.billingMethod === 'string' ? { billingMethod: root.data.billingMethod } : {}),
  }
}

/** 由额度事实推出耗尽预测。 */
function forecastFrom(quota: QuotaFact, nowMs: number): Forecast | undefined {
  const { total, remaining } = quota
  if (!(total > 0) || !(remaining > 0)) return undefined
  const cycleEnd = quota.resetsAt === undefined ? undefined : new Date(quota.resetsAt)
  if (cycleEnd === undefined || Number.isNaN(cycleEnd.getTime())) return undefined
  const dayMs = 86_400_000
  const cycleStart = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth() - 1, cycleEnd.getDate())
  const elapsed = Math.max(1, (nowMs - cycleStart.getTime()) / dayMs)
  const used = total - remaining
  const daily = used / elapsed
  if (!(daily > 0)) return undefined
  const daysLeft = remaining / daily
  const predicted = new Date(nowMs + Math.ceil(daysLeft) * dayMs)
  const lastDay = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), 0)
  const daysToEnd = Math.max(0, (cycleEnd.getTime() - nowMs) / dayMs)
  return {
    daily,
    daysLeft,
    predictedKey: localDateKey(predicted.getTime()),
    lastKey: localDateKey(lastDay.getTime()),
    monthly: localDateKey(predicted.getTime()) >= localDateKey(lastDay.getTime()),
    projectedLeft: Math.max(0, remaining - daily * daysToEnd),
    cycleStart: localDateKey(cycleStart.getTime()),
    cycleEnd: localDateKey(cycleEnd.getTime()),
  }
}

/**
 * 拉一次额度并写进缓存；并发调用共用同一次网络往返。失败时保留上次成功的额度，
 * 只更新错误行（界面因此不会因为一次网络抖动就退回「—」）。
 */
function refreshQuota(ctx: Context, routes: CompanyRoute[]): Promise<void> {
  if (quotaInflight !== undefined) return quotaInflight
  quotaInflight = (async () => {
    const previous = quotaCache?.quota
    const ref = routes[0]?.apiKeyEnv ?? API_KEY_REF
    try {
      const apiKey = await resolveApiKey(ctx, ref)
      if (apiKey === undefined) {
        quotaCache = {
          at: Date.now(),
          ...(previous !== undefined ? { quota: previous } : {}),
          error: `未找到凭据 ${ref}（宿主 credentials 服务）`,
        }
        return
      }
      quotaCache = { at: Date.now(), quota: await fetchQuota(apiKey, quotaUrlFor(routes)) }
    } catch (failure) {
      const message = failure instanceof Error && (failure.name === 'TimeoutError' || failure.name === 'AbortError')
        ? `额度接口超时（${TIMEOUT_MS / 1000}s）`
        : failure instanceof Error ? failure.message : String(failure)
      quotaCache = {
        at: Date.now(),
        ...(previous !== undefined ? { quota: previous } : {}),
        error: message,
      }
    } finally {
      quotaInflight = undefined
    }
  })()
  return quotaInflight
}

/** 组装 overview 文档；`force` 绕过额度缓存。 */
async function overview(ctx: Context, force: boolean): Promise<OverviewDocument> {
  const now = Date.now()
  const routes = resolveCompanyRoutes(ctx)
  const routeIds = ledgerRouteIds(routes)
  const daily = await readDaily(routeIds)
  const todayKey = localDateKey(now)
  const today = daily.find((row) => row.date === todayKey) ?? { date: todayKey, tokens: 0, calls: 0, cost: 0 }

  const cached = quotaCache
  const fresh = cached !== undefined && now - cached.at < CACHE_MS
  if (force || cached === undefined) {
    // 首次询问（或用户点了刷新）：等这次真实结果，界面才有数字可显示。
    await refreshQuota(ctx, routes)
  } else if (!fresh) {
    // 缓存陈旧：先把上次结果交给界面，后台再刷新。
    void refreshQuota(ctx, routes)
  }
  const current = quotaCache
  const quota = current?.quota
  const error = current?.error

  const forecast = quota === undefined ? undefined : forecastFrom(quota, now)
  return {
    updatedAt: now,
    provider: routes[0]?.id ?? PROVIDER_ID,
    providerIds: [...routeIds].sort(),
    displayName: '公司',
    userId: MIP_USER_ID,
    ...(quota !== undefined ? { quota } : {}),
    daily,
    today,
    ...(forecast !== undefined ? { forecast } : {}),
    ...(error !== undefined ? { error } : {}),
  }
}

/** 写 JSON 响应。 */
function writeJson(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

/** 只允许本机访问（额度属于个人账务数据）。 */
function isLoopback(req: IncomingMessage): boolean {
  const address = req.socket.remoteAddress ?? ''
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

/** GET overview 路由。 */
function overviewRoute(ctx: Context): WebRoute {
  return {
    kind: 'exact',
    path: `${API_PREFIX}/overview`,
    handler: async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      if (!isLoopback(req)) {
        writeJson(res, 403, { ok: false, error: 'forbidden: loopback-only' })
        return
      }
      writeJson(res, 200, await overview(ctx, false))
    },
  }
}

/** POST refresh 路由：强制重取额度。 */
function refreshRoute(ctx: Context): WebRoute {
  return {
    kind: 'exact',
    path: `${API_PREFIX}/refresh`,
    handler: async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      if (!isLoopback(req)) {
        writeJson(res, 403, { ok: false, error: 'forbidden: loopback-only' })
        return
      }
      if (req.method !== 'POST') {
        writeJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      writeJson(res, 200, await overview(ctx, true))
    },
  }
}

/**
 * 宿主插件主体：注册额度路由。
 * @param ctx - 宿主根上下文。
 */
export function apply(ctx: Context): void {
  const disposers = [overviewRoute(ctx), refreshRoute(ctx)].map((route) => ctx.webServer.register(route))
  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        // 卸载竞态：路由所在的 fiber 已经消失。
      }
    }
  }, 'dsh-plugin-company-quota: routes')
}
