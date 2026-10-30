/**
 * 「公司额度」分区的双语文案。zh 是键集合的权威，en 用 Record 兜住全集。
 * @module dsh-plugin-company-quota/client/locales
 */

/** 本插件拥有的词典命名空间。 */
export const NS = 'company-quota'

/** 中文文案。 */
export const zh = {
  'nav': '公司额度',
  'title': '公司额度',
  'hint': '每格一天：右上角为日期，中间是当天公司模型的消费金额与 tokens；0 不显示，可翻月。',
  'loading': '正在加载额度…',
  'error': '查询失败：{error}',
  'noQuota': '额度不可用',
  'remaining': '剩余额度',
  'used': '本月已用',
  'reset': '{date} 重置',
  'today': '今日已用',
  'account': 'MIP 账号 {id}',
  'refresh': '刷新',
  'refreshing': '刷新中…',
  'updated': '更新于 {time}',
  'monthTotal': '本月合计 {cost} · {tokens} tokens',
  'none': '暂无公司模型用量数据（统计自插件启用起）',
  'prev': '上一月',
  'next': '下一月',
  'weekdays': '一,二,三,四,五,六,日',
  'forecastEnd': '按当前均值 {daily}/天，预计 {date} 用完',
  'forecastLeft': '按当前均值 {daily}/天，月底预计剩余 {left}',
  'badgeEnd': '预计用完',
  'badgeLeft': '剩 {left}',
}

/** 英文文案（键集合与 zh 完全一致）。 */
export const en: Record<CompanyQuotaKey, string> = {
  'nav': 'Company Quota',
  'title': 'Company Quota',
  'hint': 'One cell per day: the date in the corner, that day\'s company-model spend and tokens in the middle; zero days stay blank and months can be paged.',
  'loading': 'Loading quota…',
  'error': 'Query failed: {error}',
  'noQuota': 'Quota unavailable',
  'remaining': 'Remaining',
  'used': 'Used this month',
  'reset': 'resets {date}',
  'today': 'Today',
  'account': 'MIP account {id}',
  'refresh': 'Refresh',
  'refreshing': 'Refreshing…',
  'updated': 'Updated {time}',
  'monthTotal': 'Month total {cost} · {tokens} tokens',
  'none': 'No company usage yet (counting starts when the plugin is enabled)',
  'prev': 'Previous month',
  'next': 'Next month',
  'weekdays': 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
  'forecastEnd': 'At the current {daily}/day, projected to run out on {date}',
  'forecastLeft': 'At the current {daily}/day, about {left} left at month end',
  'badgeEnd': 'runs out',
  'badgeLeft': 'left {left}',
}

/** 本插件词典的键集合。 */
export type CompanyQuotaKey = keyof typeof zh
