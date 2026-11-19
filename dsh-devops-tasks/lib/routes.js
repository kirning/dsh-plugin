/**
 * The `/api/dsh-devops-tasks` route family the panel calls.
 *
 * The endpoints: `/snapshot` (the three buckets plus their counts), `/health`
 * (whether the DevOps MCP endpoint could be found and reached), `/item-detail`
 * and `/item-log` (one work item's detail and activity log), `/containers`
 * (the podman containers the 「容器管理」 tab lists) and `/containers/start` /
 * `/containers/stop` (that tab's two lifecycle buttons). The PANEL never talks
 * to the DevOps server itself — the PAT lives in the MCP URL and must stay in
 * the host process, so this is the only door.
 *
 * Every request is fenced to loopback plus same-origin browser markers: a
 * shared or LAN-exposed `dsh web` must not serve one person's task list to
 * another.
 *
 * @module dsh-devops-tasks/lib/routes
 */

import { McpHttpClient, debugLog, discoverEndpoint } from './mcp.js'
import { DevopsService } from './devops.js'
import { isContainerReference, listContainers, startContainer, stopContainer } from './containers.js'

/** Route prefix owned by this plugin. */
export const API_PREFIX = '/api/dsh-devops-tasks'

/** IPv4 127/8 predicate. */
function isIPv4Loopback(value) {
  const parts = value.split('.')
  return parts.length === 4 && parts[0] === '127' && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/** Whether a socket address names the loopback range. */
function isLoopbackAddress(address) {
  if (typeof address !== 'string' || address === '') return false
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('::ffff:')) return isIPv4Loopback(normalized.slice('::ffff:'.length))
  return isIPv4Loopback(normalized)
}

/**
 * Request-level trust fence: loopback socket AND loopback Host header, plus
 * browser same-origin markers. `X-Forwarded-For` is never trusted.
 * @param {import('node:http').IncomingMessage} request - inbound request.
 */
export function isLoopbackRequest(request) {
  if (!isLoopbackAddress(request.socket?.remoteAddress)) return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostname
  try {
    hostname = new URL(`http://${host}`).hostname
  } catch {
    return false
  }
  if (!(hostname === 'localhost' || hostname === '[::1]' || isIPv4Loopback(hostname))) return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Write one JSON response. */
function writeJson(response, status, body) {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  })
  response.end(payload)
}

/** Keep the PAT out of anything the browser can read. */
export function maskEndpoint(url) {
  if (typeof url !== 'string') return null
  return url.replace(/([?&]token=)[^&]+/i, '$1***')
}

/**
 * Build the single prefix route plus its warm-up hook.
 * @param {{config?: {mcpServerName?: string, endpoint?: string, systemId?: string, orgId?: string, view?: string}}} deps - plugin config.
 * @returns {{route: {kind: 'prefix', path: string, handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}, warmup: () => void}} route and warm-up.
 */
export function createRoutes(deps = {}) {
  const config = deps.config ?? {}
  const serverName = typeof config.mcpServerName === 'string' && config.mcpServerName !== ''
    ? config.mcpServerName
    : 'devops-mcp-agile'
  const identity = {
    ...(typeof config.systemId === 'string' && config.systemId !== '' ? { systemId: config.systemId } : {}),
    ...(typeof config.orgId === 'string' && config.orgId !== '' ? { orgId: config.orgId } : {}),
    ...(typeof config.view === 'string' && config.view !== '' ? { view: config.view } : {}),
  }

  /** One service per discovered endpoint, so a rotated PAT reconnects. */
  const services = new Map()
  let lastDiscovery = null

  /** Current service, discovering the endpoint on demand. */
  const currentService = () => {
    const discovery = discoverEndpoint({ serverName, endpoint: config.endpoint })
    lastDiscovery = discovery
    if (discovery.url === null) {
      throw new Error(discovery.error ?? `没有找到 MCP 服务 ${serverName} 的 endpoint`)
    }
    let service = services.get(discovery.url)
    if (service === undefined) {
      service = new DevopsService(new McpHttpClient({ endpoint: discovery.url }), identity)
      services.set(discovery.url, service)
    }
    return { service, discovery }
  }

  /** Dispatch one request. */
  const handler = async (request, response) => {
    if (!isLoopbackRequest(request)) {
      writeJson(response, 403, { error: 'forbidden: loopback-only' })
      return
    }
    let url
    try {
      url = new URL(request.url ?? '/', 'http://localhost')
    } catch {
      writeJson(response, 400, { error: 'bad request url' })
      return
    }
    const route = url.pathname.startsWith(API_PREFIX) ? url.pathname.slice(API_PREFIX.length) || '/' : url.pathname
    const method = (request.method ?? 'GET').toUpperCase()
    // The only mutating routes this plugin owns: the 「容器管理」 start/stop
    // buttons. Everything else stays read-only, so an accidental POST cannot
    // change anything.
    const lifecycle = route === '/containers/start' ? startContainer
      : route === '/containers/stop' ? stopContainer
        : null
    if (lifecycle === null && method !== 'GET' && method !== 'HEAD') {
      writeJson(response, 405, { error: 'method not allowed' })
      return
    }
    if (lifecycle !== null && method !== 'POST') {
      writeJson(response, 405, { error: 'method not allowed' })
      return
    }

    if (route === '/health') {
      const discovery = discoverEndpoint({ serverName, endpoint: config.endpoint })
      lastDiscovery = discovery
      if (discovery.url === null) {
        writeJson(response, 200, {
          ok: false,
          server: serverName,
          endpoint: null,
          source: discovery.source,
          error: discovery.error ?? '未找到 MCP endpoint',
        })
        return
      }
      const service = services.get(discovery.url)
      // `/health` must stay cheap: it answers "did the plugin find its MCP
      // endpoint", not "is the platform fast right now". A live platform probe
      // is opt-in with `?probe=1` (a cold host can block for tens of seconds).
      if (url.searchParams.get('probe') !== '1') {
        writeJson(response, 200, {
          ok: true,
          server: serverName,
          endpoint: maskEndpoint(discovery.url),
          source: discovery.source,
          systems: null,
        })
        return
      }
      try {
        const systems = service === undefined ? null : await service.listSystems().then(list => list.length)
        writeJson(response, 200, {
          ok: true,
          server: serverName,
          endpoint: maskEndpoint(discovery.url),
          source: discovery.source,
          systems,
        })
      } catch (error) {
        writeJson(response, 200, {
          ok: false,
          server: serverName,
          endpoint: maskEndpoint(discovery.url),
          source: discovery.source,
          error: messageOf(error),
        })
      }
      return
    }

    if (route === '/snapshot') {
      try {
        const { service, discovery } = currentService()
        const force = url.searchParams.get('force') === '1'
        const cached = service.peek()
        // Stale-while-revalidate: a cold host can block its event loop for tens
        // of seconds, so the last snapshot (also the one saved before a restart)
        // is served at once and refreshed in the background.
        if (!force && cached !== null) {
          const stale = service.isStale()
          if (stale) service.warmup()
          writeJson(response, 200, {
            ...cached.value,
            cached: true,
            stale,
            cachedAt: new Date(cached.at).toISOString(),
            server: serverName,
            endpoint: maskEndpoint(discovery.url),
            source: discovery.source,
          })
          return
        }
        const snapshot = await service.snapshot({ force })
        writeJson(response, 200, {
          ...snapshot,
          server: serverName,
          endpoint: maskEndpoint(discovery.url),
          source: discovery.source,
        })
      } catch (error) {
        writeJson(response, 502, {
          error: messageOf(error),
          server: serverName,
          source: lastDiscovery?.source ?? 'none',
        })
      }
      return
    }

    if (route === '/item-detail' || route === '/item-log') {
      const id = (url.searchParams.get('id') ?? '').trim()
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
        writeJson(response, 400, { error: 'bad item id' })
        return
      }
      try {
        const { service } = currentService()
        if (route === '/item-detail') {
          const detail = await service.itemDetail(id, (url.searchParams.get('systemId') ?? '').trim())
          writeJson(response, 200, detail)
          return
        }
        const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
        const size = Math.min(100, Math.max(1, Number(url.searchParams.get('size') ?? '50') || 50))
        const log = await service.itemLog(id, page, size)
        writeJson(response, 200, { ...log, page, size })
      } catch (error) {
        writeJson(response, 502, { error: messageOf(error) })
      }
      return
    }

    if (lifecycle !== null) {
      let payload
      try {
        payload = await readJsonBody(request)
      } catch (error) {
        writeJson(response, 400, { error: messageOf(error) })
        return
      }
      const reference = typeof payload.id === 'string' ? payload.id.trim() : ''
      if (!isContainerReference(reference)) {
        writeJson(response, 400, { error: 'bad container id' })
        return
      }
      try {
        const result = await lifecycle(reference, {
          podmanPath: typeof config.podmanPath === 'string' ? config.podmanPath : undefined,
        })
        writeJson(response, 200, result)
      } catch (error) {
        writeJson(response, 502, { error: messageOf(error) })
      }
      return
    }

    if (route === '/containers') {
      // Listing is read-only; the two lifecycle routes above are the only ways
      // a browser can change engine state, and each takes one narrow id.
      try {
        const listed = await listContainers({
          podmanPath: typeof config.podmanPath === 'string' ? config.podmanPath : undefined,
        })
        writeJson(response, 200, { ...listed, count: listed.containers.length })
      } catch (error) {
        writeJson(response, 502, { error: messageOf(error) })
      }
      return
    }

    writeJson(response, 404, { error: 'not found' })
  }

  /**
   * Kick off the first snapshot in the background. The host is usually still
   * booting when the plugin mounts, which starves the first outbound request
   * for tens of seconds; doing it now keeps that cost off the panel's path.
   */
  const warmup = () => {
    try {
      currentService().service.warmup()
    } catch (error) {
      debugLog(`warmup skipped: ${messageOf(error)}`)
    }
  }

  return { route: { kind: 'prefix', path: API_PREFIX, handler }, warmup }
}

/**
 * Route-only entry point, kept for callers that do not want the warm-up hook.
 * @param {{config?: object}} [deps] - plugin config.
 */
export function makeRoute(deps = {}) {
  return createRoutes(deps).route
}

/** Error text without leaking the endpoint. */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/** Largest JSON body accepted from the panel (one container id). */
const MAX_BODY_BYTES = 8 * 1024

/**
 * Read and parse a small JSON request body.
 * @param {import('node:http').IncomingMessage} request - inbound request.
 * @returns {Promise<Record<string, unknown>>} the parsed object, `{}` when empty.
 */
function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('请求体过大'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('error', error => reject(error))
    request.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim()
      if (text === '') {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(text)
        resolve(parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {})
      } catch {
        reject(new Error('请求体不是合法 JSON'))
      }
    })
  })
}
