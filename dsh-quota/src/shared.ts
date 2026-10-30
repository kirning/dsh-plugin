/**
 * 宿主半与浏览器半共享的线上类型与常量（无 Node/DOM 依赖，可被两侧一起导入）。
 * @module dsh-plugin-company-quota/shared
 */

/**
 * 公司路由的历史 id / 兜底 id。宿主半按 baseURL 前缀从 llm-pi-ai 配置里动态
 * 识别公司路由；识别失败（或台账里有改名前的历史数据）时用这个 id。
 */
export const PROVIDER_ID = 'midea'

/** 路由前缀；浏览器半用文档相对路径 `api/company-quota/...` 访问。 */
export const API_PREFIX = '/api/company-quota'

/** 一天的公司路由用量。 */
export interface DailyRow {
  /** 本地日期键 `YYYY-MM-DD`。 */
  date: string
  /** 当天 tokens 合计（输入 + 输出 + 缓存读 + 缓存写）。 */
  tokens: number
  /** 当天上报用量的调用次数。 */
  calls: number
  /** 按公司价目表折算的金额（CNY）。 */
  cost: number
}

/** 额度接口给出的当月额度事实。 */
export interface QuotaFact {
  /** 币种（接口当前为 CNY）。 */
  unit: string
  /** 本周期总额度。 */
  total: number
  /** 剩余额度。 */
  remaining: number
  /** 周期重置时刻（ISO 8601）。 */
  resetsAt?: string
  /** 套餐名。 */
  planName?: string
  /** 计费方式。 */
  billingMethod?: string
}

/** 额度耗尽预测。 */
export interface Forecast {
  /** 周期内日均花费（CNY）。 */
  daily: number
  /** 按日均还能用多少天。 */
  daysLeft: number
  /** 预测耗尽日（`YYYY-MM-DD`）。 */
  predictedKey: string
  /** 周期最后一天（`YYYY-MM-DD`）。 */
  lastKey: string
  /** 本月用不完（耗尽日在月末之后）。 */
  monthly: boolean
  /** 到周期末的预计剩余额度。 */
  projectedLeft: number
  /** 周期起始日。 */
  cycleStart: string
  /** 周期结束日（重置日）。 */
  cycleEnd: string
}

/** 浏览器半渲染的 overview 文档。 */
export interface OverviewDocument {
  /** 生成时刻（epoch ms）。 */
  updatedAt: number
  /** 路由 id（识别出的第一条公司路由；识别失败时为历史 id）。 */
  provider: string
  /** 本次聚合覆盖的全部台账分桶键（识别出的路由 + 历史桶，升序）。 */
  providerIds: string[]
  /** 展示名（配置里的 displayName，缺省「公司」）。 */
  displayName: string
  /** MIP 账号（额度接口的 user_id）。 */
  userId: string
  /** 当月额度事实；查询失败时缺省。 */
  quota?: QuotaFact
  /** 台账里公司路由的逐日用量（升序）。 */
  daily: DailyRow[]
  /** 今天那一行（无用量时为 0）。 */
  today: DailyRow
  /** 额度预测；额度不可用时缺省。 */
  forecast?: Forecast
  /** 额度接口/凭据的失败原因。 */
  error?: string
}
