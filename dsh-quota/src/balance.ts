/**
 * 逐日消费：直接用额度接口的余额做差，不通过 token 消耗折算。
 *
 * 做法很朴素——每次拿到余额就按本地日期记一笔快照（`$DSH_HOME/company-quota/balance-days.json`），
 * 某天的消费 = 上一条快照的余额 − 当天的余额。因此：
 *  - 不需要价目表、不需要扫会话日志，也没有任何缓存失效逻辑；
 *  - 只有当插件在跑、且额度接口被问过（界面打开轮询，或宿主每 15 分钟的后台采样）
 *    才会有快照；没采到样的日子在日历上直接空着，不会伪造数据；
 *  - 余额变多是充值或月度重置，那天的差额按 0 处理（不会出现负数）。
 * @module dsh-plugin-company-quota/balance
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { localDateKey, type DailyRow, type QuotaFact } from './shared.ts'

/** 快照文件格式版本（结构变化时递增，旧文件按空处理）。 */
const FORMAT_VERSION = 1

/** 保留天数：够翻几个月的日历，又不至于让文件无限长大。 */
const KEEP_DAYS = 120

/** 一天一笔余额快照。 */
interface DayBalance {
  /** 最后一次观测时刻（epoch ms）。 */
  at: number
  /** 观测到的周期总额度。 */
  total: number
  /** 观测到的剩余额度。 */
  remaining: number
}

/** 落盘结构。 */
interface BalanceFile {
  version: number
  days: Record<string, DayBalance>
}

/** 内存里的快照表（date → 快照），落盘只是它的影射。 */
let store: Map<string, DayBalance> | undefined

/** 进行中的首次加载。 */
let loading: Promise<void> | undefined

/** 串行化写盘，避免两次采样把文件写坏。 */
let writing: Promise<void> = Promise.resolve()

/** 快照文件路径。 */
function storePath(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'company-quota', 'balance-days.json')
}

/** 把磁盘内容读进内存（只做一次；文件缺失/损坏时按空表处理）。 */
async function ensureLoaded(): Promise<void> {
  if (store !== undefined) return
  if (loading === undefined) {
    loading = (async () => {
      const days = new Map<string, DayBalance>()
      try {
        const raw = await readFile(storePath(), 'utf8')
        const parsed = JSON.parse(raw) as BalanceFile
        if (parsed.version === FORMAT_VERSION && parsed.days !== null && typeof parsed.days === 'object') {
          for (const [date, entry] of Object.entries(parsed.days)) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
            if (typeof entry?.total !== 'number' || typeof entry?.remaining !== 'number') continue
            days.set(date, { at: entry.at ?? 0, total: entry.total, remaining: entry.remaining })
          }
        }
      } catch {
        // 首次运行或文件损坏：从空表开始。
      }
      store = days
    })()
  }
  await loading
}

/**
 * 丢掉窗口外的快照并原子写盘。
 * @returns 本次写盘完成的 Promise（失败只影响下次启动的起点，不抛给调用方）。
 */
function persist(): Promise<void> {
  const days = store
  if (days === undefined) return Promise.resolve()
  const cutoff = localDateKey(Date.now() - KEEP_DAYS * 86_400_000)
  for (const date of days.keys()) if (date < cutoff) days.delete(date)
  const payload: BalanceFile = { version: FORMAT_VERSION, days: Object.fromEntries([...days.entries()].sort()) }
  writing = writing.then(async () => {
    const path = storePath()
    try {
      await mkdir(dirname(path), { recursive: true })
      const tmp = `${path}.tmp`
      await writeFile(tmp, JSON.stringify(payload), 'utf8')
      await rename(tmp, path)
    } catch {
      // 写盘失败不影响本轮展示。
    }
  })
  return writing
}

/**
 * 记一笔余额快照：同一天只保留最后一次观测，余额没变时不重写文件。
 * @param quota - 本次拿到的额度事实。
 * @param nowMs - 观测时刻（epoch ms）。
 */
export async function recordBalance(quota: QuotaFact, nowMs: number): Promise<void> {
  await ensureLoaded()
  const days = store
  if (days === undefined) return
  const key = localDateKey(nowMs)
  const previous = days.get(key)
  if (previous !== undefined && previous.total === quota.total && previous.remaining === quota.remaining) return
  days.set(key, { at: nowMs, total: quota.total, remaining: quota.remaining })
  await persist()
}

/**
 * 逐日消费：相邻两笔快照的余额差（升序；当天用最新观测）。
 * 首笔快照没有基准，因此它那天不出行；余额变大（充值/重置）按 0。
 * @param nowMs - 计算时刻（用于清理与排序基准）。
 * @returns 日历行（只有真正采到样的日子）。
 */
export async function dailySpend(nowMs: number): Promise<DailyRow[]> {
  await ensureLoaded()
  const days = store
  if (days === undefined) return []
  const cutoff = localDateKey(nowMs - KEEP_DAYS * 86_400_000)
  const entries = [...days.entries()].filter(([date]) => date >= cutoff).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const rows: DailyRow[] = []
  for (let index = 1; index < entries.length; index += 1) {
    const [date, current] = entries[index]
    const previous = entries[index - 1][1]
    const spent = previous.remaining - current.remaining
    rows.push({ date, cost: spent > 0 ? Math.round(spent * 1e6) / 1e6 : 0 })
  }
  return rows
}

/** 丢掉内存里的快照表（测试/诊断用）。 */
export function resetBalanceCache(): void {
  store = undefined
  loading = undefined
}
