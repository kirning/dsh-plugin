/**
 * The `/api/dsh-token-calendar` route family.
 *
 * One prefix route dispatches every panel request. Each endpoint is a thin
 * adapter over `TokenCalendarService`: parse the query, call the shared
 * operation, map a failure to a status code.
 *
 * The endpoints only read local statistics files, but they expose the
 * machine's usage history, so they carry the same loopback trust fence as
 * the rest of this plugin family.
 *
 * @module dsh-token-calendar/lib/routes
 */

/** Route prefix owned by this plugin. */
export const API_PREFIX = '/api/dsh-token-calendar'

/** IPv4 127/8 predicate. */
function isIPv4Loopback(value) {
  const parts = value.split('.')
  return parts.length === 4 && parts[0] === '127' && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/**
 * Whether a socket address names the loopback range.
 * @param {string} address - the socket address.
 * @returns {boolean} true when it is loopback.
 */
function isLoopbackAddress(address) {
  if (typeof address !== 'string' || address === '') return false
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('::ffff:')) return isIPv4Loopback(normalized.slice(7))
  return isIPv4Loopback(normalized)
}

/**
 * Request-level trust fence: loopback socket AND loopback Host header, plus
 * browser same-origin markers. `X-Forwarded-For` is never trusted.
 * @param {import('node:http').IncomingMessage} request - the inbound request.
 * @returns {boolean} true when the request may be served.
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

/**
 * Write one JSON response.
 * @param {import('node:http').ServerResponse} response - the response.
 * @param {number} status - the status code.
 * @param {unknown} body - the payload.
 */
function writeJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  })
  response.end(JSON.stringify(body))
}

/**
 * Build the prefix route.
 * @param {{service: import('./service.js').TokenCalendarService}} deps - the domain service.
 * @returns {import('node:http').RequestListener & object} a `WebRoute`.
 */
export function makeRoute(deps) {
  const { service } = deps

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
    const query = url.searchParams

    try {
      if (route === '/month' && method === 'GET') {
        writeJson(response, 200, await service.month({
          month: query.get('month') ?? undefined,
          agent: query.get('agent') ?? undefined,
          force: query.get('force') === '1',
        }))
        return
      }
      if (route === '/range' && method === 'GET') {
        writeJson(response, 200, await service.range({
          from: query.get('from') ?? undefined,
          to: query.get('to') ?? undefined,
          agent: query.get('agent') ?? undefined,
          force: query.get('force') === '1',
        }))
        return
      }
      if (route === '/sources' && method === 'GET') {
        writeJson(response, 200, await service.sources({ force: query.get('force') === '1' }))
        return
      }
      writeJson(response, 404, { error: `no such endpoint: ${method} ${route}` })
    } catch (error) {
      writeJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
    }
  }

  return { kind: 'prefix', path: API_PREFIX, handler }
}
