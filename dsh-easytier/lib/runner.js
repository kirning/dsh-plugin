/**
 * Start and stop a local `easytier-core` node from the panel.
 *
 * Discovery only ever reports cores that already run; the panel is much more
 * useful when it can bring one up itself, so this module keeps the whole
 * lifecycle in one place: build the command line from a handful of fields,
 * spawn one detached process, stream its console into a log file, and record
 * enough in a small JSON file that the node can still be stopped after the
 * host restarts.
 *
 * Nothing here needs elevation: the default (`--no-tun`) joins the network as
 * a relay-only member, which is exactly what "see the terminals" needs.
 *
 * @module dsh-easytier/lib/runner
 */

import { spawn } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { runFile } from './discover.js'
import { missingRuntimeFiles, stateDirectory } from './install.js'

/** Default RPC portal, the address `easytier-cli` dials. */
export const DEFAULT_RPC_PORTAL = '127.0.0.1:15888'

/** Default listeners, so peers can reach this node. */
const DEFAULT_LISTENERS = ['tcp://0.0.0.0:11010', 'udp://0.0.0.0:11010']

/** Default peer used for discovery when none is given. */
export const DEFAULT_PEER = 'tcp://public.easytier.cn:11010'

/** How long to wait for the RPC portal to accept connections after a spawn. */
const START_TIMEOUT_MS = 20000

/** Console log level passed to the core. */
const CONSOLE_LOG_LEVEL = 'info'

/** Log file is truncated at start once it grows past this size. */
const MAX_LOG_BYTES = 4 * 1024 * 1024

/** How many trailing log lines `status()` reports. */
const LOG_TAIL_LINES = 40

/** A runner failure carrying a machine-readable code for the HTTP layer. */
export class EasyTierRunError extends Error {
  /**
   * @param {string} message - human-readable text.
   * @param {string} [code] - stable code for the panel (`not_installed`, `already_running`, ...).
   */
  constructor(message, code = 'run_error') {
    super(message)
    this.name = 'EasyTierRunError'
    this.code = code
  }
}

/** Trim any value into a string, `undefined` when empty. */
function textOf(value) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Split a peer list given as an array or a comma/whitespace separated string. */
function peersOf(value) {
  /** @type {string[]} */
  const list = []
  const push = candidate => {
    const trimmed = textOf(candidate)
    if (trimmed === undefined) return
    if (!list.includes(trimmed)) list.push(trimmed)
  }
  if (Array.isArray(value)) {
    for (const entry of value) push(entry)
  } else if (typeof value === 'string') {
    for (const entry of value.split(/[\s,;]+/)) push(entry)
  }
  return list
}

/**
 * Build the `easytier-core` argument list.
 * @param {{networkName: string, networkSecret?: string, peers?: string[], ipv4?: string,
 *   noTun?: boolean, rpcPortal?: string, instanceName?: string, hostname?: string}} plan - node settings.
 * @returns {string[]} argv for the core executable.
 */
export function buildArgs(plan) {
  const args = ['--network-name', plan.networkName]
  if (plan.networkSecret !== undefined) args.push('--network-secret', plan.networkSecret)
  if (plan.hostname !== undefined) args.push('--hostname', plan.hostname)
  if (plan.instanceName !== undefined) args.push('--instance-name', plan.instanceName)
  const peers = plan.peers === undefined || plan.peers.length === 0 ? [DEFAULT_PEER] : plan.peers
  args.push('--peers', ...peers)
  if (plan.noTun === true) {
    args.push('--no-tun', 'true')
  } else if (plan.ipv4 !== undefined) {
    args.push('--ipv4', plan.ipv4)
  } else {
    args.push('--dhcp', 'true')
  }
  args.push('--listeners', ...DEFAULT_LISTENERS)
  args.push('--rpc-portal', plan.rpcPortal === undefined ? DEFAULT_RPC_PORTAL : plan.rpcPortal)
  args.push('--console-log-level', CONSOLE_LOG_LEVEL)
  return args
}

/** Whether a pid is still alive on this platform. */
async function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  if (process.platform === 'win32') {
    const result = await runFile('tasklist', ['/FI', `PID eq ${pid}`, '/NH'], 10000)
    if (result.error !== undefined) return false
    return new RegExp(`\\b${pid}\\b`).test(result.stdout)
  }
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** Resolve once a TCP endpoint accepts a connection, or reject after the deadline. */
function waitForPortal(portal, timeoutMs) {
  const [host, portText] = portal.includes(':') ? [portal.slice(0, portal.lastIndexOf(':')), portal.slice(portal.lastIndexOf(':') + 1)] : ['127.0.0.1', portal]
  const port = Number(portText)
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = connect({ host, port })
      const retry = () => {
        socket.destroy()
        if (Date.now() > deadline) {
          reject(new EasyTierRunError(`The RPC portal ${portal} did not come up in ${Math.round(timeoutMs / 1000)}s.`, 'portal_timeout'))
          return
        }
        setTimeout(attempt, 300)
      }
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.once('error', retry)
      socket.setTimeout(1500, retry)
    }
    attempt()
  })
}

/** Keep the log file from growing without bound across restarts. */
function rotateLog(logPath) {
  try {
    if (existsSync(logPath) && statSync(logPath).size > MAX_LOG_BYTES) unlinkSync(logPath)
  } catch {
    // A log we cannot rotate is not worth failing a start over.
  }
}

/** Read the last lines of a file, tolerating anything unreadable. */
function tailOf(path, lines) {
  try {
    if (!existsSync(path)) return []
    const content = readFileSync(path, 'utf8')
    return content.split(/\r?\n/).filter(line => line !== '').slice(-lines)
  } catch {
    return []
  }
}

/**
 * Owns the local core process: spawn, remember, stop.
 */
export class EasyTierRunner {
  /**
   * @param {{stateFile?: string, logFile?: string, env?: NodeJS.ProcessEnv,
   *   homeDir?: string, platform?: string}} [options] - optional paths for tests.
   */
  constructor(options = {}) {
    this.env = options.env === undefined ? process.env : options.env
    this.homeDir = options.homeDir === undefined ? homedir() : options.homeDir
    this.platform = options.platform === undefined ? process.platform : options.platform
    const base = stateDirectory(this.env, this.homeDir)
    this.stateFile = options.stateFile === undefined ? join(base, 'node.json') : options.stateFile
    this.logFile = options.logFile === undefined ? join(dirname(this.stateFile), 'core.log') : options.logFile
    /** @type {{pid: number, child: import('node:child_process').ChildProcess}|null} */
    this.child = null
    this.exitNote = null
  }

  /** Read the persisted record, `null` when absent or unreadable. */
  readRecord() {
    try {
      if (!existsSync(this.stateFile)) return null
      const parsed = JSON.parse(readFileSync(this.stateFile, 'utf8'))
      return parsed !== null && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }

  /** Persist the record for a node this runner spawned. */
  writeRecord(record) {
    mkdirSync(dirname(this.stateFile), { recursive: true })
    writeFileSync(this.stateFile, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  }

  /** Forget the record. */
  clearRecord() {
    try {
      if (existsSync(this.stateFile)) unlinkSync(this.stateFile)
    } catch {
      // Ignoring a write failure here only risks a stale record.
    }
  }

  /** Public view of the node this machine is running (or last tried to run). */
  async status() {
    const record = this.readRecord()
    if (record === null) return { running: false, logPath: this.logFile, logTail: [], record: null }
    const alive = await isProcessAlive(Number(record.pid))
    return {
      running: alive,
      pid: Number(record.pid),
      networkName: record.networkName,
      peers: Array.isArray(record.peers) ? record.peers : [],
      ipv4: record.ipv4,
      noTun: record.noTun === true,
      rpcPortal: record.rpcPortal,
      startedAt: record.startedAt,
      logPath: this.logFile,
      logTail: tailOf(this.logFile, LOG_TAIL_LINES),
      error: alive ? null : (this.exitNote ?? 'the recorded easytier-core process is no longer running'),
      record,
    }
  }

  /**
   * Spawn one core and wait for its RPC portal.
   * @param {{corePath: string, networkName?: string, networkSecret?: string, peers?: string[]|string,
   *   ipv4?: string, noTun?: boolean, rpcPortal?: string, hostname?: string, instanceName?: string}} plan - node settings;
   *   `corePath` is resolved by the caller from discovery.
   * @returns {Promise<object>} the public status after a successful start.
   */
  async start(plan) {
    const current = await this.status()
    if (current.running) {
      throw new EasyTierRunError(`A node is already running (pid ${current.pid}).`, 'already_running')
    }
    const corePath = textOf(plan.corePath)
    if (corePath === undefined) throw new EasyTierRunError('easytier-core was not found; initialize EasyTier first.', 'not_installed')
    if (!existsSync(corePath)) throw new EasyTierRunError(`easytier-core is missing at ${corePath}.`, 'not_installed')
    const missing = missingRuntimeFiles(dirname(corePath), this.platform)
    if (missing.length > 0) {
      // Refuse early: the process would die with STATUS_DLL_NOT_FOUND (0xC0000135)
      // and leave an empty log, which is impossible to diagnose from the panel.
      throw new EasyTierRunError(
        `this EasyTier directory is incomplete: ${missing.join(', ')} is missing next to easytier-core.exe. `
        + 'Use "change directory / initialize again" to unpack the full release archive.',
        'missing_runtime',
      )
    }
    const networkName = textOf(plan.networkName)
    if (networkName === undefined) throw new EasyTierRunError('A network name is required to join a network.', 'invalid_network_name')

    const rpcPortal = textOf(plan.rpcPortal) ?? DEFAULT_RPC_PORTAL
    const noTun = plan.noTun !== false
    const ipv4 = noTun ? undefined : textOf(plan.ipv4)
    const peers = peersOf(plan.peers)
    const args = buildArgs({
      networkName,
      networkSecret: textOf(plan.networkSecret),
      peers,
      ipv4,
      noTun,
      rpcPortal,
      hostname: textOf(plan.hostname),
      instanceName: textOf(plan.instanceName),
    })

    mkdirSync(dirname(this.logFile), { recursive: true })
    rotateLog(this.logFile)
    this.exitNote = null
    const fd = openSync(this.logFile, 'a')
    let child
    try {
      child = spawn(corePath, args, {
        detached: true,
        windowsHide: true,
        cwd: dirname(corePath),
        stdio: ['ignore', fd, fd],
        env: this.env,
      })
    } finally {
      closeSync(fd)
    }
    child.once('error', error => {
      this.exitNote = `could not start easytier-core: ${error.message}`
    })
    child.once('exit', (code, signal) => {
      // Keep the record: the panel still wants the log tail of a node that died.
      const detail = signal === null ? `code ${code}` : signal
      const missing = code === null ? [] : missingRuntimeFiles(dirname(corePath), this.platform)
      this.exitNote = missing.length > 0
        // 0xC0000135 is STATUS_DLL_NOT_FOUND: the process died before it could log anything.
        ? `easytier-core exited (${detail}) — ${missing.join(', ')} is missing next to easytier-core.exe`
        : `easytier-core exited (${detail})`
    })
    this.child = { pid: child.pid ?? 0, child }
    child.unref()

    const pid = child.pid
    if (!Number.isInteger(pid) || pid <= 0) throw new EasyTierRunError('easytier-core did not start.', 'spawn_failed')
    this.writeRecord({
      pid,
      networkName,
      peers,
      ipv4,
      noTun,
      rpcPortal,
      startedAt: new Date().toISOString(),
      corePath,
      logPath: this.logFile,
    })

    try {
      await waitForPortal(rpcPortal, START_TIMEOUT_MS)
    } catch (error) {
      const note = this.exitNote
      if (note !== null) {
        throw new EasyTierRunError(`easytier-core stopped during startup: ${note}`, 'start_failed')
      }
      throw error
    }
    return this.status()
  }

  /**
   * Stop the recorded node (the whole tree, so the core's helper processes go too).
   * @returns {Promise<{stopped: boolean, pid?: number}>} whether something was stopped.
   */
  async stop() {
    const record = this.readRecord()
    if (record === null) return { stopped: false }
    const pid = Number(record.pid)
    const alive = await isProcessAlive(pid)
    if (alive) {
      if (this.platform === 'win32') {
        const result = await runFile('taskkill', ['/PID', String(pid), '/T', '/F'], 15000)
        if (result.error !== undefined) {
          throw new EasyTierRunError(`could not stop pid ${pid}: ${result.error.message}`, 'stop_failed')
        }
      } else {
        try {
          process.kill(pid, 'SIGTERM')
        } catch (error) {
          throw new EasyTierRunError(`could not stop pid ${pid}: ${String(error)}`, 'stop_failed')
        }
      }
    }
    this.clearRecord()
    this.child = null
    return { stopped: alive, pid }
  }
}
