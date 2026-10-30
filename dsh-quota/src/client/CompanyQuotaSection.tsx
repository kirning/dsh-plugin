/**
 * 「公司额度」设置分区：额度汇总（剩余/已用/重置）、逐日消费日历（金额 + tokens、
 * 0 不显示、可翻月）与额度耗尽预测（耗尽日标记，或月末预计剩余）。
 *
 * 数据全部来自宿主半的 `api/company-quota/overview` —— 浏览器不做任何计价，
 * API key 也从不下发到浏览器。
 * @module dsh-plugin-company-quota/client/CompanyQuotaSection
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { DailyRow, OverviewDocument } from '../shared.ts'

/** 本分区的完整 props：设置面板运行时共享 + 本插件词典。 */
export type CompanyQuotaSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'company-quota'>

/** 页面打开时的轮询周期。 */
const POLL_MS = 60_000

/** 还没有额度数字时的重试周期（公司网关偶发慢，别让界面等一分钟）。 */
const RETRY_MS = 10_000

/** 紧凑 token 计数：1234567 -> 1.23M。 */
function formatTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value < 1000) return String(Math.round(value))
  if (value < 1_000_000) return trimNumber(value / 1000) + 'k'
  if (value < 1_000_000_000) return trimNumber(value / 1_000_000) + 'M'
  return trimNumber(value / 1_000_000_000) + 'B'
}

function trimNumber(value: number): string {
  return value >= 100 ? String(Math.round(value)) : value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, '')
}

/** 金额：小额保留 4 位，其余 2 位。 */
function money(value: number): string {
  if (!Number.isFinite(value)) return '¥0.00'
  return '¥' + (value < 0.01 ? value.toFixed(4) : value.toFixed(2))
}

/** 本地日期键。 */
function dateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 一天一格的日历。 */
function Calendar(props: {
  daily: DailyRow[]
  forecast: OverviewDocument['forecast']
  offset: number
  onOffset: (next: number) => void
  t: CompanyQuotaSectionProps['t']
}): ReactNode {
  const { daily, forecast, offset, onOffset, t } = props
  const now = new Date()
  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const year = base.getFullYear()
  const month = base.getMonth()
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const byDate = new Map(daily.map((row) => [row.date, row]))
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  let monthCost = 0
  let monthTokens = 0
  for (const row of daily) {
    if (row.date.slice(0, 7) !== monthKey) continue
    monthCost += row.cost
    monthTokens += row.tokens
  }

  const cells: Array<number | null> = []
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)

  const weekdays = t('weekdays').split(',')
  const showForecast = forecast !== undefined && monthKey === currentMonthKey

  return (
    <div style={styles.calendar}>
      <div style={styles.calendarHead}>
        <span style={styles.muted}>{t('hint')}</span>
        <span style={styles.monthNav}>
          <button type="button" style={styles.navButton} aria-label={t('prev')} onClick={() => onOffset(offset - 1)}>{'‹'}</button>
          <span style={styles.monthLabel}>{monthKey}</span>
          <button type="button" style={styles.navButton} aria-label={t('next')} onClick={() => onOffset(offset + 1)}>{'›'}</button>
        </span>
      </div>

      <div style={styles.weekRow}>
        {weekdays.map((label) => <span key={label} style={styles.weekCell}>{label}</span>)}
      </div>

      <div style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />
          const key = dateKey(year, month, day)
          const row = byDate.get(key)
          const cost = row === undefined ? 0 : row.cost
          const tokens = row === undefined ? 0 : row.tokens
          const isEnd = showForecast && !forecast.monthly && forecast.predictedKey === key
          const isLeft = showForecast && forecast.monthly && forecast.lastKey === key
          const cellStyle: CSSProperties = {
            ...styles.cell,
            ...(isEnd ? styles.cellEnd : isLeft ? styles.cellLeft : cost > 0 ? styles.cellUsed : null),
          }
          return (
            <span key={key} style={cellStyle} title={cost > 0 ? `${key} ${money(cost)}` : key}>
              <span style={styles.cellDay}>{day}</span>
              {(cost > 0 || tokens > 0 || isEnd || isLeft) && (
                <span style={styles.cellBody}>
                  {cost > 0 && <span style={styles.cellCost}>{money(cost)}</span>}
                  {cost > 0 && tokens > 0 && <span style={styles.cellTokens}>{formatTokens(tokens)}</span>}
                  {isEnd && <span style={styles.badgeEnd}>{t('badgeEnd')}</span>}
                  {isLeft && <span style={styles.badgeLeft}>{t('badgeLeft', { left: money(forecast.projectedLeft) })}</span>}
                </span>
              )}
            </span>
          )
        })}
      </div>

      <div style={styles.muted}>
        {daily.length === 0 ? t('none') : t('monthTotal', { cost: money(monthCost), tokens: formatTokens(monthTokens) })}
      </div>
      {showForecast && (
        <div style={styles.muted}>
          {forecast.monthly
            ? t('forecastLeft', { daily: money(forecast.daily), left: money(forecast.projectedLeft) })
            : t('forecastEnd', { daily: money(forecast.daily), date: forecast.predictedKey })}
        </div>
      )}
    </div>
  )
}

/**
 * 分区主体：拉取宿主 overview 并渲染。
 * @param props - 运行时共享 + 本插件词典。
 */
export function CompanyQuotaSection(props: CompanyQuotaSectionProps): ReactNode {
  const { t } = props
  const [doc, setDoc] = useState<OverviewDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [offset, setOffset] = useState(0)
  const aliveRef = useRef(true)

  const load = useCallback(async (path: string, method: 'GET' | 'POST'): Promise<void> => {
    try {
      const response = await fetch(path, method === 'POST' ? { method: 'POST' } : undefined)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = (await response.json()) as OverviewDocument
      if (!aliveRef.current) return
      setDoc(body)
      setError(null)
    } catch (failure) {
      if (!aliveRef.current) return
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [])

  // 还没有额度数字时更勤快地重试；拿到后回到分钟级轮询。
  const periodMs = doc?.quota === undefined ? RETRY_MS : POLL_MS

  useEffect(() => {
    aliveRef.current = true
    void load('api/company-quota/overview', 'GET')
    const timer = setInterval(() => { void load('api/company-quota/overview', 'GET') }, periodMs)
    return () => {
      aliveRef.current = false
      clearInterval(timer)
    }
  }, [load, periodMs])

  const refresh = (): void => {
    setRefreshing(true)
    void load('api/company-quota/refresh', 'POST').finally(() => {
      if (aliveRef.current) setRefreshing(false)
    })
  }

  const quota = doc?.quota
  const percent = quota === undefined || quota.total <= 0 ? undefined : ((quota.total - quota.remaining) / quota.total) * 100

  return (
    <section style={styles.section} data-dsh-part="company-quota">
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>{t('title')}</h2>
          <span style={styles.muted}>{t('account', { id: doc?.userId ?? '—' })}</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.muted}>
            {doc === null ? '' : t('updated', { time: new Date(doc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
          </span>
          <button type="button" style={styles.refreshButton} onClick={refresh} disabled={refreshing}>
            {refreshing ? t('refreshing') : t('refresh')}
          </button>
        </div>
      </header>

      {loading && <span style={styles.muted}>{t('loading')}</span>}
      {error !== null && <span style={styles.error}>{t('error', { error })}</span>}
      {error === null && doc?.error !== undefined && doc.quota === undefined && (
        <span style={styles.error}>{t('error', { error: doc.error })}</span>
      )}

      <div style={styles.stats}>
        <span style={styles.stat}>
          <span style={styles.statLabel}>{t('remaining')}</span>
          <span style={styles.statValue}>{quota === undefined ? '—' : money(quota.remaining)}</span>
        </span>
        <span style={styles.stat}>
          <span style={styles.statLabel}>{t('used')}</span>
          <span style={styles.statValue}>{percent === undefined ? '—' : `${percent.toFixed(1)}%`}</span>
        </span>
        <span style={styles.stat}>
          <span style={styles.statLabel}>{t('today')}</span>
          <span style={styles.statValue}>
            {doc === null ? '—' : `${money(doc.today.cost)} · ${formatTokens(doc.today.tokens)}`}
          </span>
        </span>
        <span style={styles.stat}>
          <span style={styles.statLabel}>{t('reset', { date: quota?.resetsAt === undefined ? '—' : new Date(quota.resetsAt).toLocaleDateString() })}</span>
        </span>
      </div>

      {doc !== null && (
        <Calendar daily={doc.daily} forecast={doc.forecast} offset={offset} onOffset={setOffset} t={t} />
      )}
    </section>
  )
}

/** 内联样式：跟随 DSH 的 --dsw-* 主题别名，不写死颜色。 */
const styles: Record<string, CSSProperties> = {
  section: { display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '720px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px', flex: 'none' },
  title: { margin: '0 0 2px', fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: 'var(--dsw-alias-label-primary)' },
  muted: { fontSize: '12px', lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' },
  error: { fontSize: '12px', lineHeight: '18px', color: 'var(--dsw-alias-state-error-primary, #d4380d)' },
  refreshButton: {
    height: '28px', padding: '0 12px', border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: '8px',
    background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontSize: '12px', cursor: 'pointer',
  },
  stats: { display: 'flex', flexWrap: 'wrap', gap: '8px 20px', alignItems: 'baseline' },
  stat: { display: 'flex', alignItems: 'baseline', gap: '6px' },
  statLabel: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' },
  statValue: { fontSize: '15px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' },
  calendar: {
    display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px',
    border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: '12px',
    background: 'var(--dsw-alias-bg-layer-1)',
  },
  calendarHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '6px', flex: 'none' },
  monthLabel: { minWidth: '62px', textAlign: 'center', fontSize: '12px', color: 'var(--dsw-alias-label-primary)' },
  navButton: {
    width: '24px', height: '24px', border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: '6px',
    background: 'transparent', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer', lineHeight: 1,
  },
  weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px', textAlign: 'center' },
  weekCell: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' },
  cell: {
    position: 'relative', minHeight: '58px', borderRadius: '8px', padding: '4px',
    border: '1px solid var(--dsw-alias-border-l2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cellUsed: { border: '1px solid var(--dsw-alias-state-business-primary, #4d6bfe)', background: 'rgba(77,107,254,.14)' },
  cellEnd: { border: '1px solid #f87171', background: 'rgba(248,113,113,.14)' },
  cellLeft: { border: '1px solid #7dd3fc', background: 'rgba(125,211,252,.12)' },
  cellDay: { position: 'absolute', top: '3px', right: '6px', fontSize: '10px', color: 'var(--dsw-alias-label-secondary)' },
  cellBody: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  cellCost: { fontSize: '12px', fontWeight: 600, color: '#fcd34d' },
  cellTokens: { fontSize: '10px', color: 'var(--dsw-alias-label-secondary)' },
  badgeEnd: { fontSize: '10px', fontWeight: 600, color: '#f87171', whiteSpace: 'nowrap' },
  badgeLeft: { fontSize: '10px', fontWeight: 600, color: '#7dd3fc', whiteSpace: 'nowrap' },
}
