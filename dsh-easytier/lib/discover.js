/**
 * Process-first EasyTier discovery.
 *
 * The instance this plugin manages is found the same way a user finds it in
 * Task Manager: enumerate the running `easytier-core` processes, then work out
 * (a) which CLI binary talks to them, (b) which TCP port is their RPC portal,
 * and (c) which config file they were started with.
 *
 * Identity is therefore the **process**, not a stored host record:
 *
 *  - Windows: one PowerShell probe collects processes, EasyTier services
 *    (registry `ImagePath` gives the exe and `--config-file`), and the TCP
 *    listen table keyed by owning PID. `ImagePath` matters because a service
 *    runs as SYSTEM and its process image path is not readable unelevated.
 *  - POSIX: `pgrep` for the process list, `/proc/<pid>/exe` for the image,
 *    `ss`/`netstat` for the listen table.
 *
 * The RPC portal is then confirmed by actually calling `easytier-cli ... node`
 * against it, so a stale or wrong port never produces a broken instance.
 *
 * @module dsh-easytier/lib/discover
 */

import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { cliJson } from './cli.js'

/** Default RPC portal port used by easytier-core. */
const DEFAULT_RPC_PORT = 15888

/** Default VPN listener port used by easytier-core. */
const DEFAULT_LISTEN_PORT = 11010

/** Upper bound on how many portal candidates are probed per instance. */
const MAX_PORTAL_PROBES = 4

/**
 * Run a file without a shell and resolve its captured output.
 * @param {string} file - executable to spawn.
 * @param {string[]} args - argv.
 * @param {number} timeoutMs - kill after this long.
 * @returns {Promise<{stdout: string, stderr: string, code: number|null, timedOut: boolean, error?: string}>}
 */
export function runFile(file, args, timeoutMs = 15000) {
  return new Promise(resolve => {
    let settled = false
    let timedOut = false
    const done = value => {
      if (settled) return
      settled = true
      resolve(value)
    }
    let child
    try {
      child = execFile(file, args, {
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        encoding: 'utf8',
        timeout: timeoutMs,
        env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' },
      }, (error, stdout, stderr) => {
        done({
          stdout: typeof stdout === 'string' ? stdout : '',
          stderr: typeof stderr === 'string' ? stderr : '',
          code: error !== null && error !== undefined && typeof error.code === 'number' ? error.code : (error == null ? 0 : 1),
          timedOut: Boolean(error && (error.killed === true || timedOut)),
          ...(error && !timedOut ? { error: String(error.message ?? error) } : {}),
        })
      })
      child.on('error', error => {
        done({ stdout: '', stderr: '', code: null, timedOut: false, error: String(error.message ?? error) })
      })
    } catch (error) {
      done({ stdout: '', stderr: '', code: null, timedOut: false, error: String(error.message ?? error) })
    }
  })
}

/**
 * Pull the first JSON value out of noisy CLI capture (warnings, banners).
 * @param {string} text - raw stdout.
 * @returns {unknown} parsed value, or undefined.
 */
export function parseLooseJson(text) {
  const trimmed = text.trim()
  if (trimmed === '') return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    /* fall through to bracket scan */
  }
  const first = trimmed.search(/[[{]/)
  if (first < 0) return undefined
  const opener = trimmed[first]
  const closer = opener === '[' ? ']' : '}'
  const last = trimmed.lastIndexOf(closer)
  if (last <= first) return undefined
  try {
    return JSON.parse(trimmed.slice(first, last + 1))
  } catch {
    return undefined
  }
}

/**
 * Best-effort TOML read for the fields this plugin displays.
 *
 * A full TOML parser is not worth a dependency: only the identity block and
 * the `[[peer]]` URI list are surfaced, and the raw text stays available.
 * @param {string} text - config.toml contents.
 * @returns {{instanceName?: string, ipv4?: string, networkName?: string, listeners: string[], peers: Array<{uri: string}>, rpcPortal?: string, proxies: string[], hasSecret: boolean}}
 */
export function parseEasyTierToml(text) {
  const summary = { listeners: [], peers: [], proxies: [], hasSecret: false }
  if (typeof text !== 'string') return summary
  const lines = text.split(/\r?\n/)
  let section = ''
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim()
    if (line === '') continue
    if (line.startsWith('[[') && line.endsWith(']]')) {
      section = line.slice(2, -2).trim()
      continue
    }
    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1).trim()
      continue
    }
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    const rawValue = line.slice(eq + 1).trim()
    const stringValue = unquoteToml(rawValue)
    const arrayValue = parseTomlStringArray(rawValue)
    if (section === 'network_identity') {
      if (key === 'network_name') summary.networkName = stringValue
      if (key === 'network_secret') summary.hasSecret = stringValue !== undefined && stringValue !== ''
      continue
    }
    if (section === 'peer') {
      if (key === 'uri' && stringValue !== undefined) summary.peers.push({ uri: stringValue })
      continue
    }
    if (section === '') {
      if (key === 'instance_name') summary.instanceName = stringValue
      if (key === 'ipv4') summary.ipv4 = stringValue
      if (key === 'rpc_portal') summary.rpcPortal = stringValue
      if (key === 'listeners' && arrayValue !== undefined) summary.listeners = arrayValue
      if (key === 'proxy_networks' && arrayValue !== undefined) summary.proxies = arrayValue
    }
  }
  return summary
}

/** Strip matching single or double quotes from a TOML scalar. */
function unquoteToml(value) {
  const trimmed = value.trim()
  if (trimmed.length >= 2) {
    const first = trimmed[0]
    const last = trimmed[trimmed.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) return trimmed.slice(1, -1)
  }
  return undefined
}

/** Parse an inline TOML array of strings. */
function parseTomlStringArray(value) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return undefined
  const inner = trimmed.slice(1, -1)
  const out = []
  const re = /"([^"]*)"|'([^']*)'/g
  let match = re.exec(inner)
  while (match !== null) {
    out.push(match[1] !== undefined ? match[1] : match[2])
    match = re.exec(inner)
  }
  return out
}

/**
 * Split a Windows service `ImagePath` (possibly quoted) into exe and argv.
 * @param {string} imagePath - registry value, e.g. `\??\C:\x\easytier-core.exe --config-file C:\x\config.toml`.
 * @returns {{exePath?: string, args: string[]}}
 */
export function splitWindowsImagePath(imagePath) {
  if (typeof imagePath !== 'string' || imagePath.trim() === '') return { args: [] }
  let text = imagePath.trim()
  // Strip the Win32 file-namespace prefix the SCM stores (`\??\` or `\\?\`).
  for (const prefix of ['\\\\?\\', '\\??\\']) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length)
      break
    }
  }
  const args = []
  let exePath
  if (text.startsWith('"')) {
    const close = text.indexOf('"', 1)
    if (close > 0) {
      exePath = text.slice(1, close)
      const rest = text.slice(close + 1).trim()
      if (rest !== '') args.push(...splitArgv(rest))
    } else {
      exePath = text.slice(1)
    }
  } else {
    const spaceAt = text.indexOf(' ')
    if (spaceAt < 0) {
      exePath = text
    } else {
      // Unquoted image paths are ambiguous; prefer the whole leading token that
      // still looks like an .exe so `C:\Program Files\...` is not truncated.
      const exeMatch = text.match(/^(.*?\.exe)(\s|$)/i)
      if (exeMatch !== null) {
        exePath = exeMatch[1]
        args.push(...splitArgv(text.slice(exeMatch[1].length).trim()))
      } else {
        exePath = text.slice(0, spaceAt)
        args.push(...splitArgv(text.slice(spaceAt + 1)))
      }
    }
  }
  return { ...(exePath !== undefined ? { exePath } : {}), args: args.filter(Boolean) }
}

/** Whitespace split honouring double quotes. */
function splitArgv(text) {
  const out = []
  let current = ''
  let quoted = false
  for (const char of text) {
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (!quoted && /\s/.test(char)) {
      if (current !== '') {
        out.push(current)
        current = ''
      }
      continue
    }
    current += char
  }
  if (current !== '') out.push(current)
  return out
}

/** Read the `--config-file`/`--config-dir` value out of an argv list. */
export function configFromArgs(args) {
  const out = {}
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const withEquals = /^--(config-file|config-dir)=(.+)$/.exec(arg)
    if (withEquals !== null) {
      if (withEquals[1] === 'config-file') out.configPath = withEquals[2]
      else out.configDir = withEquals[2]
      continue
    }
    if (arg === '--config-file' && index + 1 < args.length) {
      out.configPath = args[index + 1]
      index += 1
      continue
    }
    if (arg === '--config-dir' && index + 1 < args.length) {
      out.configDir = args[index + 1]
      index += 1
    }
  }
  return out
}

/** PowerShell probe: processes + EasyTier services + listeners for those PIDs. */
function windowsProbeScript() {
  return [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$ProgressPreference = 'SilentlyContinue'",
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    "$names = @('easytier-core', 'easytier-gui')",
    '$procs = @(Get-Process -Name $names | Select-Object -Property Id, ProcessName, Path)',
    '$pids = @($procs | ForEach-Object { $_.Id })',
    '$svcs = @()',
    "foreach ($svc in @(Get-Service | Where-Object { $_.Name -match 'easy' -or $_.DisplayName -match 'easy' })) {",
    '  $imagePath = $null',
    '  $key = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\$($svc.Name)"',
    '  if (Test-Path $key) { $imagePath = (Get-ItemProperty -Path $key).ImagePath }',
    '  $svcs += [pscustomobject]@{ Name = "$($svc.Name)"; Status = "$($svc.Status)"; ImagePath = "$imagePath" }',
    '}',
    '$ports = @()',
    'if ($pids.Count -gt 0) {',
    '  $ports = @(Get-NetTCPConnection -State Listen | Where-Object { $pids -contains $_.OwningProcess } | Select-Object -Property OwningProcess, LocalAddress, LocalPort)',
    '}',
    '$result = [pscustomobject]@{ processes = $procs; services = $svcs; tcpPorts = $ports }',
    'ConvertTo-Json -InputObject $result -Depth 6 -Compress',
  ].join('\n')
}

/** Collect raw discovery facts on Windows. */
async function probeWindows() {
  const script = windowsProbeScript()
  const attempts = [
    ['powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script]],
    ['pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', script]],
  ]
  let last = undefined
  for (const [file, args] of attempts) {
    const result = await runFile(file, args, 25000)
    if (result.error !== undefined && result.stdout.trim() === '') {
      last = result
      continue
    }
    const parsed = parseLooseJson(result.stdout)
    if (parsed !== undefined && parsed !== null && typeof parsed === 'object') return parsed
    last = result
  }
  return last !== undefined && last.error !== undefined ? { error: last.error } : {}
}

/** Collect raw discovery facts on POSIX. */
async function probePosix() {
  const listing = await runFile('ps', ['-eo', 'pid=,args='], 10000)
  const processes = []
  for (const line of listing.stdout.split(/\r?\n/)) {
    const match = /^\s*(\d+)\s+(.*)$/.exec(line)
    if (match === null) continue
    const args = match[2]
    if (!/easytier-(core|gui)/.test(args)) continue
    processes.push({ Id: Number(match[1]), ProcessName: /easytier-core/.test(args) ? 'easytier-core' : 'easytier-gui', Args: args })
  }
  for (const proc of processes) {
    const link = await runFile('readlink', ['-f', `/proc/${proc.Id}/exe`], 4000)
    if (link.code === 0 && link.stdout.trim() !== '') proc.Path = link.stdout.trim()
  }
  const tcpPorts = []
  const ss = await runFile('ss', ['-lptnH'], 8000)
  const portLine = ss.code === 0 ? ss.stdout : (await runFile('netstat', ['-lptn'], 8000)).stdout
  for (const line of portLine.split(/\r?\n/)) {
    const pidMatch = /\bpid=(\d+)/.exec(line) ?? /\s(\d+)\/easytier/.exec(line)
    if (pidMatch === null) continue
    const portMatch = /\s(?:\S*:)(\d+)\s/.exec(line) ?? /:(\d+)\s/.exec(line)
    if (portMatch === null) continue
    tcpPorts.push({ OwningProcess: Number(pidMatch[1]), LocalPort: Number(portMatch[1]), LocalAddress: '0.0.0.0' })
  }
  return { processes, services: [], tcpPorts }
}

/**
 * Candidate `easytier-cli` locations, most specific first.
 * @param {{exePath?: string, configPath?: string, configDir?: string}} hints - discovered paths.
 * @param {string|undefined} override - explicit config value.
 * @returns {string[]} absolute candidates.
 */
export function cliCandidates(hints, override) {
  const out = []
  const push = value => {
    if (typeof value === 'string' && value !== '' && !out.includes(value)) out.push(value)
  }
  push(override)
  const exeDir = hints.exePath !== undefined ? dirname(hints.exePath) : undefined
  if (exeDir !== undefined) {
    push(join(exeDir, process.platform === 'win32' ? 'easytier-cli.exe' : 'easytier-cli'))
  }
  if (hints.configDir !== undefined) {
    push(join(hints.configDir, process.platform === 'win32' ? 'easytier-cli.exe' : 'easytier-cli'))
  }
  if (process.platform === 'win32') {
    push(join('C:\\ProgramData\\easytier', 'easytier-cli.exe'))
    const local = process.env.LOCALAPPDATA
    if (local !== undefined) {
      push(join(local, 'easytier-gui', 'easytier-cli.exe'))
      push(join(local, 'Programs', 'easytier', 'easytier-cli.exe'))
    }
    const programFiles = process.env.ProgramFiles
    if (programFiles !== undefined) push(join(programFiles, 'EasyTier', 'easytier-cli.exe'))
  } else {
    push('/usr/local/bin/easytier-cli')
    push('/usr/bin/easytier-cli')
    push(join(homedir(), '.local', 'bin', 'easytier-cli'))
  }
  push(process.platform === 'win32' ? 'easytier-cli.exe' : 'easytier-cli')
  return out
}

/** First candidate that exists on disk (a bare name is accepted as a PATH lookup). */
export function resolveCliPath(candidates) {
  for (const candidate of candidates) {
    if (!candidate.includes('/') && !candidate.includes('\\')) return candidate
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

/**
 * Confirm a portal by calling `node` against it.
 * @returns {Promise<object|undefined>} the parsed node payload on success.
 */
async function verifyPortal(cliPath, portal) {
  const result = await cliJson(cliPath, portal, ['node'], { timeoutMs: 9000 })
  if (result.ok && result.data !== undefined && result.data !== null && typeof result.data === 'object') return result.data
  return undefined
}

/**
 * Discover every running EasyTier core and the data needed to drive it.
 * @param {{cliPath?: string, rpcPortal?: string, configFile?: string}} overrides - explicit config values.
 * @returns {Promise<{platform: string, instances: object[], diagnostics: object}>}
 */
export async function discover(overrides = {}) {
  const platform = process.platform
  const raw = platform === 'win32' ? await probeWindows() : await probePosix()
  const diagnostics = {}
  if (raw.error !== undefined) diagnostics.probeError = raw.error

  const processes = Array.isArray(raw.processes) ? raw.processes : []
  const services = Array.isArray(raw.services) ? raw.services : []
  const tcpPorts = Array.isArray(raw.tcpPorts) ? raw.tcpPorts : []

  const cores = processes.filter(proc => String(proc.ProcessName ?? '').toLowerCase() === 'easytier-core')
  const guis = processes.filter(proc => String(proc.ProcessName ?? '').toLowerCase() === 'easytier-gui')
  diagnostics.guiProcesses = guis.map(proc => ({ pid: proc.Id, running: true }))

  const instances = []
  for (const proc of cores) {
    const pid = Number(proc.Id)
    // Associate a service by matching the exe the SCM launches against this
    // process; when the image path is unreadable the single EasyTier service
    // running on the box is the only plausible owner.
    const ownedService = services.find(service => {
      const split = splitWindowsImagePath(service.ImagePath)
      return split.exePath !== undefined && String(proc.Path ?? '') !== '' && split.exePath === proc.Path
    }) ?? (services.length === 1 && cores.length === 1 ? services[0] : undefined)

    const serviceSplit = ownedService !== undefined ? splitWindowsImagePath(ownedService.ImagePath) : { args: [] }
    const exePath = (typeof proc.Path === 'string' && proc.Path !== '' ? proc.Path : undefined) ?? serviceSplit.exePath
    const args = serviceSplit.args
    const fromArgs = configFromArgs(args)

    const configPath = overrides.configFile ?? fromArgs.configPath
    const configDir = fromArgs.configDir
    let configText
    let configSummary
    if (configPath !== undefined) {
      try {
        configText = readFileSync(configPath, 'utf8')
        configSummary = parseEasyTierToml(configText)
      } catch (error) {
        diagnostics[`config:${pid}`] = String(error.message ?? error)
      }
    }

    const cliPath = resolveCliPath(cliCandidates({ exePath, configPath, configDir }, overrides.cliPath))
    const pidPorts = [...new Set(tcpPorts.filter(entry => Number(entry.OwningProcess) === pid).map(entry => Number(entry.LocalPort)))]
      .filter(port => Number.isFinite(port) && port > 0)

    // Portal candidates: explicit override, the config's own setting, the
    // well-known default, then any other listener the process owns.
    const candidates = []
    const pushCandidate = portal => {
      if (typeof portal !== 'string' || portal === '') return
      const normalized = portal.includes(':') ? portal : `127.0.0.1:${portal}`
      const host = normalized.startsWith(':') ? `127.0.0.1${normalized}` : normalized
      if (!candidates.includes(host)) candidates.push(host)
    }
    pushCandidate(overrides.rpcPortal)
    if (configSummary?.rpcPortal !== undefined) pushCandidate(configSummary.rpcPortal)
    if (pidPorts.includes(DEFAULT_RPC_PORT)) pushCandidate(`127.0.0.1:${DEFAULT_RPC_PORT}`)
    pushCandidate(`127.0.0.1:${DEFAULT_RPC_PORT}`)
    for (const port of pidPorts) {
      if (port === DEFAULT_LISTEN_PORT) continue
      pushCandidate(`127.0.0.1:${port}`)
    }

    let rpcPortal
    let node
    if (cliPath !== undefined) {
      let probes = 0
      for (const candidate of candidates) {
        if (probes >= MAX_PORTAL_PROBES) break
        probes += 1
        node = await verifyPortal(cliPath, candidate)
        if (node !== undefined) {
          rpcPortal = candidate
          break
        }
      }
    }

    instances.push({
      id: String(pid),
      pid,
      process: 'easytier-core',
      exePath,
      cliPath,
      managedBy: ownedService !== undefined ? 'service' : 'process',
      service: ownedService !== undefined ? { name: ownedService.Name, status: ownedService.Status } : null,
      configPath,
      configSummary,
      rpcPortal,
      online: node !== undefined,
      ports: pidPorts,
      node: node !== undefined ? node : null,
    })
  }

  if (cliPathHintMissing(instances)) diagnostics.cliMissing = true
  if (instances.length === 0) diagnostics.noCore = true
  return { platform, instances, diagnostics }
}

/** Whether no instance could locate a CLI binary. */
function cliPathHintMissing(instances) {
  return instances.length > 0 && instances.every(instance => instance.cliPath === undefined)
}
