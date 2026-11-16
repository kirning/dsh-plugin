/**
 * 逐日 token 用量聚合：数据来自 DSH 自己的会话日志（官方数据源），
 * 不读 `$DSH_HOME/dsh-usage/usage-ledger.json`（那份台账由已停用的用量插件写，早就不更新了）。
 *
 * 日历上「消耗了多少 token」只认公司网关：日志里每条用量都带着它自己的
 * provider（= 路由 id），只有命中公司路由集合的才计入。
 *
 * 一个会话的全部模型调用都写在它的日志里：`request/header`（或路由切换时的
 * `request/context`）带上 `provider` / `model`，紧随其后的 `assistant/message`
 * 带上 `usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens? }`。
 * 按事件的 `time`（epoch ms）折到本地日期，就得到「日期 → 路由 → 模型 → 用量」。
 *
 * 为什么要自己做磁盘扫描而不是查宿主服务：
 *  - `sessionQuery.readSession()` 会把每条日志重放成 Session 做校验，对 200 个历史
 *    会话是分钟级开销，而这里只需要一轮 JSON 折叠；
 *  - 日志是逐帧 zstd 的追加文件，用 `stat` 的 (size, mtimeMs) 就能判断「有没有变」，
 *    因此折叠结果可以按文件增量缓存（内存 + `$DSH_HOME/company-quota/token-cache.json`），
 *    稳态下一次刷新只解码当天在写的那 1–2 个文件（几十毫秒），宿主重启也几乎零成本；
 *  - 也避免了对第三方插件强依赖 `sessionQuery` 服务（缺了它整个插件加载不了）。
 *
 * 首扫（缓存为空）要解压并解析约 40 天内的全部日志（本机实测 ~134MB / ~18s），
 * 所以：只有「从未扫过」时才会等它完成，之后一律「先返回旧数据 + 后台增量刷新」。
 * @module dsh-plugin-company-quota/tokens
 */
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { zstdDecompress } from 'node:zlib'
import type { Context } from '@deepseek-ai/cordis'
import { localDateKey } from './shared.ts'

/** 一个模型一段时间的用量累计。 */
export interface TokenTotals {
  /** 未命中缓存的输入 tokens。 */
  inputTokens: number
  /** 输出 tokens。 */
  outputTokens: number
  /** 命中缓存的输入 tokens。 */
  cacheReadTokens: number
  /** 写入缓存的输入 tokens。 */
  cacheWriteTokens: number
  /** 上报用量的调用次数。 */
  calls: number
}

/** 日期 → 模型 → 用量（已按公司路由过滤，直接喂给日历）。 */
export type DailyUsage = Map<string, Map<string, TokenTotals>>

/** 一天的公司路由用量（跨模型合并后喂给日历）。 */
export interface DayTokens {
  /** 未命中缓存的输入 tokens。 */
  inputTokens: number
  /** 输出 tokens。 */
  outputTokens: number
  /** 命中缓存的输入 tokens（也算公司消耗）。 */
  cacheReadTokens: number
  /** 写入缓存的输入 tokens。 */
  cacheWriteTokens: number
  /** 上报用量的调用次数。 */
  calls: number
  /** 总 tokens = 输入 + 缓存命中 + 输出（与宿主自己的 totalTokens 口径一致）。 */
  totalTokens: number
}

/** 日期 → 当天用量。 */
export type DailyTokens = Map<string, DayTokens>

/** 日期 → 路由 → 模型 → 用量（缓存里的中间形态，保留全部路由，便于路由变化后免重扫）。 */
type DayTotals = Record<string, Record<string, Record<string, TokenTotals>>>

/** 一个日志文件的折叠结果。 */
interface FileFold {
  /** 折叠时文件的字节数（变更检测）。 */
  size: number
  /** 折叠时文件的修改时间（变更检测）。 */
  mtimeMs: number
  /** 该文件贡献的用量。 */
  days: DayTotals
}

/** 磁盘缓存的落盘格式。 */
interface CacheDocument {
  version: number
  /** 上次扫描完成时刻（epoch ms）。 */
  scannedAt: number
  /** 扫描窗口（天）。 */
  windowDays: number
  /** 日志绝对路径 → 折叠结果。 */
  files: Record<string, FileFold>
}

/** 缓存格式版本；结构变化时自增，旧缓存直接丢弃。 */
const CACHE_VERSION = 1

/** 默认回看窗口（天）：覆盖旧台账的历史起点（约 4 个月），日历可往前翻。 */
const DEFAULT_WINDOW_DAYS = 120

/** 距离上次扫描超过这个时长就后台刷新一次。 */
const RESCAN_MS = 30_000

/** 同时解码的文件数（zstd 走线程池，别一次开满）。 */
const FILES_IN_FLIGHT = 3

/** zstd 帧魔数（0xFD2FB528 小端）。 */
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/** 日志文件名：`session.v<数字>.jsonl.zstd`（格式版本变化不影响聚合）。 */
const LOG_FILE_PATTERN = /^session\.v\d+\.jsonl\.zstd$/

/** 进程内的扫描状态。 */
interface MemoryCache {
  scannedAt: number
  windowDays: number
  files: Map<string, FileFold>
}

let memory: MemoryCache | undefined
let loading: Promise<MemoryCache> | undefined
let refreshing: Promise<void> | undefined

/** DSH 主目录（与宿主一致：`DSH_HOME` 或 `~/.dsh`）。 */
function dshHome(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

/** 折叠缓存的落盘位置。 */
function cachePath(): string {
  return join(dshHome(), 'company-quota', 'token-cache.json')
}

/** 会话日志根目录。 */
function sessionsRoot(): string {
  return join(dshHome(), 'sessions')
}

/** 回看窗口（可用 `COMPANY_USAGE_WINDOW_DAYS` 覆盖）。 */
function windowDays(): number {
  const raw = Number(process.env.COMPANY_USAGE_WINDOW_DAYS)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_WINDOW_DAYS
}

/** 空累计。 */
function emptyTotals(): TokenTotals {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, calls: 0 }
}

/** 把一份上报的 usage 折进累计（缺字段按 0 处理）。 */
function addUsage(target: TokenTotals, usage: Record<string, unknown>): void {
  const read = (key: string): number => {
    const value = usage[key]
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
  }
  target.inputTokens += read('inputTokens')
  target.outputTokens += read('outputTokens')
  target.cacheReadTokens += read('cacheReadTokens')
  target.cacheWriteTokens += read('cacheWriteTokens')
  target.calls += 1
}

/** 枚举 `$DSH_HOME/sessions/<workspace>/<session>/session.v*.jsonl.zstd`。 */
async function listLogs(): Promise<Array<{ path: string; size: number; mtimeMs: number }>> {
  const root = sessionsRoot()
  const logs: Array<{ path: string; size: number; mtimeMs: number }> = []
  let workspaces
  try {
    workspaces = await readdir(root, { withFileTypes: true })
  } catch {
    return logs
  }
  for (const workspace of workspaces) {
    if (!workspace.isDirectory()) continue
    const workspaceDir = join(root, workspace.name)
    let sessions
    try {
      sessions = await readdir(workspaceDir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const session of sessions) {
      if (!session.isDirectory()) continue
      const sessionDir = join(workspaceDir, session.name)
      let files
      try {
        files = await readdir(sessionDir)
      } catch {
        continue
      }
      for (const file of files) {
        if (!LOG_FILE_PATTERN.test(file)) continue
        const path = join(sessionDir, file)
        try {
          const info = await stat(path)
          logs.push({ path, size: info.size, mtimeMs: info.mtimeMs })
        } catch {
          // 并发删改：跳过这一条。
        }
      }
    }
  }
  return logs
}

/**
 * 解出逐帧 zstd 日志的正文。日志是追加写的多帧文件，必须按魔数切开逐帧解压；
 * 尾部半帧（正在写的最后一条）解不开就丢掉，下一轮 `stat` 变化时会重解。
 */
async function decodeLog(bytes: Buffer): Promise<string> {
  const starts: number[] = []
  let index = bytes.indexOf(ZSTD_MAGIC, 0)
  while (index >= 0) {
    starts.push(index)
    index = bytes.indexOf(ZSTD_MAGIC, index + ZSTD_MAGIC.length)
  }
  if (starts.length === 0) return ''
  starts.push(bytes.length)
  const chunks: Buffer[] = []
  for (let frame = 0; frame < starts.length - 1; frame += 1) {
    const slice = bytes.subarray(starts[frame], starts[frame + 1])
    if (slice.length === 0) continue
    try {
      chunks.push(await new Promise<Buffer>((resolve, reject) => {
        zstdDecompress(slice, (error, result) => {
          if (error !== null) reject(error)
          else resolve(result)
        })
      }))
    } catch {
      // 半帧或损坏帧：跳过。
    }
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * 折叠一份日志：记住最近一次 `request/header`（或 `request/context`）给出的
 * 路由，把后续每条 `assistant/message` 的 usage 记到 (事件时间所在日期, 路由, 模型)。
 * 全部路由都保留，过滤留到聚合阶段，这样公司路由列表变化时不必重扫日志。
 */
function foldLog(text: string): DayTotals {
  const days: DayTotals = {}
  let provider: string | undefined
  let model: string | undefined
  for (const line of text.split('\n')) {
    if (line === '') continue
    let row: { type?: unknown; time?: unknown; data?: unknown }
    try {
      row = JSON.parse(line) as typeof row
    } catch {
      continue
    }
    const data = row.data
    if (typeof data !== 'object' || data === null) continue
    const record = data as Record<string, unknown>
    if (row.type === 'request/header') {
      const header = record.header
      const config = (typeof header === 'object' && header !== null ? (header as Record<string, unknown>).config : undefined)
      const next = (typeof config === 'object' && config !== null ? config : {}) as Record<string, unknown>
      if (typeof next.provider === 'string' && typeof next.model === 'string') {
        provider = next.provider
        model = next.model
      }
      continue
    }
    if (row.type === 'request/context') {
      if (typeof record.provider === 'string' && typeof record.model === 'string') {
        provider = record.provider
        model = record.model
      }
      continue
    }
    if (row.type !== 'assistant/message') continue
    const usage = record.usage
    if (typeof usage !== 'object' || usage === null) continue
    if (provider === undefined || model === undefined) continue
    const time = typeof row.time === 'number' ? row.time : undefined
    if (time === undefined) continue
    const date = localDateKey(time)
    const byRoute = days[date] ?? (days[date] = {})
    const byModel = byRoute[provider] ?? (byRoute[provider] = {})
    const totals = byModel[model] ?? (byModel[model] = emptyTotals())
    addUsage(totals, usage as Record<string, unknown>)
  }
  return days
}

/** 读磁盘缓存；缺失、损坏或版本不符时返回空缓存。 */
async function loadCache(): Promise<MemoryCache> {
  const empty: MemoryCache = { scannedAt: 0, windowDays: windowDays(), files: new Map() }
  let raw: string
  try {
    raw = await readFile(cachePath(), 'utf8')
  } catch {
    return empty
  }
  let doc: CacheDocument
  try {
    doc = JSON.parse(raw) as CacheDocument
  } catch {
    return empty
  }
  if (doc.version !== CACHE_VERSION || typeof doc.files !== 'object' || doc.files === null) return empty
  const files = new Map<string, FileFold>()
  for (const [path, fold] of Object.entries(doc.files)) {
    if (typeof fold?.size !== 'number' || typeof fold?.mtimeMs !== 'number' || typeof fold.days !== 'object') continue
    files.set(path, fold)
  }
  return {
    scannedAt: typeof doc.scannedAt === 'number' ? doc.scannedAt : 0,
    windowDays: typeof doc.windowDays === 'number' ? doc.windowDays : windowDays(),
    files,
  }
}

/** 原子写回磁盘缓存（先写临时文件再改名，避免半截文件）。 */
async function saveCache(cache: MemoryCache): Promise<void> {
  const files: Record<string, FileFold> = {}
  for (const [path, fold] of cache.files) files[path] = fold
  const doc: CacheDocument = {
    version: CACHE_VERSION,
    scannedAt: cache.scannedAt,
    windowDays: cache.windowDays,
    files,
  }
  const target = cachePath()
  const temporary = `${target}.tmp`
  try {
    await mkdir(dirname(target), { recursive: true })
    await writeFile(temporary, JSON.stringify(doc), 'utf8')
    await rename(temporary, target)
  } catch {
    // 缓存写不进去不影响本次结果。
  }
}

/** 懒加载磁盘缓存（并发调用共用同一次读盘）。 */
function ensureLoaded(): Promise<MemoryCache> {
  if (memory !== undefined) return Promise.resolve(memory)
  loading ??= loadCache().then((cache) => {
    memory ??= cache
    loading = undefined
    return memory
  })
  return loading
}

/** 增量扫描：只解码 (size, mtimeMs) 变过的文件，并清掉窗口外/已删除的记录。 */
async function scanOnce(routeIds: ReadonlySet<string>): Promise<void> {
  void routeIds
  const cache = await ensureLoaded()
  const days = cache.windowDays
  const cutoff = Date.now() - days * 86_400_000
  const logs = await listLogs()
  const present = new Set<string>()
  const pending: Array<{ path: string; size: number; mtimeMs: number }> = []
  for (const log of logs) {
    if (log.mtimeMs < cutoff) continue
    present.add(log.path)
    const cached = cache.files.get(log.path)
    if (cached !== undefined && cached.size === log.size && cached.mtimeMs === log.mtimeMs) continue
    pending.push(log)
  }
  for (const path of [...cache.files.keys()]) {
    if (!present.has(path)) cache.files.delete(path)
  }

  let cursor = 0
  const worker = async (): Promise<void> => {
    while (cursor < pending.length) {
      const log = pending[cursor]
      cursor += 1
      if (log === undefined) return
      let bytes: Buffer
      try {
        bytes = await readFile(log.path)
      } catch {
        continue
      }
      const text = await decodeLog(bytes)
      cache.files.set(log.path, { size: log.size, mtimeMs: log.mtimeMs, days: foldLog(text) })
    }
  }
  await Promise.all(Array.from({ length: Math.min(FILES_IN_FLIGHT, pending.length) }, worker))

  cache.scannedAt = Date.now()
  cache.windowDays = days
  await saveCache(cache)
}

/** 后台增量刷新（并发调用合并成一次）。 */
function refresh(routeIds: ReadonlySet<string>): Promise<void> {
  refreshing ??= scanOnce(routeIds)
    .catch(() => {
      // 扫描失败（权限、半截文件……）不该影响额度展示。
    })
    .finally(() => {
      refreshing = undefined
    })
  return refreshing
}

/** 把缓存里的全部文件聚合成本次请求关心的逐日用量（只保留公司路由）。 */
function aggregate(cache: MemoryCache, routeIds: ReadonlySet<string>): DailyUsage {
  const usage: DailyUsage = new Map()
  for (const fold of cache.files.values()) {
    for (const [date, byRoute] of Object.entries(fold.days)) {
      for (const [provider, byModel] of Object.entries(byRoute)) {
        if (!routeIds.has(provider)) continue
        let models = usage.get(date)
        if (models === undefined) {
          models = new Map()
          usage.set(date, models)
        }
        for (const [model, totals] of Object.entries(byModel)) {
          const target = models.get(model) ?? emptyTotals()
          target.inputTokens += totals.inputTokens
          target.outputTokens += totals.outputTokens
          target.cacheReadTokens += totals.cacheReadTokens
          target.cacheWriteTokens += totals.cacheWriteTokens
          target.calls += totals.calls
          models.set(model, target)
        }
      }
    }
  }
  return usage
}

/**
 * 把「日期 → 模型 → 用量」压成「日期 → 当天合计」。
 * @param usage - 已按公司路由过滤的逐日用量。
 * @returns 日期 → 合计（含 totalTokens）。
 */
function toDayTokens(usage: DailyUsage): DailyTokens {
  const days: DailyTokens = new Map()
  for (const [date, models] of usage) {
    const day: DayTokens = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      calls: 0,
      totalTokens: 0,
    }
    for (const totals of models.values()) {
      day.inputTokens += totals.inputTokens
      day.outputTokens += totals.outputTokens
      day.cacheReadTokens += totals.cacheReadTokens
      day.cacheWriteTokens += totals.cacheWriteTokens
      day.calls += totals.calls
    }
    day.totalTokens = day.inputTokens + day.cacheReadTokens + day.outputTokens
    days.set(date, day)
  }
  return days
}

/**
 * 取公司路由的逐日 token 用量。
 *
 * - 缓存还没扫过（首次启动/缓存被删）：等这次扫描完成，日历才有数字；
 * - 缓存陈旧：先返回旧数据，同时后台增量刷新（下一次轮询就是新数字）；
 * - 其余情况：直接用缓存。
 *
 * @param ctx - 宿主上下文（保留给未来接入宿主服务；当前不需要）。
 * @param routeIds - 算作「公司消费」的路由 id 集合。
 * @returns 日期 → 当天合计用量。
 */
export async function collectTokens(ctx: Context, routeIds: ReadonlySet<string>): Promise<DailyTokens> {
  void ctx
  const cache = await ensureLoaded()
  const stale = Date.now() - cache.scannedAt >= RESCAN_MS
  if (cache.scannedAt === 0) {
    // 首次：没有旧数据可给，只能等这一轮。
    await refresh(routeIds)
  } else if (stale) {
    void refresh(routeIds)
  }
  return toDayTokens(aggregate(await ensureLoaded(), routeIds))
}

/**
 * 预热：后台跑一轮扫描，界面打开前就把缓存热起来（首次启动要解压上百个日志）。
 * @param routeIds - 算作「公司消费」的路由 id 集合。
 */
export async function warmTokens(routeIds: ReadonlySet<string>): Promise<void> {
  await ensureLoaded()
  await refresh(routeIds)
}

/** 供测试/诊断：清掉进程内缓存（下次调用重新读盘扫描）。 */
export function resetTokenCache(): void {
  memory = undefined
  loading = undefined
  refreshing = undefined
}
