/**
 * The `/api/dsh-easytier` route family.
 *
 * One prefix route dispatches every panel request, so the surface is easy to
 * audit in one place. Each endpoint is a thin adapter over `EasytierService`:
 * parse query/body, call the shared operation, map a failure to a status code.
 *
 * Every request carries a loopback trust fence plus browser same-origin
 * markers. These endpoints drive VPN configuration and can start or stop a
 * system service, so a LAN-exposed dsh web deployment must not serve them.
 *
 * @module dsh-easytier/lib/routes
 */

/** Route prefix owned by this plugin. */
export const API_PREFIX = '/api/dsh-easytier'

/** Cap on JSON request bodies. */
const MAX_JSON_BODY_BYTES = 64 * 1024

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

/** Read a bounded JSON body. */
async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const buffer = chunk
    size += buffer.length
    if (size > MAX_JSON_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  if (chunks.length === 0) return {}
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return parsed !== null && typeof parsed === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * Build the prefix route.
 * @param {{service: import('./easytier.js').EasytierService}} deps - the domain service.
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
    const instance = query.get('instance') ?? undefined

    try {
      // ------------------------------------------------------------ snapshot
      if (route === '/snapshot' && method === 'GET') {
        writeJson(response, 200, await service.snapshot({ force: query.get('force') === '1' }))
        return
      }
      if (route === '/refresh' && method === 'POST') {
        writeJson(response, 200, await service.snapshot({ force: true }))
        return
      }

      // ----------------------------------------------------------- terminals
      if (route === '/terminals' && method === 'GET') {
        writeJson(response, 200, await service.terminals(instance))
        return
      }
      if (route === '/info' && method === 'GET') {
        writeJson(response, 200, await service.info(instance))
        return
      }

      // ------------------------------------------------------- port forwards
      if (route === '/port-forwards') {
        if (method === 'GET') {
          writeJson(response, 200, await service.portForwards(instance))
          return
        }
        const body = await readJsonBody(request)
        if (body === undefined) {
          writeJson(response, 400, { error: 'invalid JSON body' })
          return
        }
        if (method === 'POST') {
          writeJson(response, 200, await service.addPortForward(instanceIdOf(body, instance), body))
          return
        }
        if (method === 'DELETE') {
          writeJson(response, 200, await service.removePortForward(instanceIdOf(body, instance), body))
          return
        }
        writeJson(response, 405, { error: `method not allowed: ${method}` })
        return
      }

      // ----------------------------------------------------------- whitelist
      if (route === '/whitelist') {
        if (method === 'GET') {
          writeJson(response, 200, await service.whitelist(instance))
          return
        }
        if (method === 'POST' || method === 'DELETE') {
          const body = await readJsonBody(request)
          if (body === undefined) {
            writeJson(response, 400, { error: 'invalid JSON body' })
            return
          }
          const kind = String(body.kind ?? query.get('kind') ?? 'tcp')
          if (method === 'DELETE') {
            writeJson(response, 200, await service.clearWhitelist(instanceIdOf(body, instance), { kind }))
            return
          }
          writeJson(response, 200, await service.setWhitelist(instanceIdOf(body, instance), { kind, ports: body.ports }))
          return
        }
        writeJson(response, 405, { error: `method not allowed: ${method}` })
        return
      }

      // --------------------------------------------------------- credentials
      if (route === '/credentials') {
        if (method === 'GET') {
          writeJson(response, 200, await service.credentials(instance))
          return
        }
        const body = await readJsonBody(request)
        if (body === undefined) {
          writeJson(response, 400, { error: 'invalid JSON body' })
          return
        }
        if (method === 'POST') {
          writeJson(response, 200, await service.generateCredential(instanceIdOf(body, instance), body))
          return
        }
        if (method === 'DELETE') {
          writeJson(response, 200, await service.revokeCredential(instanceIdOf(body, instance), body))
          return
        }
        writeJson(response, 405, { error: `method not allowed: ${method}` })
        return
      }

      // ----------------------------------------------------------- connectors
      if (route === '/connectors') {
        if (method === 'GET') {
          writeJson(response, 200, await service.connectors(instance))
          return
        }
        const body = await readJsonBody(request)
        if (body === undefined) {
          writeJson(response, 400, { error: 'invalid JSON body' })
          return
        }
        if (method === 'POST') {
          writeJson(response, 200, await service.addConnector(instanceIdOf(body, instance), body))
          return
        }
        if (method === 'DELETE') {
          writeJson(response, 200, await service.removeConnector(instanceIdOf(body, instance), body))
          return
        }
        writeJson(response, 405, { error: `method not allowed: ${method}` })
        return
      }

      // --------------------------------------------------------------- probes
      if (route === '/probe' && method === 'POST') {
        const body = await readJsonBody(request)
        if (body === undefined) {
          writeJson(response, 400, { error: 'invalid JSON body' })
          return
        }
        writeJson(response, 200, await service.probe(instanceIdOf(body, instance), body))
        return
      }

      // -------------------------------------------------------------- service
      if (route === '/service') {
        if (method === 'GET') {
          writeJson(response, 200, await service.serviceAction(instance, { action: 'status' }))
          return
        }
        if (method === 'POST') {
          const body = await readJsonBody(request)
          if (body === undefined) {
            writeJson(response, 400, { error: 'invalid JSON body' })
            return
          }
          writeJson(response, 200, await service.serviceAction(instanceIdOf(body, instance), body))
          return
        }
        writeJson(response, 405, { error: `method not allowed: ${method}` })
        return
      }

      // ---------------------------------------------------------------- config
      if (route === '/config') {
        if (method === 'GET') {
          writeJson(response, 200, await service.readConfig(instance))
          return
        }
        if (method === 'POST') {
          const body = await readJsonBody(request)
          if (body === undefined) {
            writeJson(response, 400, { error: 'invalid JSON body' })
            return
          }
          writeJson(response, 200, await service.writeConfig(instanceIdOf(body, instance), body))
          return
        }
        writeJson(response, 405, { error: `method not allowed: ${method}` })
        return
      }

      // ------------------------------------------------------------------- cli
      if (route === '/cli' && method === 'POST') {
        const body = await readJsonBody(request)
        if (body === undefined) {
          writeJson(response, 400, { error: 'invalid JSON body' })
          return
        }
        writeJson(response, 200, await service.runRaw(instanceIdOf(body, instance), body))
        return
      }

      writeJson(response, 404, { error: `no such endpoint: ${method} ${route}` })
    } catch (error) {
      const code = error !== null && typeof error === 'object' && typeof error.code === 'string' ? error.code : 'internal_error'
      const message = error instanceof Error ? error.message : String(error)
      const status = code === 'internal_error' ? 500 : 400
      writeJson(response, status, { error: message, code })
    }
  }

  return { kind: 'prefix', path: API_PREFIX, handler }
}

/** Instance id from a request body, falling back to the query string. */
function instanceIdOf(body, queryInstance) {
  const value = body.instanceId ?? body.instance
  if (typeof value === 'string' && value !== '') return value
  return queryInstance
}
