/**
 * 历史逐日消费（旧口径的存量）：只读、只补「余额差」覆盖不到的过去。
 *
 * 0.1.5 起逐日消费改成余额快照相减（见 ./balance.ts），但余额差只能从有快照的
 * 那天往后算，历史那些天的金额就没了。这部分历史原先由 `@linxin666/dsh-usage`
 * 写进 `$DSH_HOME/dsh-usage/usage-ledger.json`（按日 → 路由 → 模型记 token），
 * 本模块只做一件事：把那份**冻结的存量台账**按旧价目表折算成每日金额，交给
 * 日历显示过去的日子。
 *
 * 约定：
 *  - 只读不写，台账文件本身永远不改（插件关掉后它就是只读历史）；
 *  - 只产出「余额快照开始之前」的日期，之后由余额差接手，同一日期以余额差为准；
 *  - 台账按 (size, mtimeMs) 缓存在内存里，文件不再变化时零 IO 成本；
 *  - 台账缺失/损坏时安静返回空数组——没有历史就只是日历空白，不算错误。
 * @module dsh-plugin-company-quota/legacy
 */

import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { DailyRow } from './shared.ts'

/**
 * 旧口径价目表（元 / 百万 token）：[输入, 输出, 缓存读]。
 * 只用于折算历史台账，不再参与「今天以后」的统计；公司网关改了价也不用动这里，
 * 因为新数据走余额差。
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

/** 台账里一个模型一天的分桶（只关心算钱要用的字段）。 */
interface TokenTotals {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  calls?: number
}

/** 台账文档形状。 */
interface LedgerDocument {
  days?: Record<string, Record<string, Record<string, TokenTotals>>>
}

/** 台账解析结果的缓存（文件不再变化时复用）。 */
let cache: { key: string; days: Map<string, number> } | undefined

/** 台账文件路径。 */
function ledgerPath(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'dsh-usage', 'usage-ledger.json')
}

/** 一个模型一天的花费（CNY）：找不到价目的模型按 0 计。 */
function modelCost(model: string, totals: TokenTotals): number {
  const key = model.slice(model.lastIndexOf('/') + 1)
  const price = PRICES[key]
  if (price === undefined) return 0
  const input = totals.inputTokens ?? 0
  const output = totals.outputTokens ?? 0
  const cached = totals.cacheReadTokens ?? 0
  return (input * price[0] + output * price[1] + cached * price[2]) / 1e6
}

/** 保留 6 位小数，别把浮点噪声带到界面上。 */
function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/**
 * 把台账折叠成 date → 金额（按公司路由过滤）。
 * @param raw - 台账原文。
 * @param routeIds - 算作公司消费的路由 id 集合（含历史桶名）。
 * @returns 每个有记录的日期的金额。
 */
function foldLedger(raw: string, routeIds: ReadonlySet<string>): Map<string, number> {
  const days = new Map<string, number>()
  let doc: LedgerDocument
  try {
    doc = JSON.parse(raw) as LedgerDocument
  } catch {
    return days
  }
  for (const [date, buckets] of Object.entries(doc.days ?? {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || buckets === null || typeof buckets !== 'object') continue
    let cost = 0
    for (const id of routeIds) {
      const models = buckets[id]
      if (models === undefined || models === null || typeof models !== 'object') continue
      for (const [model, totals] of Object.entries(models)) {
        if (totals === null || typeof totals !== 'object') continue
        cost += modelCost(model, totals)
      }
    }
    days.set(date, round6(cost))
  }
  return days
}

/** 读台账（按 (size, mtimeMs) 缓存）；缺失或读不动时返回空表。 */
async function loadLedger(routeIds: ReadonlySet<string>): Promise<Map<string, number>> {
  const path = ledgerPath()
  let fingerprint: string
  try {
    const info = await stat(path)
    fingerprint = `${info.size}:${info.mtimeMs}`
  } catch {
    return new Map()
  }
  const cached = cache
  if (cached !== undefined && cached.key === fingerprint) {
    return cached.days
  }
  try {
    const raw = await readFile(path, 'utf8')
    const days = foldLedger(raw, routeIds)
    cache = { key: fingerprint, days }
    return days
  } catch {
    return new Map()
  }
}

/**
 * 历史逐日消费：台账里早于 `beforeDate` 的日期。
 * @param routeIds - 算作公司消费的路由 id 集合。
 * @param beforeDate - 余额快照的第一天（这一天及以后由余额差负责）。
 * @returns 升序的日历行（金额可能为 0，表示当天有记录但模型不在价目表里）。
 */
export async function legacyDaily(routeIds: ReadonlySet<string>, beforeDate: string): Promise<DailyRow[]> {
  const days = await loadLedger(routeIds)
  const rows: DailyRow[] = []
  for (const [date, cost] of days) {
    if (date >= beforeDate) continue
    rows.push({ date, cost })
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return rows
}

/** 丢掉内存里的台账缓存（测试/诊断用）。 */
export function resetLegacyCache(): void {
  cache = undefined
}
