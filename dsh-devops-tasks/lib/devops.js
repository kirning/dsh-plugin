/**
 * The DevOps workbench domain layer: three "about me" buckets, their counts,
 * and the normalization that turns platform rows into something a panel can
 * render without knowing field codes.
 *
 * Every platform call goes through the MCP tool `open_api_http_request`, whose
 * answer nests two JSON documents (transport envelope → platform envelope →
 * body). Unwrapping lives here so callers only ever see platform data.
 *
 * @module dsh-devops-tasks/lib/devops
 */

import { debugLog } from './mcp.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * The three buckets the panel shows.
 *
 * A bucket is a list of queries because the platform's own "我创建的" counter
 * only ever returns issues: work items created by the account (stories, tasks)
 * are reachable only through `COMPLETED` filtered by `fc_creator`, which is why
 * that query is merged into the same bucket.
 */
export const BUCKETS = {
  todo: { queries: [{ status: 'NOT_STARTED', scene: 'to_do_item_all' }] },
  review: {
    queries: [
      { status: 'NOT_REVIEW', scene: 'to_do_item_testPlan_review' },
      { status: 'NOT_REVIEW', scene: 'to_do_item_testReport_review' },
      { status: 'NOT_REVIEW', scene: 'to_do_milestone_approve_review' },
      { status: 'NOT_REVIEW', scene: 'to_do_common_flow_review' },
      { status: 'NOT_REVIEW', scene: 'to_do_approve_process_review' },
      { status: 'NOT_REVIEW', scene: 'to_do_test_shared_case' },
    ],
  },
  created: {
    queries: [
      { status: 'CREATED', scene: 'to_do_demand_create' },
      { status: 'CREATED', scene: 'to_do_item_issue' },
      { status: 'CREATED', scene: 'to_do_approve_process_create' },
      { status: 'CREATED', scene: 'to_do_common_flow_create' },
      // Everything the account created, whatever its status: `fc_creator` is the
      // only filter the platform honours on a scene-wide list.
      { status: 'COMPLETED', scene: 'to_do_item_all', byCreator: true },
    ],
  },
}

/** Human labels for review scenes, so a merged list stays readable. */
const SCENE_LABELS = {
  to_do_item_all: '',
  to_do_item_testPlan_review: '测试计划评审',
  to_do_item_testReport_review: '测试报告评审',
  to_do_milestone_approve_review: '里程碑评审',
  to_do_common_flow_review: '通用流程评审',
  to_do_approve_process_review: '审批流程',
  to_do_test_shared_case: '共享用例评审',
  to_do_demand_create: '需求',
  to_do_item_issue: '缺陷',
  to_do_approve_process_create: '审批流程',
  to_do_common_flow_create: '通用流程',
}

/** Template id → item type, used when the row carries no `toDoCategory`. */
const TEMPLATE_TYPES = {
  '70cf92d9-3035-42b1-874b-75d782a7e0aa': '故事',
  '4b02c659-60e6-4f0c-8c83-e79b876034f5': '任务',
  '55f7f6f9-8b2e-42bb-bbe9-41b08c5b8fde': '任务',
}

/**
 * The tenant's custom "任务点数" field: a float on the story and task
 * templates, addressed by field code rather than by name.
 */
const TASK_POINT_CODE = '456e2950-4644-4d9c-b99f-ae2ef52311aa'

/** Field codes requested from the platform for every bucket. */
const FIELD_CODES = [
  'id',
  'title',
  'fc_status',
  'toDoCategory',
  'fc_priority',
  'fc_plan_start_time',
  'fc_plan_end_time',
  'fc_expect_finish_time',
  'fc_responsible_person',
  'fc_creator',
  'fc_create_time',
  'systemTeamName',
  TASK_POINT_CODE,
]

/** Per-scene page size; the platform caps a page at {@link PLATFORM_PAGE_CAP}. */
const PAGE_SIZE = 100

/** The most rows the platform returns for one `listItem` page. */
const PLATFORM_PAGE_CAP = 50

/** How many rows one bucket may hold before it is reported as truncated. */
const BUCKET_CAP = 200

/** Snapshot cache lifetime. */
const SNAPSHOT_TTL_MS = 45_000

/** How long the resolved identity (orgId/systemId) is reused. */
const IDENTITY_TTL_MS = 10 * 60_000

/**
 * Where the last good snapshot is kept between host restarts. The host blocks
 * its event loop for up to a minute while plugins mount, which makes the very
 * first platform call of a cold process take tens of seconds; serving the
 * previous snapshot from disk keeps that wait off the panel's first paint.
 */
function cacheFile() {
  const home = process.env.DSH_HOME !== undefined && process.env.DSH_HOME !== ''
    ? process.env.DSH_HOME
    : path.join(os.homedir(), '.dsh')
  return path.join(home, 'dsh-devops-tasks', 'last-snapshot.json')
}

/** Read the persisted snapshot, or `null` when there is none or it is unreadable. */
function readCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(cacheFile(), 'utf8'))
    const savedAt = Date.parse(parsed?.savedAt ?? '')
    if (!Number.isFinite(savedAt) || parsed?.value == null) return null
    return { at: savedAt, value: parsed.value }
  } catch {
    return null
  }
}

/** Persist one snapshot; a failed write must never break a refresh. */
function writeCache(value) {
  try {
    const file = cacheFile()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify({ savedAt: new Date().toISOString(), value }), 'utf8')
  } catch (error) {
    debugLog(`cache write failed: ${messageOf(error)}`)
  }
}

/**
 * The DevOps read surface shared by the routes.
 *
 * Instances are cheap; the snapshot cache and the resolved identity are what
 * make repeated panel refreshes cheap.
 */
export class DevopsService {
  /**
   * @param {import('./mcp.js').McpHttpClient} client - MCP client for the DevOps server.
   * @param {{systemId?: string, orgId?: string, view?: string, teamId?: string, me?: string}} [identity] - header overrides.
   */
  constructor(client, identity = {}) {
    this.client = client
    this.identity = identity
    this.me = typeof identity.me === 'string' && identity.me !== '' ? identity.me : null
    this.snapshotCache = readCache() ?? { at: 0, value: null }
    this.identityCache = { at: 0, value: null }
    this.inflight = null
  }

  /**
   * The cached snapshot without contacting the platform, for stale-while-
   * revalidate responses. `null` when nothing has ever been fetched.
   */
  peek() {
    return this.snapshotCache.value === null ? null : this.snapshotCache
  }

  /** Whether the cached snapshot is older than the freshness window. */
  isStale() {
    return this.snapshotCache.value === null || Date.now() - this.snapshotCache.at >= SNAPSHOT_TTL_MS
  }

  /**
   * One full snapshot of the three buckets, cached for a short while.
   * @param {{force?: boolean}} [options] - cache bypass.
   */
  async snapshot(options = {}) {
    const fresh = options.force === true
    const now = Date.now()
    if (!fresh && this.snapshotCache.value !== null && now - this.snapshotCache.at < SNAPSHOT_TTL_MS) {
      return { ...this.snapshotCache.value, cached: true }
    }
    if (this.inflight !== null) return this.inflight
    this.inflight = this.buildSnapshot().finally(() => {
      this.inflight = null
    })
    const value = await this.inflight
    this.snapshotCache = { at: Date.now(), value }
    writeCache(value)
    return value
  }

  /**
   * Warm the session and the cache while the host is still booting, so the
   * first panel open does not pay for the MCP handshake. Failures are only
   * logged: a cold panel load will retry anyway.
   */
  warmup() {
    if (this.warmupStarted) return
    this.warmupStarted = true
    const startedAt = Date.now()
    this.snapshot({ force: true })
      .then((value) => {
        const rows = Object.values(value?.tabs ?? {}).reduce((sum, tab) => sum + (tab?.items?.length ?? 0), 0)
        debugLog(`warmup ok in ${Date.now() - startedAt}ms (${rows} rows)`)
      })
      .catch((error) => debugLog(`warmup failed after ${Date.now() - startedAt}ms: ${messageOf(error)}`))
      .finally(() => {
        this.warmupStarted = false
      })
  }

  /**
   * Build one snapshot from the platform.
   *
   * The calls are deliberately sequential. The MCP server drops the answer of
   * one call when several platform requests are in flight at once (observed: an
   * empty `data` array for one of eight parallel calls), and a silently empty
   * bucket is worse than a snapshot that takes a second longer.
   */
  async buildSnapshot() {
    const startedAt = Date.now()
    const identity = await this.resolveIdentity()
    const identityMs = Date.now() - startedAt
    const warnings = []
    let counts = null
    const countsAt = Date.now()
    try {
      counts = await this.counts(identity)
    } catch (error) {
      warnings.push(`计数获取失败：${messageOf(error)}`)
    }
    const countsMs = Date.now() - countsAt
    const tabs = {}
    const bucketMs = {}
    for (const [bucket, spec] of Object.entries(BUCKETS)) {
      const bucketAt = Date.now()
      try {
        tabs[bucket] = await this.bucket(bucket, spec, identity, this.resolveMe(tabs))
      } catch (error) {
        warnings.push(`${bucketLabel(bucket)} 获取失败：${messageOf(error)}`)
        tabs[bucket] = { items: [], total: 0, truncated: false, partial: true }
      }
      bucketMs[bucket] = Date.now() - bucketAt
    }
    for (const [bucket, tab] of Object.entries(tabs)) {
      if (tab.total === 0 && Array.isArray(tab.items) && tab.items.length > 0) tab.total = tab.items.length
      const counted = counts?.[bucket]?.total
      if (typeof counted === 'number' && counted > tab.items.length) tab.total = counted
    }
    const totalMs = Date.now() - startedAt
    if (process.env.DSH_DEVOPS_TASKS_DEBUG === '1' || totalMs > 8000) {
      const detail = Object.entries(bucketMs).map(([key, ms]) => `${key}=${ms}ms`).join(' ')
      debugLog(`snapshot ${totalMs}ms (identity=${identityMs}ms counts=${countsMs}ms ${detail})`)
    }
    return {
      fetchedAt: new Date().toISOString(),
      identity: { orgId: identity.orgId ?? null, systemId: identity.systemId ?? null },
      counts,
      tabs,
      warnings,
    }
  }

  /**
   * Fetch one bucket: every query it is composed of, merged and sorted.
   * @param {string} bucket - bucket key.
   * @param {{queries: {status: string, scene: string, byCreator?: boolean}[]}} spec - bucket definition.
   * @param {{orgId?: string, systemId?: string}} identity - request headers.
   * @param {string} me - the account's `姓名(账号)`, needed by `byCreator` queries.
   */
  async bucket(bucket, spec, identity, me) {
    // Sequential on purpose: parallel platform calls make the MCP server drop
    // one answer, and a missing scene is invisible in the merged list.
    const seen = new Set()
    const items = []
    let pageCapHit = false
    for (const query of spec.queries) {
      const creator = query.byCreator === true ? me : ''
      const page = await this.listPage(query.scene, query.status, identity, creator)
      if (page.pageCapHit) pageCapHit = true
      for (const item of page.rows) {
        const row = normalizeRow(item, query.scene)
        // Only id-bearing work items are deduplicated: the same item can come back
        // from two scenes. Reminders (mentions) have no id and two mentions may share
        // a title, so keying them by text would silently drop real rows.
        if (row.id !== '') {
          const key = `id:${row.id}`
          if (seen.has(key)) continue
          seen.add(key)
        }
        items.push(row)
      }
    }
    items.sort((left, right) => compareRows(bucket, left, right))
    return {
      items: items.slice(0, BUCKET_CAP),
      total: items.length,
      truncated: items.length > BUCKET_CAP,
      partial: pageCapHit,
    }
  }

  /**
   * The account's own `姓名(账号)` string: `fc_creator` conditions require
   * exactly that format and the platform exposes no "who am I" call. Every row
   * of the todo bucket is assigned to the account, so its responsible person is
   * the account — even when that row was created by someone else.
   */
  resolveMe(tabs) {
    if (this.me !== null) return this.me
    const configured = process.env.DSH_DEVOPS_ME ?? ''
    if (configured !== '') {
      this.me = configured
      return configured
    }
    const rows = tabs?.todo?.items ?? []
    const owner = rows.map(row => row.owner).find(name => typeof name === 'string' && name !== '')
    if (owner !== undefined) this.me = owner
    return this.me ?? ''
  }

  /**
   *
   * The platform caps a page at 50 rows whatever `pageSize` asks for; hitting
   * that cap means the scene holds more rows than the bucket can show, which is
   * reported as `partial` instead of silently pretending the list is complete.
   * An empty `creator` means no condition; otherwise the page is filtered to
   * work items that account created.
   */
  async listPage(scene, status, identity, creator = '') {
    const conditionList = creator === ''
      ? []
      : [{ key: 'fc_creator', operator: 'in', value: creator }]
    const body = await this.openApi({
      path: '/agile-service/toDo/v1/listItem',
      method: 'POST',
      identity,
      body: {
        scene,
        toDoStatus: status,
        category: 'to_do_item',
        current: 1,
        pageSize: PAGE_SIZE,
        conditionList,
        orderByList: [],
        fieldCodeList: FIELD_CODES,
        queryByUserSetting: false,
      },
    })
    const rows = body?.body?.data ?? body?.data ?? []
    const list = Array.isArray(rows) ? rows : []
    return { rows: list, pageCapHit: list.length >= PLATFORM_PAGE_CAP }
  }

  /** Bucket counts from the platform's own counter. */
  async counts(identity) {
    const body = await this.openApi({
      path: '/agile-service/toDo/v1/getCountAutoZone?useCache=false&zone=yellow',
      method: 'GET',
      identity,
    })
    const groups = Array.isArray(body?.body) ? body.body : []
    const pick = (name) => {
      const group = groups.find(entry => entry?.name === name)
      const list = Array.isArray(group?.itemCountList) ? group.itemCountList : []
      const categories = {}
      let total = 0
      for (const entry of list) {
        if (typeof entry?.countNum !== 'number') continue
        categories[entry.category] = entry.countNum
        if (entry.category === 'ALL') total = entry.countNum
      }
      if (total === 0 && Object.keys(categories).length > 0) {
        total = Object.values(categories).reduce((sum, value) => sum + value, 0)
      }
      return { total, categories }
    }
    return {
      todo: { ...pick('NOT_STARTED'), label: bucketLabel('todo') },
      review: { ...pick('NOT_REVIEW'), label: bucketLabel('review') },
      created: { ...pick('CREATED'), label: bucketLabel('created') },
    }
  }

  /**
   * Resolve the request headers the platform needs: one system id and its org.
   * The workbench is org-scoped, so any system the account can see works.
   */
  async resolveIdentity() {
    const configured = {
      orgId: typeof this.identity.orgId === 'string' && this.identity.orgId !== '' ? this.identity.orgId : null,
      systemId: typeof this.identity.systemId === 'string' && this.identity.systemId !== '' ? this.identity.systemId : null,
    }
    if (configured.orgId !== null && configured.systemId !== null) return configured
    const now = Date.now()
    if (this.identityCache.value !== null && now - this.identityCache.at < IDENTITY_TTL_MS) {
      return { ...this.identityCache.value, ...(configured.orgId === null ? {} : { orgId: configured.orgId }) }
    }
    let resolved = { orgId: configured.orgId, systemId: configured.systemId }
    if (resolved.orgId === null || resolved.systemId === null) {
      const systems = await this.listSystems()
      const first = systems[0]
      if (first !== undefined) {
        resolved = {
          orgId: resolved.orgId ?? first.orgId ?? null,
          systemId: resolved.systemId ?? first.systemId ?? null,
        }
      }
    }
    if (resolved.orgId === null || resolved.systemId === null) {
      throw new Error('无法确定 DevOps 的组织/系统 ID（list_user_permission_systems 没有返回可用系统）')
    }
    this.identityCache = { at: now, value: resolved }
    return resolved
  }

  /** Systems the signed-in account can see, as the MCP server reports them. */
  async listSystems() {
    const text = await this.client.callTool('list_user_permission_systems', {})
    const parsed = parseJsonLoose(text)
    const systems = parsed?.systems ?? parsed?.body?.systems ?? parsed?.data?.systems ?? []
    return Array.isArray(systems) ? systems : []
  }

  /**
   * One platform OpenAPI request through the MCP bridge.
   * @param {{path: string, method?: string, body?: unknown, identity?: {orgId?: string, systemId?: string}}} request - request description.
   * @returns {Promise<any>} the platform response body.
   */
  async openApi({ path: requestPath, method = 'GET', body, identity }) {
    const headers = identity ?? (await this.resolveIdentity())
    const payload = await this.client.callTool('open_api_http_request', {
      path: requestPath,
      method,
      systemId: headers.systemId ?? '',
      orgId: headers.orgId ?? '',
      teamId: '',
      view: this.identity.view ?? 'org',
      body: body === undefined ? '' : JSON.stringify(body),
    })
    const outer = parseJsonLoose(payload)
    if (outer === null) throw new Error(`平台响应无法解析：${payload.slice(0, 200)}`)
    if (outer.success === false || (typeof outer.statusCode === 'number' && outer.statusCode >= 400)) {
      throw new Error(platformError(outer))
    }
    // The MCP server answers with its own digest document:
    // `{success, summary, data: <platform body>, truncated, nextActions}` where
    // the platform body is itself `{body: {data: [...]}}` for list calls.
    const inner = typeof outer.body === 'string' ? parseJsonLoose(outer.body) : outer.body
    if (inner === null || inner === undefined) return null
    if (inner.success === false) {
      throw new Error(typeof inner.summary === 'string' && inner.summary !== ''
        ? inner.summary
        : (typeof inner.message === 'string' && inner.message !== '' ? inner.message : '平台返回失败'))
    }
    const platformBody = inner.data === undefined ? inner : inner.data
    if (platformBody !== null && typeof platformBody === 'object' && platformBody.status === false) {
      throw new Error(typeof platformBody.message === 'string' && platformBody.message !== '' ? platformBody.message : '平台返回失败')
    }
    return platformBody
  }

  /** Discoverability hint used by `/health`. */
  describe() {
    return { endpointResolved: true }
  }
}

/** Turn one platform row into the flat shape the panel renders. */
export function normalizeRow(item, scene) {
  const fields = item?.codeValueMap ?? {}
  const value = (code) => {
    const entry = fields[code]
    if (entry === null || entry === undefined) return null
    const shown = entry.displayValue
    if (typeof shown === 'string' && shown !== '') return shown
    return null
  }
  const statusEntry = fields.fc_status ?? null
  const stage = statusEntry?.displayExtMap?.stage
  const start = value('fc_plan_start_time')
  const end = value('fc_plan_end_time') ?? value('fc_expect_finish_time')
  const category = value('toDoCategory')
  const templateType = TEMPLATE_TYPES[item?.templateId] ?? null
  const id = value('id') ?? item?.id ?? ''
  // A reminder row is a comment that mentions the account: it carries no work
  // item, no id and no template, but the platform still tags it category "6".
  const rawCategory = fields.toDoCategory?.value
  const reminder = id === '' && (rawCategory === '6' || item?.templateId == null)
  return {
    id,
    title: plainText(item?.title ?? value('title') ?? ''),
    type: category ?? templateType ?? (reminder ? '提醒' : ''),
    status: value('fc_status') ?? '',
    stage: stage === undefined || stage === null ? null : String(stage),
    priority: value('fc_priority') ?? '',
    // "任务点数" is optional and only the story/task templates carry it.
    points: pointsOf(fields[TASK_POINT_CODE]),
    owner: value('fc_responsible_person') ?? '',
    creator: value('fc_creator') ?? '',
    created: value('fc_create_time'),
    start,
    end,
    system: value('systemTeamName') ?? '',
    systemId: item?.systemId ?? '',
    teamId: item?.teamId ?? null,
    templateId: item?.templateId ?? '',
    scene,
    sceneLabel: SCENE_LABELS[scene] ?? '',
  }
}

/**
 * Platform titles are rich text (the reminder rows are full of `ql-editor`
 * markup and mention spans), so the panel gets plain text instead of HTML.
 *
 * Entities are decoded first and tags stripped afterwards: the platform escapes
 * the markup inside reminder titles, so one pass would leave `<span …` visible.
 */
export function plainText(html) {
  if (typeof html !== 'string' || html === '') return ''
  let text = html
  for (let pass = 0; pass < 2; pass += 1) {
    text = decodeEntities(text).replace(/<[^>]*>/g, ' ')
  }
  return text
    // The platform truncates long reminder titles in the middle of a mention
    // span, so a dangling `<span class="ql-mention-deno…` has no closing `>`.
    .replace(/<[a-zA-Z/!][^>]*(?:>|$)/g, ' ')
    .replace(/[\u200b-\u200f\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\[TRUNCATED\]\s*$/i, '…')
    .trim()
}

/**
 * "任务点数" as a number, or null when the template has no value for it. The
 * platform sends floats as display strings ("3" and "0.5" both occur).
 */
function pointsOf(entry) {
  if (entry === null || entry === undefined) return null
  const candidates = [entry.displayValue, entry.value]
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue
    const parsed = Number(candidate)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** The handful of HTML entities the platform's rich text actually uses. */
function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, '&')
}

/** Bucket display name. */
export function bucketLabel(bucket) {
  if (bucket === 'todo') return '待办'
  if (bucket === 'review') return '待审'
  if (bucket === 'created') return '我创建的'
  return bucket
}

/**
 * Sort one bucket:
 *  - 待办 / 待审: plan end ascending, so the nearest deadline is first and rows
 *    without a date sink to the bottom;
 *  - 我创建的: creation (falling back to plan end) descending, so the newest
 *    work comes first — most created items carry no plan end at all.
 */
function compareRows(bucket, left, right) {
  const dayOf = (row) => {
    const candidates = bucket === 'created' ? [row.created, row.end] : [row.end]
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate !== '') return dayOnly(candidate)
    }
    return ''
  }
  const leftEnd = dayOf(left)
  const rightEnd = dayOf(right)
  if (leftEnd !== rightEnd) {
    if (leftEnd === '') return 1
    if (rightEnd === '') return -1
    const ascending = bucket === 'todo' || bucket === 'review'
    if (ascending) return leftEnd < rightEnd ? -1 : 1
    return leftEnd < rightEnd ? 1 : -1
  }
  if (left.id !== right.id) return left.id < right.id ? 1 : -1
  return 0
}

/** `YYYY-MM-DD` prefix of a platform date string. */
function dayOnly(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  return match === null ? value : match[1]
}

/** JSON parse that tolerates a text wrapper around the document. */
export function parseJsonLoose(text) {
  if (typeof text !== 'string') return text ?? null
  const trimmed = text.trim()
  if (trimmed === '') return null
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(trimmed.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

/** Platform failure text without dumping a whole envelope into the panel. */
function platformError(outer) {
  const inner = typeof outer.body === 'string' ? parseJsonLoose(outer.body) : null
  const message = inner?.message ?? outer.error?.message ?? outer.statusText
  if (typeof message === 'string' && message !== '') return message
  return `平台返回 HTTP ${outer.statusCode ?? '?'}`
}

/** Error text for warnings. */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}
