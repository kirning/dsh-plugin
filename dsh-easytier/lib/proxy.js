/**
 * A tiny HTTP(S) client that can tunnel through a proxy.
 *
 * The plugin ships with no dependencies, and Node's built-in `fetch` cannot be
 * pointed at a proxy at runtime, so this module speaks the two proxy protocols
 * people actually have on their machine: **SOCKS5** (the default for local
 * clients such as Clash, v2rayN or Shadowsocks) and **HTTP CONNECT** (the
 * corporate proxy shape). The user only types `ip:port`; the protocol is
 * discovered by trying SOCKS5 first and falling back to HTTP CONNECT, which is
 * the order the two differ in a detectable way: a SOCKS5 greeting is a binary
 * frame an HTTP proxy never answers the way SOCKS5 needs, and vice versa.
 *
 * Only what the installer needs is implemented: `GET` with redirects, streamed
 * bodies (content-length, chunked, or read-to-close), and cancellation.
 *
 * @module dsh-easytier/lib/proxy
 */

import { connect as netConnect } from 'node:net'
import { connect as tlsConnect } from 'node:tls'
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'

/** Sent to GitHub and to the proxy. */
const USER_AGENT = 'dsh-easytier (+https://github.com/EasyTier/EasyTier)'

/** How many redirects one request may follow. */
const MAX_REDIRECTS = 5

/**
 * Budget for a proxy handshake. It exists because the protocol is discovered by
 * trying SOCKS5 first: an HTTP-only proxy does not answer a SOCKS5 greeting at
 * all (it waits for an HTTP request line), so without a deadline the first
 * attempt would hang instead of falling back.
 */
const HANDSHAKE_TIMEOUT_MS = 8000

/** Proxy failures carry a stable code so the panel can explain what broke. */
export class ProxyError extends Error {
  /**
   * @param {string} message - what went wrong, user-facing.
   * @param {string} [code] - `invalid_proxy`, `proxy_failed`, `proxy_closed`, `bad_response`, `http_status`.
   */
  constructor(message, code = 'proxy_error') {
    super(message)
    this.name = 'ProxyError'
    this.code = code
  }
}

/**
 * Parse what the user typed into a proxy endpoint.
 *
 * Accepts `ip:port`, `host:port`, `[::1]:port`, and the same with an optional
 * `socks5://` or `http://` prefix (which pins the protocol instead of trying
 * both). Credentials in the URL form are dropped: neither protocol branch
 * implements authentication, and guessing would fail later and more confusingly.
 *
 * @param {string} input - raw text from the panel.
 * @returns {{host: string, port: number, protocol: 'auto'|'socks5'|'http', label: string}} endpoint.
 */
export function parseProxy(input) {
  const text = String(input ?? '').trim()
  if (text === '') throw new ProxyError('no proxy address was given', 'invalid_proxy')

  let rest = text
  let protocol = 'auto'
  const scheme = /^(socks5h?|socks|http|https):\/\//i.exec(rest)
  if (scheme !== null) {
    protocol = scheme[1].toLowerCase().startsWith('socks') ? 'socks5' : 'http'
    rest = rest.slice(scheme[0].length)
  }
  rest = rest.replace(/\/+$/, '')
  const at = rest.lastIndexOf('@')
  if (at >= 0) rest = rest.slice(at + 1)

  let host
  let portText
  if (rest.startsWith('[')) {
    const close = rest.indexOf(']')
    if (close < 0) throw new ProxyError(`"${text}" is not a valid address: the IPv6 bracket is not closed`, 'invalid_proxy')
    host = rest.slice(1, close)
    const tail = rest.slice(close + 1)
    if (!tail.startsWith(':')) {
      throw new ProxyError(`"${text}" needs a port, for example 127.0.0.1:7890`, 'invalid_proxy')
    }
    portText = tail.slice(1)
  } else {
    const colon = rest.lastIndexOf(':')
    if (colon <= 0) {
      throw new ProxyError(`"${text}" needs a port, for example 127.0.0.1:7890`, 'invalid_proxy')
    }
    host = rest.slice(0, colon)
    portText = rest.slice(colon + 1)
  }

  const port = Number(portText)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new ProxyError(`"${text}" has an invalid port: ${portText}`, 'invalid_proxy')
  }
  if (host === '' || /\s/.test(host)) {
    throw new ProxyError(`"${text}" has an invalid host: ${host}`, 'invalid_proxy')
  }
  return { host, port, protocol, label: `${host}:${port}` }
}

/**
 * One buffered reader over a socket: handshakes and response framing both use
 * it, so no byte is lost between phases.
 */
class SocketReader {
  /** @param {import('node:net').Socket} socket - socket to read from. */
  constructor(socket) {
    this.socket = socket
    this.buffer = Buffer.alloc(0)
    this.pending = null
    this.ended = false
    this.error = null
    this.onData = (chunk) => {
      if (this.pending !== null) {
        const resolve = this.pending
        this.pending = null
        resolve({ chunk })
      } else {
        this.buffer = Buffer.concat([this.buffer, chunk])
      }
    }
    this.onEnd = () => {
      this.ended = true
      if (this.pending !== null) {
        const resolve = this.pending
        this.pending = null
        resolve({ chunk: null })
      }
    }
    this.onError = (error) => {
      this.error = error
      if (this.pending !== null) {
        const resolve = this.pending
        this.pending = null
        resolve({ error })
      }
    }
    socket.on('data', this.onData)
    socket.on('end', this.onEnd)
    socket.on('close', this.onEnd)
    socket.on('error', this.onError)
  }

  /** Detach and hand any unread bytes back to the socket. */
  release() {
    this.socket.off('data', this.onData)
    this.socket.off('end', this.onEnd)
    this.socket.off('close', this.onEnd)
    this.socket.off('error', this.onError)
    if (this.buffer.length > 0) this.socket.unshift(this.buffer)
    this.buffer = Buffer.alloc(0)
  }

  /** Read more bytes into the buffer; false once the socket is finished. */
  async fill() {
    if (this.error !== null) throw this.error
    if (this.ended) return false
    const result = await new Promise((resolve) => {
      this.pending = resolve
    })
    if (result.error !== undefined) throw result.error
    if (result.chunk === null) {
      this.ended = true
      return false
    }
    this.buffer = Buffer.concat([this.buffer, result.chunk])
    return true
  }

  /** @returns {Promise<Buffer|null>} the next buffered or incoming chunk. */
  async next() {
    if (this.buffer.length === 0 && !(await this.fill())) return null
    const chunk = this.buffer
    this.buffer = Buffer.alloc(0)
    return chunk
  }

  /** @param {number} count - exact byte count. @returns {Promise<Buffer>} that many bytes. */
  async read(count) {
    while (this.buffer.length < count) {
      if (!(await this.fill())) throw new ProxyError('the proxy closed the connection during the handshake', 'proxy_closed')
    }
    const out = this.buffer.subarray(0, count)
    this.buffer = this.buffer.subarray(count)
    return out
  }

  /** @param {string} needle - terminator. @returns {Promise<{head: Buffer, rest: Buffer}>} bytes before it. */
  async readUntil(needle) {
    for (;;) {
      const index = this.buffer.indexOf(needle)
      if (index >= 0) {
        const head = this.buffer.subarray(0, index)
        this.buffer = this.buffer.subarray(index + needle.length)
        return { head }
      }
      if (!(await this.fill())) throw new ProxyError('the proxy closed the connection before answering', 'proxy_closed')
    }
  }
}

/** Open a TCP connection, rejecting on error or abort. */
function connectTcp(host, port, signal) {
  return new Promise((resolve, reject) => {
    const socket = netConnect({ host, port })
    const cleanup = () => {
      socket.off('error', onError)
      socket.off('connect', onConnect)
      signal?.removeEventListener?.('abort', onAbort)
    }
    const onError = (error) => {
      cleanup()
      reject(new ProxyError(`cannot connect to ${host}:${port} (${error.message})`, 'proxy_failed'))
    }
    const onConnect = () => {
      cleanup()
      resolve(socket)
    }
    const onAbort = () => {
      cleanup()
      socket.destroy()
      reject(new ProxyError('initialization cancelled', 'cancelled'))
    }
    socket.once('error', onError)
    socket.once('connect', onConnect)
    signal?.addEventListener?.('abort', onAbort, { once: true })
  })
}

/** Perform the SOCKS5 no-auth handshake and ask it for `host:port`. */
async function socks5Connect(socket, host, port) {
  const reader = new SocketReader(socket)
  try {
    socket.write(Buffer.from([0x05, 0x01, 0x00]))
    const greeting = await reader.read(2)
    if (greeting[0] !== 0x05) throw new ProxyError('the proxy did not answer as SOCKS5', 'proxy_failed')
    if (greeting[1] !== 0x00) throw new ProxyError(`the SOCKS5 proxy wants authentication this plugin does not support (method ${greeting[1]})`, 'proxy_failed')

    const address = addressFor(host)
    const request = Buffer.alloc(3 + address.length + 2)
    request[0] = 0x05
    request[1] = 0x01
    request[2] = 0x00
    address.copy(request, 3)
    request.writeUInt16BE(port, 3 + address.length)
    socket.write(request)

    const reply = await reader.read(4)
    if (reply[0] !== 0x05) throw new ProxyError('the proxy did not answer as SOCKS5', 'proxy_failed')
    if (reply[1] !== 0x00) {
      const reasons = { 1: 'general failure', 2: 'connection not allowed', 3: 'network unreachable', 4: 'host unreachable', 5: 'connection refused', 6: 'TTL expired', 7: 'command not supported', 8: 'address type not supported' }
      throw new ProxyError(`the SOCKS5 proxy refused the tunnel: ${reasons[reply[1]] ?? `error ${reply[1]}`}`, 'proxy_failed')
    }
    const family = reply[3]
    if (family === 0x01) await reader.read(4)
    else if (family === 0x04) await reader.read(16)
    else if (family === 0x03) {
      const length = await reader.read(1)
      await reader.read(length[0])
    } else throw new ProxyError('the SOCKS5 proxy answered with an unknown address type', 'proxy_failed')
    await reader.read(2)
  } finally {
    reader.release()
  }
}

/** Encode `host` as a SOCKS5 address (ATYP + body). */
function addressFor(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return Buffer.from([0x01, ...host.split('.').map(Number)])
  }
  if (host.includes(':')) {
    const groups = expandIpv6(host)
    if (groups !== null) return Buffer.from([0x04, ...groups])
  }
  const name = Buffer.from(host, 'utf8')
  if (name.length > 255) throw new ProxyError(`host name is too long for SOCKS5: ${host}`, 'proxy_failed')
  return Buffer.from([0x03, name.length, ...name])
}

/** Expand a textual IPv6 address into its 16 bytes, or null when it is not one. */
function expandIpv6(host) {
  const [left, right] = host.split('::')
  const head = left === '' ? [] : left.split(':')
  const tail = right === undefined ? [] : right === '' ? [] : right.split(':')
  if (right === undefined && head.length !== 8) return null
  const groups = right === undefined ? head : [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill('0'), ...tail]
  if (groups.length !== 8) return null
  const bytes = []
  for (const group of groups) {
    const value = Number.parseInt(group === '' ? '0' : group, 16)
    if (!Number.isFinite(value)) return null
    bytes.push((value >> 8) & 0xff, value & 0xff)
  }
  return bytes
}

/** Ask an HTTP proxy for a CONNECT tunnel. */
async function httpConnect(socket, host, port) {
  const reader = new SocketReader(socket)
  try {
    const authority = host.includes(':') ? `[${host}]:${port}` : `${host}:${port}`
    socket.write(
      `CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\nUser-Agent: ${USER_AGENT}\r\nProxy-Connection: keep-alive\r\n\r\n`,
    )
    const { head } = await reader.readUntil('\r\n\r\n')
    const status = /^HTTP\/\d\.\d (\d{3})/.exec(head.toString('latin1'))
    if (status === null) throw new ProxyError('the proxy did not answer with HTTP', 'proxy_failed')
    if (status[1] !== '200') {
      throw new ProxyError(`the HTTP proxy refused CONNECT with ${status[1]}`, 'proxy_failed')
    }
  } finally {
    reader.release()
  }
}

/** Wrap a tunnelled socket in TLS. */
function wrapTls(socket, host, signal) {
  return new Promise((resolve, reject) => {
    const secure = tlsConnect({ socket, servername: host, ALPNProtocols: ['http/1.1'] })
    const cleanup = () => {
      secure.off('error', onError)
      secure.off('secureConnect', onConnect)
      signal?.removeEventListener?.('abort', onAbort)
    }
    const onError = (error) => {
      cleanup()
      reject(new ProxyError(`TLS handshake with ${host} failed through the proxy (${error.message})`, 'proxy_failed'))
    }
    const onConnect = () => {
      cleanup()
      resolve(secure)
    }
    const onAbort = () => {
      cleanup()
      secure.destroy()
      reject(new ProxyError('initialization cancelled', 'cancelled'))
    }
    secure.once('error', onError)
    secure.once('secureConnect', onConnect)
    signal?.addEventListener?.('abort', onAbort, { once: true })
  })
}

/** Read and parse a response head from a (possibly TLS) socket. */
async function readHead(reader) {
  const { head } = await reader.readUntil('\r\n\r\n')
  const text = head.toString('latin1')
  const lines = text.split('\r\n')
  const status = /^HTTP\/\d\.\d (\d{3})/.exec(lines[0])
  if (status === null) throw new ProxyError(`unexpected response from the server: ${lines[0].slice(0, 80)}`, 'bad_response')
  /** @type {Record<string, string>} */
  const headers = {}
  for (const line of lines.slice(1)) {
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    const name = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()
    headers[name] = headers[name] === undefined ? value : `${headers[name]}, ${value}`
  }
  return { status: Number(status[1]), headers }
}

/** Content-length body. */
async function* byLength(reader, length) {
  let remaining = length
  while (remaining > 0) {
    const chunk = await reader.next()
    if (chunk === null) return
    const piece = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk
    remaining -= piece.length
    if (chunk.length > piece.length) reader.buffer = Buffer.concat([chunk.subarray(piece.length), reader.buffer])
    yield piece
  }
}

/** Read every remaining byte. */
async function* untilClose(reader) {
  for (;;) {
    const chunk = await reader.next()
    if (chunk === null) return
    yield chunk
  }
}

/** Decode `transfer-encoding: chunked`. */
async function* byChunks(reader) {
  let pending = Buffer.alloc(0)
  const takeLine = async () => {
    for (;;) {
      const index = pending.indexOf('\r\n')
      if (index >= 0) {
        const line = pending.subarray(0, index).toString('latin1')
        pending = pending.subarray(index + 2)
        return line
      }
      const chunk = await reader.next()
      if (chunk === null) return null
      pending = Buffer.concat([pending, chunk])
    }
  }
  const take = async (count) => {
    while (pending.length < count) {
      const chunk = await reader.next()
      if (chunk === null) return null
      pending = Buffer.concat([pending, chunk])
    }
    const out = pending.subarray(0, count)
    pending = pending.subarray(count)
    return out
  }
  for (;;) {
    const line = await takeLine()
    if (line === null) return
    const size = Number.parseInt(line.split(';')[0].trim(), 16)
    if (!Number.isFinite(size)) throw new ProxyError('the server sent a malformed chunked response', 'bad_response')
    if (size === 0) return
    const body = await take(size)
    if (body === null) throw new ProxyError('the chunked response ended early', 'bad_response')
    yield body
    await take(2)
  }
}

/** One GET through an established tunnel; returns the raw body stream. */
async function requestVia(url, proxy, protocol, signal, handshakeTimeoutMs) {
  const target = new URL(url)
  const secure = target.protocol === 'https:'
  const port = Number(target.port === '' ? (secure ? 443 : 80) : target.port)
  const host = target.hostname

  const socket = await connectTcp(proxy.host, proxy.port, signal)
  const timer = setTimeout(() => {
    socket.destroy(new ProxyError(`the proxy did not answer the ${protocol === 'socks5' ? 'SOCKS5' : 'HTTP CONNECT'} handshake within ${handshakeTimeoutMs} ms`, 'proxy_failed'))
  }, handshakeTimeoutMs)
  timer.unref?.()

  try {
    if (protocol === 'socks5') await socks5Connect(socket, host, port)
    else await httpConnect(socket, host, port)
  } catch (error) {
    clearTimeout(timer)
    socket.destroy()
    throw error
  }

  const stream = secure ? await wrapTls(socket, host, signal) : socket
  const reader = new SocketReader(stream)
  const onAbort = () => {
    stream.destroy()
  }
  signal?.addEventListener?.('abort', onAbort, { once: true })

  stream.write(
    `GET ${target.pathname}${target.search} HTTP/1.1\r\nHost: ${target.host}\r\nUser-Agent: ${USER_AGENT}\r\nAccept: application/octet-stream, application/vnd.github+json\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`,
  )

  const head = await readHead(reader)
  clearTimeout(timer)
  const { status, headers } = head
  const location = headers.location

  if (status >= 300 && status < 400 && location !== undefined) {
    stream.destroy()
    return { status, headers, redirect: resolveLocation(location, target), stream: null, total: 0 }
  }
  if (status >= 400) {
    stream.destroy()
    throw new ProxyError(`the server answered HTTP ${status} for ${url}`, 'http_status')
  }

  const transfer = String(headers['transfer-encoding'] ?? '').toLowerCase()
  const length = Number(headers['content-length'] ?? -1)
  const encoding = String(headers['content-encoding'] ?? '').toLowerCase()
  const source = transfer.includes('chunked')
    ? byChunks(reader)
    : Number.isFinite(length) && length >= 0
      ? byLength(reader, length)
      : untilClose(reader)
  let body = Readable.from(source)
  if (encoding === 'gzip' || encoding === 'x-gzip') body = body.pipe(createGunzip())
  body.on('close', () => {
    signal?.removeEventListener?.('abort', onAbort)
  })
  return { status, headers, redirect: null, stream: body, total: encoding === '' && length > 0 ? length : 0 }
}

/** Resolve a redirect target against the request it answered. */
function resolveLocation(location, base) {
  try {
    return new URL(location, base).href
  } catch {
    return null
  }
}

/**
 * Download `url` through `proxy`, following redirects.
 *
 * Try protocols in the order SOCKS5 then HTTP CONNECT unless the user pinned
 * one with a `socks5://` or `http://` prefix.
 *
 * @param {string} url - absolute http(s) URL.
 * @param {{proxy: {host: string, port: number, protocol: 'auto'|'socks5'|'http', label: string},
 *   signal?: AbortSignal, handshakeTimeoutMs?: number,
 *   onAttempt?: (attempt: {protocol: string, error: Error}) => void}} options - request options.
 * @returns {Promise<{stream: import('node:stream').Readable, total: number, protocol: string, url: string}>} response.
 */
export async function openStream(url, options) {
  const { proxy, signal, onAttempt } = options
  const handshakeTimeoutMs = Number.isFinite(options.handshakeTimeoutMs) ? Number(options.handshakeTimeoutMs) : HANDSHAKE_TIMEOUT_MS
  const protocols = proxy.protocol === 'auto' ? ['socks5', 'http'] : [proxy.protocol]
  let lastError = null
  for (const protocol of protocols) {
    try {
      let current = url
      for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        const result = await requestVia(current, proxy, protocol, signal, handshakeTimeoutMs)
        if (result.redirect === null) {
          return { stream: result.stream, total: result.total, protocol, url: current }
        }
        current = result.redirect
        if (hop === MAX_REDIRECTS) {
          throw new ProxyError(`too many redirects while downloading ${url}`, 'too_many_redirects')
        }
      }
      throw new ProxyError(`could not download ${url}`, 'proxy_failed')
    } catch (error) {
      lastError = error
      if (error?.code === 'cancelled') throw error
      if (onAttempt !== undefined) {
        try {
          onAttempt({ protocol, error })
        } catch {
          /* a logging callback must never break the transfer */
        }
      }
    }
  }
  const reason = lastError === null ? 'unknown error' : lastError.message
  throw new ProxyError(`could not reach the internet through ${proxy.label}: ${reason}`, 'proxy_failed')
}
