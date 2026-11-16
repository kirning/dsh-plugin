/**
 * Minimal MCP Streamable-HTTP client plus its endpoint discovery.
 *
 * The DevOps data this plugin shows is only reachable through the
 * `devops-mcp-agile` MCP server: its PAT lives in the URL query string, so the
 * call has to happen in the host process. Rather than borrowing the
 * `open_api_http_request` tool from `ctx.tools` (whose `execute` needs a full
 * turn execution context), this module speaks the wire protocol itself:
 * `initialize` → `notifications/initialized` → `tools/call`.
 *
 * The endpoint is discovered from the profile patch files the DSH loader
 * composes, so a rotated PAT is picked up without touching this plugin.
 *
 * @module dsh-devops-tasks/lib/mcp
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** Default MCP server name used by the DevOps profile row. */
export const DEFAULT_SERVER_NAME = 'devops-mcp-agile'

/** How long a discovered endpoint stays fresh before the files are re-read. */
const DISCOVERY_TTL_MS = 60_000

/** How long one MCP handshake stays valid. */
const HANDSHAKE_TTL_MS = 10 * 60_000

/** Per-request ceiling for a single JSON-RPC round trip. */
const REQUEST_TIMEOUT_MS = 60_000

/** The DSH home directory, where profile patch files live. */
export function dshHome() {
  const explicit = process.env.DSH_HOME
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  return path.join(os.homedir(), '.dsh')
}

/**
 * Extract one server's `url:` from a loader patch file.
 *
 * The patch is YAML, but the shapes we care about are narrow: a list item
 * `- id: <name>` whose block (deeper indentation) carries `config.url`. A real
 * YAML parser is not worth a runtime dependency here; a line walk with
 * indentation rules is enough and fails closed on anything unexpected.
 *
 * @param {string} text - patch file contents.
 * @param {string} serverName - the `- id:` to look for.
 * @returns {string|null} absolute http(s) URL, or null when absent.
 */
export function endpointFromPatch(text, serverName) {
  const lines = text.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const head = /^(\s*)-\s+id:\s*['"]?([^'"\s#]+)['"]?\s*(?:#.*)?$/.exec(lines[index])
    if (head === null || head[2] !== serverName) continue
    const itemIndent = head[1].length
    for (let scan = index + 1; scan < lines.length; scan += 1) {
      const line = lines[scan]
      if (line.trim() === '') continue
      const sibling = /^(\s*)-\s+\S/.exec(line)
      if (sibling !== null && sibling[1].length <= itemIndent) break
      const url = /^\s+url:\s*['"]?(https?:\/\/[^'"\s]+)['"]?\s*(?:#.*)?$/.exec(line)
      if (url !== null) return url[1]
    }
  }
  return null
}

/** Every patch file that could carry an MCP server row, most specific first. */
function candidatePatchFiles() {
  const home = dshHome()
  const files = [path.join(home, 'cordis.patch.yml'), path.join(home, 'cordis.yml')]
  const profilesDir = path.join(home, 'profiles')
  const profile = process.env.DSH_PROFILE
  if (typeof profile === 'string' && profile.trim() !== '') {
    files.unshift(path.join(profilesDir, profile.trim(), 'cordis.patch.yml'))
  }
  let names = []
  try {
    names = fs.readdirSync(profilesDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
  } catch {
    names = []
  }
  for (const name of names) {
    files.push(path.join(profilesDir, name, 'cordis.patch.yml'))
    files.push(path.join(profilesDir, name, 'cordis.yml'))
  }
  return files
}

/**
 * Discover the MCP endpoint URL for one server name.
 *
 * Order: explicit plugin config → `DSH_DEVOPS_MCP_URL` → profile patch files.
 *
 * @param {{serverName?: string, endpoint?: string, cacheMs?: number}} [options] - overrides.
 * @returns {{url: string|null, source: string, error?: string}} discovery result.
 */
export function discoverEndpoint(options = {}) {
  const serverName = options.serverName ?? DEFAULT_SERVER_NAME
  const cacheMs = options.cacheMs ?? DISCOVERY_TTL_MS
  const key = `${serverName}\u0000${cacheMs}`
  const now = Date.now()
  const cached = DISCOVERY_CACHE.get(key)
  if (cached !== undefined && now - cached.at < cacheMs) return cached.value

  const resolved = resolveEndpoint({ serverName, endpoint: options.endpoint })
  DISCOVERY_CACHE.set(key, { at: now, value: resolved })
  return resolved
}

/** Discovery cache (server name → last result). */
const DISCOVERY_CACHE = new Map()

/** Uncached discovery implementation. */
function resolveEndpoint({ serverName, endpoint }) {
  if (typeof endpoint === 'string' && /^https?:\/\//.test(endpoint.trim())) {
    return { url: endpoint.trim(), source: 'config' }
  }
  const fromEnv = process.env.DSH_DEVOPS_MCP_URL
  if (typeof fromEnv === 'string' && /^https?:\/\//.test(fromEnv.trim())) {
    return { url: fromEnv.trim(), source: 'env:DSH_DEVOPS_MCP_URL' }
  }
  const failures = []
  for (const file of candidatePatchFiles()) {
    let text = ''
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const url = endpointFromPatch(text, serverName)
    if (url !== null) return { url, source: file }
    if (text.includes(serverName)) failures.push(file)
  }
  return {
    url: null,
    source: 'none',
    error: failures.length > 0
      ? `找到 ${serverName} 配置行但没有 url：${failures.join(', ')}`
      : `没有在任何 profile 配置里找到 MCP 服务 ${serverName}；请确认「设置 → MCP 服务」里已添加该服务，或在本插件行配置 endpoint。`,
  }
}

/**
 * One JSON-RPC client bound to a single Streamable-HTTP endpoint.
 *
 * The server this plugin targets answers each POST with either a JSON body or a
 * one-shot SSE stream, and does not require an `Mcp-Session-Id`; both response
 * shapes and session headers are handled so a stricter server still works.
 */
export class McpHttpClient {
  /**
   * @param {{endpoint: string, name?: string}} options - endpoint and client identity.
   */
  constructor({ endpoint, name = 'dsh-devops-tasks' }) {
    this.endpoint = endpoint
    this.name = name
    this.sequence = 0
    this.sessionId = null
    this.readyAt = 0
    this.readyPromise = null
    this.serverInfo = null
    this.tools = null
  }

  /** Perform the handshake once per TTL, coalescing concurrent callers. */
  async ensureReady() {
    if (this.readyAt !== 0 && Date.now() - this.readyAt < HANDSHAKE_TTL_MS) return
    if (this.readyPromise !== null) await this.readyPromise
    if (this.readyAt !== 0 && Date.now() - this.readyAt < HANDSHAKE_TTL_MS) return
    this.readyAt = 0
    this.readyPromise = (async () => {
      const result = await this.rpc('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: this.name, version: '0.1.0' },
      })
      this.serverInfo = result?.serverInfo ?? null
      await this.rpc('notifications/initialized', undefined, { notification: true })
      // This server answers the FIRST `tools/call` of a fresh session with an
      // empty digest (the platform call is dropped while the session warms up),
      // so absorb that one call here instead of letting it look like "no data".
      const listing = await this.rpc('tools/list', {})
      this.tools = Array.isArray(listing?.tools) ? listing.tools.map(tool => tool?.name).filter(name => typeof name === 'string') : []
      this.readyAt = Date.now()
    })()
    try {
      await this.readyPromise
    } finally {
      this.readyPromise = null
    }
  }

  /**
   * One JSON-RPC exchange.
   * @param {string} method - JSON-RPC method.
   * @param {unknown} [params] - method parameters.
   * @param {{notification?: boolean}} [options] - notification mode.
   * @returns {Promise<any>} the `result` field.
   */
  async rpc(method, params, options = {}) {
    const notification = options.notification === true
    const id = notification ? undefined : ++this.sequence
    const body = JSON.stringify(notification
      ? { jsonrpc: '2.0', method, ...(params === undefined ? {} : { params }) }
      : { jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) })
    const headers = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    }
    if (this.sessionId !== null) headers['mcp-session-id'] = this.sessionId
    const startedAt = Date.now()
    let response
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      debugLog(`rpc ${method} failed after ${Date.now() - startedAt}ms: ${messageOf(error)}`)
      // Force a fresh handshake on the next call: the socket is not reusable.
      this.sessionId = null
      this.readyAt = 0
      throw new Error(`MCP 请求失败（${method}）：${messageOf(error)}`)
    }
    const session = response.headers.get('mcp-session-id')
    if (session !== null && session !== '') this.sessionId = session
    const raw = await response.text()
    debugLog(`rpc ${method} ${response.status} ${Date.now() - startedAt}ms (${raw.length}B)`)
    if (!response.ok) {
      throw new Error(`MCP ${method} 返回 HTTP ${response.status}：${raw.slice(0, 300)}`)
    }
    if (notification) return undefined
    const payload = decodeBody(raw, response.headers.get('content-type'))
    if (payload === null) throw new Error(`MCP ${method} 返回空响应`)
    if (payload.error !== undefined) {
      throw new Error(`MCP ${method} 出错：${payload.error?.message ?? JSON.stringify(payload.error).slice(0, 300)}`)
    }
    return payload.result ?? payload
  }

  /**
   * Call one MCP tool and return its text payload.
   * @param {string} name - tool name.
   * @param {Record<string, unknown>} args - tool arguments.
   * @returns {Promise<string>} concatenated text content.
   */
  async callTool(name, args) {
    await this.ensureReady()
    if (Array.isArray(this.tools) && this.tools.length > 0 && !this.tools.includes(name)) {
      throw new Error(`DevOps MCP 服务没有工具 ${name}（可用：${this.tools.join('、')}）`)
    }
    let result
    try {
      result = await this.rpc('tools/call', { name, arguments: args })
    } catch (error) {
      // The platform proxy closes idle keep-alive sockets, and a reused dead
      // socket surfaces here as ECONNRESET (after up to 19s). Drop the session
      // and retry once on a fresh connection instead of failing the bucket.
      if (!isTransportError(error)) throw error
      debugLog(`tools/call ${name} transport error, retrying: ${messageOf(error)}`)
      this.sessionId = null
      this.readyAt = 0
      await this.ensureReady()
      result = await this.rpc('tools/call', { name, arguments: args })
    }
    const content = Array.isArray(result?.content) ? result.content : []
    const text = content
      .map(part => (part?.type === 'text' && typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim()
    if (result?.isError === true) throw new Error(text === '' ? `${name} 调用失败` : text.slice(0, 500))
    if (text === '') {
      const structured = result?.structuredContent
      if (structured !== undefined) return JSON.stringify(structured)
      throw new Error(`${name} 没有返回内容`)
    }
    return text
  }
}

/** Whether a failure looks like a dead connection rather than a platform error. */
function isTransportError(error) {
  const text = `${error instanceof Error ? error.message : String(error)} ${error instanceof Error && error.cause instanceof Error ? error.cause.message : ''}`
  return /fetch failed|ECONNRESET|ECONNREFUSED|socket hang up|other side closed|terminated|UND_ERR/i.test(text)
}

/** Decode a JSON or SSE response body. */
function decodeBody(raw, contentType) {
  if (raw.trim() === '') return null
  if (typeof contentType === 'string' && contentType.includes('text/event-stream')) {
    const chunks = []
    for (const line of raw.split(/\r?\n/)) {
      if (line.startsWith('data:')) chunks.push(line.slice(5).trim())
    }
    const joined = chunks.filter(part => part !== '').join('\n')
    if (joined === '') return null
    try {
      return JSON.parse(joined)
    } catch {
      return null
    }
  }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Error text without leaking the endpoint (it carries the PAT). */
function messageOf(error) {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? error.cause.message : ''
    return cause === '' ? error.message : `${error.message} (${cause})`
  }
  return String(error)
}

/**
 * Diagnostics switch: `DSH_DEVOPS_TASKS_DEBUG=1` prints per-request timings to
 * the host log. Off by default so a healthy snapshot stays silent.
 */
export function debugLog(line) {
  if (process.env.DSH_DEVOPS_TASKS_DEBUG !== '1') return
  console.error(`[dsh-devops-tasks] ${line}`)
}
