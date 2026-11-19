/**
 * Podman container listing and start/stop for the 「容器管理」 tab.
 *
 * The browser cannot read the container engine, so the host process runs
 * `podman ps --all --format json` and normalizes the output into the rows the
 * panel renders. The binary is resolved in this order: plugin config
 * `podmanPath`, `DSH_PODMAN_BIN`, the per-user Podman install, `/usr/bin`,
 * `/usr/local/bin`, and finally a bare `podman` looked up on PATH.
 *
 * Lifecycle support is start and stop only — never remove, prune, or an
 * arbitrary argument vector: the browser sends one container reference from the
 * list it was just shown, and it is validated here before podman sees it.
 *
 * @module dsh-devops-tasks/lib/containers
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

/** Longest a listing may take before it is reported as a failure. */
const TIMEOUT_MS = 20000

/** Longest a start/stop may take: `podman stop` waits out the grace period. */
const ACTION_TIMEOUT_MS = 120000

/** Cap the JSON read so a runaway `podman ps` cannot exhaust host memory. */
const MAX_BUFFER = 16 * 1024 * 1024

/**
 * What may be passed to podman as a container reference: a short id or a name.
 * Deliberately narrow — no spaces, no leading dash, no separators that could
 * be read as another flag.
 */
const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/

/** Install locations tried when `podman` is not configured. */
function defaultBinaries() {
  const local = process.env.LOCALAPPDATA
  const candidates = []
  if (typeof local === 'string' && local !== '') {
    candidates.push(path.join(local, 'Programs', 'Podman', 'podman.exe'))
  }
  candidates.push('/usr/bin/podman', '/usr/local/bin/podman')
  return candidates
}

/**
 * Which podman executable to run.
 * @param {string} [configured] - the plugin config's `podmanPath`.
 * @returns {string} an absolute path, or a bare name to be resolved on PATH.
 */
export function resolvePodman(configured) {
  if (typeof configured === 'string' && configured.trim() !== '') return configured.trim()
  const fromEnv = process.env.DSH_PODMAN_BIN
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  for (const candidate of defaultBinaries()) {
    if (existsSync(candidate)) return candidate
  }
  return 'podman'
}

/**
 * Whether a value is an acceptable container reference.
 * @param {unknown} value - candidate from the browser.
 * @returns {boolean} true when it may be handed to podman.
 */
export function isContainerReference(value) {
  return typeof value === 'string' && REFERENCE_PATTERN.test(value)
}

/** Run one command and collect its stdout. */
function run(file, args, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: MAX_BUFFER }, (error, stdout, stderr) => {
      if (error !== null && error !== undefined) {
        if (error.code === 'ENOENT') {
          reject(new Error(`没有找到 podman 命令（${file}）`))
          return
        }
        if (error.killed === true) {
          reject(new Error('podman 命令超时'))
          return
        }
        const detail = typeof stderr === 'string' && stderr.trim() !== '' ? stderr.trim() : error.message
        reject(new Error(detail.replace(/^Error:\s*/i, '')))
        return
      }
      resolve(typeof stdout === 'string' ? stdout : String(stdout))
    })
  })
}

/** Parse the JSON array podman prints, tolerating warnings before it. */
function parseJsonArray(text) {
  const trimmed = text.trim()
  if (trimmed === '') return []
  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    const start = trimmed.indexOf('[')
    const end = trimmed.lastIndexOf(']')
    if (start < 0 || end <= start) return []
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1))
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
}

/** First non-empty string of a list, joined. */
function nameOf(entry) {
  const names = Array.isArray(entry.Names) ? entry.Names.filter(name => typeof name === 'string' && name !== '') : []
  if (names.length > 0) return names.join(', ')
  return typeof entry.Id === 'string' ? entry.Id.slice(0, 12) : ''
}

/** `host:port->container/proto`, comma separated; empty when unpublished. */
function portsOf(entry) {
  const list = Array.isArray(entry.Ports) ? entry.Ports : []
  const parts = []
  for (const port of list) {
    if (port === null || typeof port !== 'object') continue
    const containerPort = Number(port.container_port)
    if (!Number.isFinite(containerPort)) continue
    const protocol = typeof port.protocol === 'string' && port.protocol !== '' ? port.protocol : 'tcp'
    const hostPort = Number(port.host_port)
    if (!Number.isFinite(hostPort) || hostPort === 0) {
      parts.push(`${containerPort}/${protocol}`)
      continue
    }
    const hostIp = typeof port.host_ip === 'string' && port.host_ip !== '' ? port.host_ip : '0.0.0.0'
    parts.push(`${hostIp}:${hostPort}->${containerPort}/${protocol}`)
  }
  return parts.join(', ')
}

/** Epoch milliseconds from podman's seconds-since-epoch `Created`. */
function createdOf(entry) {
  const seconds = Number(entry.Created)
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  const parsed = Date.parse(String(entry.CreatedAt ?? ''))
  return Number.isNaN(parsed) ? 0 : parsed
}

/** Whether a state means the container is up right now. */
function isRunning(state) {
  return state === 'running' || state === 'paused'
}

/**
 * Normalize `podman ps --all --format json` into table rows.
 *
 * Running containers come first, then newest first, so the list stays useful
 * when a machine accumulates dozens of exited test containers.
 *
 * @param {unknown} raw - the parsed podman output.
 * @returns {Array<{id: string, name: string, image: string, state: string, status: string, created: number, createdText: string, ports: string, networks: string, pod: string}>}
 */
export function normalizeContainers(raw) {
  const source = Array.isArray(raw) ? raw : []
  const rows = []
  for (const entry of source) {
    if (entry === null || typeof entry !== 'object') continue
    const state = typeof entry.State === 'string' ? entry.State.toLowerCase() : ''
    const networks = Array.isArray(entry.Networks) ? entry.Networks.filter(item => typeof item === 'string' && item !== '') : []
    rows.push({
      id: typeof entry.Id === 'string' ? entry.Id.slice(0, 12) : '',
      name: nameOf(entry),
      image: typeof entry.Image === 'string' ? entry.Image : '',
      state,
      status: typeof entry.Status === 'string' ? entry.Status : '',
      created: createdOf(entry),
      createdText: typeof entry.CreatedAt === 'string' ? entry.CreatedAt : '',
      ports: portsOf(entry),
      networks: networks.join(', '),
      pod: typeof entry.PodName === 'string' ? entry.PodName : '',
    })
  }
  rows.sort((left, right) => {
    const runningDiff = Number(isRunning(right.state)) - Number(isRunning(left.state))
    if (runningDiff !== 0) return runningDiff
    return right.created - left.created
  })
  return rows
}

/**
 * List every container the engine knows about.
 * @param {{podmanPath?: string}} [options] - plugin config slice.
 * @returns {Promise<{containers: Array<object>, fetchedAt: string}>} the rows.
 */
export async function listContainers(options = {}) {
  const binary = resolvePodman(options.podmanPath)
  const stdout = await run(binary, ['ps', '--all', '--format', 'json'])
  return { containers: normalizeContainers(parseJsonArray(stdout)), fetchedAt: new Date().toISOString() }
}

/**
 * Run one lifecycle verb against one container.
 * @param {'start'|'stop'} action - which verb to run.
 * @param {string} reference - short id or name from the list the panel showed.
 * @param {{podmanPath?: string}} options - plugin config slice.
 */
async function lifecycle(action, reference, options = {}) {
  if (!isContainerReference(reference)) {
    throw new Error('无效的容器标识')
  }
  const binary = resolvePodman(options.podmanPath)
  const stdout = await run(binary, [action, reference], ACTION_TIMEOUT_MS)
  return {
    id: reference,
    action,
    output: stdout.trim(),
    ranAt: new Date().toISOString(),
  }
}

/**
 * Start one container.
 * @param {string} reference - short id or name.
 * @param {{podmanPath?: string}} [options] - plugin config slice.
 */
export async function startContainer(reference, options = {}) {
  return lifecycle('start', reference, options)
}

/**
 * Stop one container (graceful, podman's own timeout applies).
 * @param {string} reference - short id or name.
 * @param {{podmanPath?: string}} [options] - plugin config slice.
 */
export async function stopContainer(reference, options = {}) {
  return lifecycle('stop', reference, options)
}
