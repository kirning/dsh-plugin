/**
 * EasyTier provisioning: report whether EasyTier is installed on this machine
 * and, when it is not, download the current **stable** release from GitHub and
 * unpack it into a per-user directory.
 *
 * Two properties shape the implementation:
 *
 *  - **No dependencies.** The release archive is fetched with the global
 *    `fetch` — or, when the user offers a proxy, through {@link openStream},
 *    which speaks SOCKS5 and HTTP CONNECT with nothing but `node:net` — and
 *    unpacked with the platform's own tooling (`tar`, `unzip`, or PowerShell's
 *    `Expand-Archive` on Windows, where `tar.exe` may be missing).
 *  - **Observable.** An install is a job with a phase, a 0..1 progress value and
 *    an append-only log; the panel polls {@link EasyTierInstaller.status} while
 *    it runs, so the user sees what is happening instead of a spinner.
 *
 * Only the binaries are installed: no Windows service is registered and no node
 * is started, because joining a network needs a config the user has not made
 * yet. Once they start a node, discovery picks it up on its own.
 *
 * @module dsh-easytier/lib/install
 */

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  copyFileSync,
  chmodSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { once } from 'node:events'
import { homedir, tmpdir, platform as osPlatform, arch as osArch } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { runFile } from './discover.js'
import { openStream, parseProxy } from './proxy.js'

/** GitHub releases endpoint for the EasyTier repository. */
const RELEASES_API = 'https://api.github.com/repos/EasyTier/EasyTier/releases'

/** Sent with every GitHub request; the API rejects requests without one. */
const USER_AGENT = 'dsh-easytier (+https://github.com/EasyTier/EasyTier)'

/** How many log lines a job keeps before the oldest are dropped. */
const MAX_LOG_LINES = 400

/** Download budget; EasyTier archives are ~20-35 MB, so this only trips on stalls. */
const DOWNLOAD_TIMEOUT_MS = 15 * 60 * 1000

/** Metadata call budget. */
const METADATA_TIMEOUT_MS = 30 * 1000

/** A release listing is ~75 KB; anything past this is not a JSON body we want. */
const MAX_METADATA_BYTES = 8 * 1024 * 1024

/** Unpack budget for a 35 MB archive. */
const EXTRACT_TIMEOUT_MS = 3 * 60 * 1000

/** Progress weights per phase; they add up to 1. */
const PHASE_WEIGHTS = {
  resolve: 0.03,
  download: 0.82,
  verify: 0.02,
  extract: 0.09,
  install: 0.04,
}

/** Release asset suffixes, tried in this order. */
const ARCHIVE_SUFFIXES = ['.zip', '.tar.gz', '.tgz']

/**
 * `easytier-<triple>-v<version><suffix>`: the triple each platform/arch pair
 * uses in the release asset names.
 */
const TRIPLES = {
  'win32-x64': 'windows-x86_64',
  'win32-arm64': 'windows-arm64',
  'win32-ia32': 'windows-i686',
  'darwin-arm64': 'macos-aarch64',
  'darwin-x64': 'macos-x86_64',
  'linux-x64': 'linux-x86_64',
  'linux-arm64': 'linux-aarch64',
  'linux-arm': 'linux-armv7hf',
}

/** Install failures carrying a user-facing reason and a stable code. */
export class EasyTierInstallError extends Error {
  /**
   * @param {string} message - why the install could not proceed.
   * @param {string} [code] - stable machine-readable reason.
   */
  constructor(message, code = 'install_error') {
    super(message)
    this.name = 'EasyTierInstallError'
    this.code = code
  }
}

/**
 * The directory a fresh install targets, chosen to match what discovery scans.
 * @param {string} [platform] - `process.platform` override.
 * @param {Record<string, string|undefined>} [env] - environment override.
 * @param {string} [homeDir] - home directory override.
 * @returns {string} absolute install directory.
 */
export function defaultInstallDir(platform = osPlatform(), env = process.env, homeDir = homedir()) {
  if (platform === 'win32') {
    const base = typeof env.LOCALAPPDATA === 'string' && env.LOCALAPPDATA !== ''
      ? env.LOCALAPPDATA
      : join(homeDir, 'AppData', 'Local')
    return join(base, 'Programs', 'easytier')
  }
  return join(homeDir, '.local', 'bin')
}

/**
 * Where the plugin remembers the directory the user pointed at, so a directory
 * they picked once keeps being used after a restart.
 * @param {Record<string, string|undefined>} [env] - environment override.
 * @param {string} [homeDir] - home directory override.
 * @returns {string} absolute path of the plugin's state directory.
 */
export function stateDirectory(env = process.env, homeDir = homedir()) {
  const base = typeof env.DSH_HOME === 'string' && env.DSH_HOME !== '' ? env.DSH_HOME : join(homeDir, '.dsh')
  return join(base, 'dsh-easytier')
}

/**
 * Normalise a directory the user typed or picked in the panel.
 *
 * Blank input means "use the default", `~` expands to the home directory, and a
 * relative path is resolved against the current working directory.
 *
 * @param {string|null|undefined} value - raw input.
 * @param {{homeDir?: string, cwd?: string}} [options] - overrides for tests.
 * @returns {string|null} absolute directory, or null when the input is blank.
 */
export function normalizeDir(value, options = {}) {
  if (value === null || value === undefined) return null
  const homeDir = options.homeDir ?? homedir()
  const cwd = options.cwd ?? process.cwd()
  let text = String(value).trim()
  if (text === '') return null
  if (text.length > 1 && (text[0] === '"' || text[0] === "'") && text[text.length - 1] === text[0]) {
    text = text.slice(1, -1).trim()
  }
  if (text === '') return null
  if (text === '~') text = homeDir
  else if (text.startsWith('~/') || text.startsWith('~\\')) text = join(homeDir, text.slice(2))
  return resolve(isAbsolute(text) ? text : join(cwd, text))
}

/**
 * Release-asset triple for a platform/arch pair.
 * @param {string} platform - `process.platform` value.
 * @param {string} arch - `process.arch` value.
 * @returns {string|null} triple, or null when this build has no release asset.
 */
export function releaseTriple(platform, arch) {
  return TRIPLES[`${platform}-${arch}`] ?? null
}

/** Executable names shipped by an EasyTier release, in install/priority order. */
function binaryNames(platform) {
  const suffix = platform === 'win32' ? '.exe' : ''
  return ['easytier-core', 'easytier-cli', 'easytier-gui', 'easytier-web'].map(name => name + suffix)
}

/**
 * Files a Windows build needs next to `easytier-core.exe` but which are not
 * executables. `Packet.dll` is a load-time import — without it the process dies
 * with STATUS_DLL_NOT_FOUND (0xC0000135) before printing anything, which is what
 * a directory holding only the `.exe` files looks like.
 */
const WINDOWS_RUNTIME_FILES = ['Packet.dll']

/**
 * Runtime files missing from an EasyTier directory.
 * @param {string} dir - directory holding `easytier-core.exe`.
 * @param {string} platform - `process.platform` value.
 * @returns {string[]} missing file names (empty when complete or not Windows).
 */
export function missingRuntimeFiles(dir, platform = osPlatform()) {
  if (platform !== 'win32') return []
  return WINDOWS_RUNTIME_FILES.filter(name => !isFile(join(dir, name)))
}

/** True when `path` is an existing regular file. */
function isFile(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/** Every regular file under `dir`, depth-limited; unreadable directories are skipped. */
function walkFiles(dir, depth = 0, out = []) {
  if (depth > 4) return out
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(full, depth + 1, out)
    else if (entry.isFile()) out.push(full)
  }
  return out
}

/** Human-readable byte size for log lines. */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

/**
 * Normalise the proxy a caller offered into the shape {@link openStream} wants.
 *
 * `null` means "download directly". A string is `host:port`, optionally with a
 * `socks5://` or `http://` prefix; anything else must already be parsed.
 *
 * @param {string|{host: string, port: number, protocol: string, label?: string}|null|undefined} value - proxy input.
 * @returns {{host: string, port: number, protocol: string, label: string}|null} proxy, or null for a direct download.
 */
export function normalizeProxy(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return value
  const text = String(value).trim()
  if (text === '') return null
  return parseProxy(text)
}

/**
 * Detects installations and runs install jobs.
 *
 * One installer instance lives for the lifetime of the plugin; it holds at most
 * one job, which is what the panel polls.
 */
export class EasyTierInstaller {
  /**
   * @param {{platform?: string, arch?: string, env?: Record<string, string|undefined>, homeDir?: string,
   *   installDir?: string, stateFile?: string, releasesUrl?: string, logLimit?: number}} [options] - overrides for tests.
   */
  constructor(options = {}) {
    this.platform = options.platform ?? osPlatform()
    this.arch = options.arch ?? osArch()
    this.env = options.env ?? process.env
    this.homeDir = options.homeDir ?? homedir()
    this.stateFile = options.stateFile ?? join(stateDirectory(this.env, this.homeDir), 'install.json')
    this.installDir = options.installDir
      ?? this.readRememberedDir()
      ?? defaultInstallDir(this.platform, this.env, this.homeDir)
    this.releasesUrl = options.releasesUrl ?? RELEASES_API
    this.logLimit = Number.isFinite(options.logLimit) ? Number(options.logLimit) : MAX_LOG_LINES
    this.job = null
    this.controller = null
    this.detection = null
  }

  /**
   * The directory a previous run remembered, when it still exists.
   * @returns {string|null} remembered directory, or null.
   */
  readRememberedDir() {
    let text
    try {
      text = readFileSync(this.stateFile, 'utf8')
    } catch {
      return null
    }
    try {
      const state = JSON.parse(text)
      const dir = typeof state?.installDir === 'string' ? state.installDir.trim() : ''
      if (dir === '') return null
      return statSync(dir).isDirectory() ? dir : null
    } catch {
      return null
    }
  }

  /**
   * Remember `dir` as this machine's EasyTier directory.
   * @param {string} dir - absolute directory holding the binaries.
   */
  rememberDir(dir) {
    try {
      mkdirSync(dirname(this.stateFile), { recursive: true })
      writeFileSync(this.stateFile, `${JSON.stringify({ installDir: dir, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8')
    } catch {
      /* a state file that cannot be written only costs the memory, not the install */
    }
  }

  /**
   * Check that a directory the user pointed at really holds a usable EasyTier.
   *
   * `easytier-core` and `easytier-cli` are required — the plugin runs a node from
   * the first and talks to it with the second — while the GUI and the web
   * console are optional.
   *
   * @param {string} dir - directory to inspect (searched a few levels deep, because
   *   release archives unpack into a nested folder).
   * @returns {Promise<{dir: string, exists: boolean, isDirectory: boolean, ok: boolean,
   *   missing: string[], version: string|null, corePath: string|null, cliPath: string|null,
   *   guiPath: string|null, webPath: string|null, binaries: string[]}>} what was found.
   */
  async validateDirectory(dir) {
    const exists = existsSync(dir)
    let isDirectory = false
    try {
      isDirectory = exists && statSync(dir).isDirectory()
    } catch {
      isDirectory = false
    }
    const wanted = binaryNames(this.platform)
    const required = [wanted[0], wanted[1]]
    const found = isDirectory ? this.locateBinaries(dir) : []
    const pick = name => found.find(entry => entry.name === name)
    const core = pick(required[0])
    const cli = pick(required[1])
    const gui = pick(wanted[2])
    const web = pick(wanted[3])
    const missing = required.filter(name => pick(name) === undefined)
    const version = await this.readVersion((cli ?? core)?.path)
    const binaryDir = core === undefined ? dir : dirname(core.path)
    return {
      dir,
      exists,
      isDirectory,
      ok: isDirectory && missing.length === 0,
      missing,
      version,
      runtimeMissing: missingRuntimeFiles(binaryDir, this.platform),
      corePath: core === undefined ? null : core.path,
      cliPath: cli === undefined ? null : cli.path,
      guiPath: gui === undefined ? null : gui.path,
      webPath: web === undefined ? null : web.path,
      binaries: found.map(entry => entry.name),
    }
  }

  /** Directories that may hold an installed EasyTier, best match first. */
  searchDirs() {
    const dirs = [this.installDir]
    if (this.platform === 'win32') {
      const programData = typeof this.env.ProgramData === 'string' && this.env.ProgramData !== ''
        ? this.env.ProgramData
        : 'C:\\ProgramData'
      const localAppData = typeof this.env.LOCALAPPDATA === 'string' && this.env.LOCALAPPDATA !== ''
        ? this.env.LOCALAPPDATA
        : join(this.homeDir, 'AppData', 'Local')
      const programFiles = typeof this.env.ProgramFiles === 'string' && this.env.ProgramFiles !== ''
        ? this.env.ProgramFiles
        : 'C:\\Program Files'
      dirs.push(
        join(programData, 'easytier'),
        join(localAppData, 'easytier-gui'),
        join(localAppData, 'Programs', 'easytier-gui'),
        join(programFiles, 'EasyTier'),
      )
    } else {
      dirs.push('/usr/local/bin', '/usr/bin', join(this.homeDir, '.local', 'bin'))
    }
    for (const entry of String(this.env.PATH ?? '').split(this.platform === 'win32' ? ';' : ':')) {
      if (entry !== '') dirs.push(entry)
    }
    return [...new Set(dirs)]
  }

  /**
   * Is EasyTier present on this machine (whether or not a node is running)?
   *
   * Presence means an executable on disk, which is exactly what a user means by
   * "installed": the panel can then tell them to start it instead of offering to
   * download it again.
   *
   * @param {{force?: boolean}} [options] - `force` ignores the memoised result.
   */
  async detect(options = {}) {
    if (options.force !== true && this.detection !== null) return this.detection
    const names = binaryNames(this.platform)
    const found = []
    const dirs = this.searchDirs()
    for (const dir of dirs) {
      for (const name of names) {
        const path = join(dir, name)
        if (!isFile(path)) continue
        if (found.some(entry => entry.name === name)) continue
        found.push({ name, path, dir })
      }
    }
    const pick = stem => found.find(entry => entry.name === `${stem}${this.platform === 'win32' ? '.exe' : ''}`)
    const core = pick('easytier-core')
    const cli = pick('easytier-cli')
    const gui = pick('easytier-gui')
    const version = await this.readVersion((cli ?? core)?.path)
    const detection = {
      installed: found.length > 0,
      platform: this.platform,
      arch: this.arch,
      triple: releaseTriple(this.platform, this.arch),
      installDir: this.installDir,
      version,
      corePath: core === undefined ? null : core.path,
      cliPath: cli === undefined ? null : cli.path,
      guiPath: gui === undefined ? null : gui.path,
      dirs: [...new Set(found.map(entry => entry.dir))],
      searched: dirs,
    }
    this.detection = detection
    return detection
  }

  /** Drop the memoised detection result (after an install, or on refresh). */
  invalidate() {
    this.detection = null
  }

  /**
   * Read `easytier-cli --version` (or `easytier-core --version`).
   * @param {string|undefined} executable - binary to interrogate.
   * @returns {Promise<string|null>} dotted version, or null when unavailable.
   */
  async readVersion(executable) {
    if (executable === undefined) return null
    const result = await runFile(executable, ['--version'], 8000)
    const text = `${result.stdout}\n${result.stderr}`
    const match = /\b(\d+\.\d+\.\d+)\b/.exec(text)
    return match === null ? null : match[1]
  }

  /** The panel's payload: what is installed, and what the current job is doing. */
  async status() {
    return {
      detection: await this.detect(),
      job: this.publicJob(),
    }
  }

  /** Job state without the internal abort plumbing. */
  publicJob() {
    if (this.job === null) return null
    return {
      id: this.job.id,
      status: this.job.status,
      mode: this.job.mode ?? 'install',
      dir: this.job.dir ?? null,
      phase: this.job.phase,
      progress: Number(this.job.progress.toFixed(4)),
      downloaded: this.job.downloaded,
      total: this.job.total,
      proxy: this.job.proxy === null || this.job.proxy === undefined
        ? null
        : { label: this.job.proxy.label, protocol: this.job.proxy.protocol, active: this.job.proxyUsed ?? null },
      startedAt: this.job.startedAt,
      finishedAt: this.job.finishedAt,
      release: this.job.release,
      error: this.job.error,
      result: this.job.result,
      logs: this.job.logs,
    }
  }

  /**
   * Start provisioning: adopt `dir` when the user pointed at an existing
   * EasyTier, otherwise download the current stable release.
   *
   * @param {{proxy?: string|null, dir?: string|null}} [options] - `proxy` is `host:port`, optionally
   *   with a protocol prefix; `dir` is a directory holding an existing EasyTier.
   * @returns {object} the new job, as {@link publicJob} reports it.
   */
  start(options = {}) {
    if (this.job !== null && this.job.status === 'running') {
      throw new EasyTierInstallError('an initialization is already running', 'already_running')
    }
    const proxy = normalizeProxy(options.proxy ?? null)
    const dir = normalizeDir(options.dir ?? null, { homeDir: this.homeDir })
    this.controller = new AbortController()
    this.job = {
      id: randomUUID().slice(0, 8),
      status: 'running',
      phase: 'resolve',
      progress: 0,
      downloaded: 0,
      total: 0,
      mode: dir === null ? 'install' : 'adopt',
      dir,
      proxy,
      proxyUsed: null,
      startedAt: Date.now(),
      finishedAt: null,
      release: null,
      error: null,
      result: null,
      logs: [],
      controller: this.controller,
    }
    void this.run(this.job)
    return this.job === null ? null : this.publicJob()
  }

  /** Ask the running job to stop; the next step boundary notices. */
  cancel() {
    if (this.job === null || this.job.status !== 'running') return this.job === null ? null : this.publicJob()
    this.job.cancelled = true
    if (this.controller !== null) this.controller.abort()
    return this.publicJob()
  }

  /** Append one structured log line, keeping the buffer bounded. */
  log(job, level, code, params, text) {
    job.logs.push({ at: Date.now(), level, code, params: params ?? {}, text })
    if (job.logs.length > this.logLimit) job.logs.splice(0, job.logs.length - this.logLimit)
  }

  /** Advance the job's phase and record how much of it is done. */
  phase(job, name, fraction = 0) {
    job.phase = name
    let done = 0
    for (const [key, weight] of Object.entries(PHASE_WEIGHTS)) {
      if (key === name) break
      done += weight
    }
    job.progress = Math.min(1, done + (PHASE_WEIGHTS[name] ?? 0) * Math.max(0, Math.min(1, fraction)))
  }

  /** Throw when the user cancelled the job. */
  checkCancelled(job) {
    if (job.cancelled === true) {
      const error = new EasyTierInstallError('initialization cancelled', 'cancelled')
      error.cancelled = true
      throw error
    }
  }

  /** Drive one job to completion; every failure is recorded on the job. */
  async run(job) {
    const workDir = join(tmpdir(), `dsh-easytier-${job.id}`)
    try {
      this.phase(job, 'resolve', 0)
      this.log(job, 'info', 'start', {}, job.dir === null ? 'starting EasyTier initialization' : 'checking the EasyTier directory')
      if (job.dir !== null) {
        await this.adopt(job)
        return
      }
      if (job.proxy !== null) {
        const mode = job.proxy.protocol === 'auto' ? 'SOCKS5 first, then HTTP' : job.proxy.protocol.toUpperCase()
        this.log(job, 'info', 'proxy', { label: job.proxy.label, protocol: job.proxy.protocol }, `downloading through ${job.proxy.label} (${mode})`)
      }
      const release = await this.resolveRelease(job)
      const asset = this.pickAsset(release, job)
      job.release = { tag: release.tag, version: release.version, asset: asset.name, size: asset.size, url: asset.url }
      job.total = asset.size
      this.log(job, 'info', 'release', { tag: release.tag }, `latest stable release is ${release.tag}`)
      this.log(job, 'info', 'asset', { name: asset.name, size: formatBytes(asset.size) }, `downloading ${asset.name} (${formatBytes(asset.size)})`)

      mkdirSync(workDir, { recursive: true })
      const archivePath = join(workDir, asset.name)
      this.checkCancelled(job)
      this.phase(job, 'download', 0)
      await this.download(job, asset, archivePath)

      this.checkCancelled(job)
      this.phase(job, 'verify', 0)
      const actual = statSync(archivePath).size
      if (asset.size > 0 && actual !== asset.size) {
        throw new EasyTierInstallError(
          `download is ${actual} bytes but the release lists ${asset.size}: the transfer was truncated`,
          'size_mismatch',
        )
      }
      this.log(job, 'info', 'verify', { size: formatBytes(actual) }, `downloaded ${formatBytes(actual)}, size matches the release`)
      this.phase(job, 'verify', 1)

      this.checkCancelled(job)
      this.phase(job, 'extract', 0)
      const extractDir = join(workDir, 'unpacked')
      mkdirSync(extractDir, { recursive: true })
      const tool = await this.extract(job, archivePath, extractDir)
      this.log(job, 'info', 'extract', { tool }, `unpacked the archive with ${tool}`)
      this.phase(job, 'extract', 1)

      this.checkCancelled(job)
      this.phase(job, 'install', 0)
      const binaries = this.locateBinaries(extractDir)
      if (binaries.length === 0) {
        throw new EasyTierInstallError('the archive did not contain any EasyTier binary', 'binaries_missing')
      }
      // The archive ships runtime sidecars next to the binaries, and at least one
      // of them is a load-time import: `easytier-core.exe` refuses to start with
      // STATUS_DLL_NOT_FOUND (0xC0000135) when Packet.dll is missing, before it
      // can even print a line. Copy the whole payload directory, not only the
      // executables we happen to recognise.
      const payloadDir = dirname(binaries[0].path)
      mkdirSync(this.installDir, { recursive: true })
      const installed = []
      const copied = []
      for (const entry of readdirSync(payloadDir, { withFileTypes: true })) {
        if (!entry.isFile()) continue
        const target = join(this.installDir, entry.name)
        copyFileSync(join(payloadDir, entry.name), target)
        if (this.platform !== 'win32') chmodSync(target, 0o755)
        copied.push(target)
      }
      for (const binary of binaries) installed.push(join(this.installDir, binary.name))
      this.log(job, 'info', 'installed', { dir: this.installDir, count: copied.length }, `installed ${copied.length} files into ${this.installDir}`)
      this.phase(job, 'install', 1)

      this.invalidate()
      this.rememberDir(this.installDir)
      const version = await this.readVersion(installed.find(entry => /easytier-cli(\.exe)?$/.test(entry)) ?? installed[0])
      job.result = { mode: 'install', version, installDir: this.installDir, binaries: installed }
      job.status = 'done'
      job.progress = 1
      this.log(job, 'info', 'done', { version: version ?? '?', dir: this.installDir }, `EasyTier ${version ?? ''} is installed in ${this.installDir}`.trim())
    } catch (error) {
      const cancelled = error?.cancelled === true || job.cancelled === true
      job.status = cancelled ? 'cancelled' : 'error'
      job.error = cancelled ? null : String(error?.message ?? error)
      if (cancelled) this.log(job, 'warn', 'cancelled', {}, 'initialization cancelled')
      else this.log(job, 'error', 'failed', { message: job.error, code: error?.code ?? 'install_error' }, `initialization failed: ${job.error}`)
    } finally {
      job.finishedAt = Date.now()
      try {
        rmSync(workDir, { recursive: true, force: true })
      } catch {
        /* a leftover temp directory is harmless */
      }
      this.controller = null
    }
  }

  /**
   * Adopt an existing EasyTier directory instead of downloading one.
   *
   * Nothing is copied: the directory the user pointed at becomes this machine's
   * EasyTier directory, so discovery (and every later restart) finds the binaries
   * there. The check is the product here — a directory without `easytier-core`
   * and `easytier-cli` fails the job with the missing names in the log.
   *
   * @param {object} job - current job, whose `dir` is the directory to adopt.
   */
  async adopt(job) {
    const dir = job.dir
    this.phase(job, 'verify', 0)
    this.log(job, 'info', 'dirCheck', { dir }, `checking ${dir} for EasyTier binaries`)
    const check = await this.validateDirectory(dir)
    if (!check.ok) {
      const missing = check.missing.length === 0 ? 'easytier binaries' : check.missing.join(', ')
      this.log(job, 'error', 'dirMissing', { dir, files: missing }, `${dir} does not contain ${missing}`)
      throw new EasyTierInstallError(
        check.isDirectory === false
          ? `${dir} is not a directory`
          : `${dir} does not contain ${missing}`,
        check.isDirectory === false ? 'dir_not_found' : 'invalid_directory',
      )
    }
    // The user may have picked a folder that merely *contains* the release folder
    // (`easytier-windows-x86_64/`), and discovery looks for the binaries directly
    // inside `installDir` — so adopt the directory the binaries actually live in.
    const binaries = [check.corePath, check.cliPath, check.guiPath, check.webPath].filter(path => typeof path === 'string')
    const effective = typeof check.corePath === 'string' ? dirname(check.corePath) : dir
    if (check.runtimeMissing.length > 0) {
      const files = check.runtimeMissing.join(', ')
      this.log(job, 'error', 'dirMissing', { dir: effective, files }, `${effective} is missing ${files}`)
      throw new EasyTierInstallError(
        `${effective} holds the EasyTier executables but not ${files}: the node cannot start without them. `
        + 'Unpack the complete release archive into that folder, or let the panel download it again.',
        'missing_runtime',
      )
    }
    this.installDir = effective
    this.rememberDir(effective)
    this.invalidate()
    job.result = { mode: 'adopt', version: check.version, installDir: effective, binaries }
    job.phase = 'install'
    job.progress = 1
    job.status = 'done'
    this.log(job, 'info', 'adopted', { dir: effective, version: check.version ?? '?' }, `using EasyTier ${check.version ?? ''} from ${effective}`.trim())
    this.log(job, 'info', 'done', { version: check.version ?? '?', dir: effective }, `EasyTier ${check.version ?? ''} is ready in ${effective}`.trim())
  }

  /**
   * `openStream` options for a job: its proxy, its cancellation, and a log line
   * whenever a protocol has to be abandoned.
   * @param {object} job - current job.
   * @param {number} timeoutMs - total budget for the request.
   * @returns {object} options for {@link openStream}.
   */
  streamOptions(job, timeoutMs) {
    const controller = new AbortController()
    const onJobAbort = () => controller.abort()
    job.controller?.signal.addEventListener('abort', onJobAbort, { once: true })
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    timer.unref?.()
    return {
      proxy: job.proxy,
      signal: controller.signal,
      onAttempt: (attempt) => {
        const message = String(attempt.error?.message ?? attempt.error)
        this.log(
          job,
          'warn',
          'proxyFallback',
          { protocol: attempt.protocol, message },
          `${attempt.protocol === 'socks5' ? 'SOCKS5' : 'HTTP CONNECT'} did not answer through ${job.proxy.label}: ${message}`,
        )
      },
    }
  }

  /**
   * `fetch` with the headers GitHub requires, decoded as JSON.
   *
   * With a proxy on the job this goes through {@link openStream} instead, so a
   * machine that cannot reach GitHub directly can still look a release up.
   *
   * @param {string} url - GitHub API URL.
   * @param {object|null} [job] - current job, for the proxy and for logging.
   * @returns {Promise<any>} the decoded body.
   */
  async getJson(url, job = null) {
    const headers = { accept: 'application/vnd.github+json', 'user-agent': USER_AGENT }
    if (job === null || job.proxy === null || job.proxy === undefined) {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(METADATA_TIMEOUT_MS) })
      if (!response.ok) {
        throw new EasyTierInstallError(`GitHub returned HTTP ${response.status} for ${url}`, 'release_lookup_failed')
      }
      return response.json()
    }
    const result = await openStream(url, this.streamOptions(job, METADATA_TIMEOUT_MS))
    job.proxyUsed = result.protocol
    const chunks = []
    let size = 0
    for await (const chunk of result.stream) {
      size += chunk.length
      if (size > MAX_METADATA_BYTES) {
        result.stream.destroy()
        throw new EasyTierInstallError(`the response from ${url} is unexpectedly large`, 'release_lookup_failed')
      }
      chunks.push(chunk)
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      throw new EasyTierInstallError(`could not read the release metadata from ${url}`, 'release_lookup_failed')
    }
  }

  /**
   * Resolve the newest stable (`prerelease: false`) release.
   * @param {object} job - current job, for logging.
   * @returns {Promise<{tag: string, version: string, assets: object[]}>} release facts.
   */
  async resolveRelease(job) {
    this.log(job, 'info', 'lookup', {}, 'asking GitHub for the latest stable release')
    let release
    try {
      release = await this.getJson(`${this.releasesUrl}/latest`, job)
    } catch (error) {
      this.log(job, 'warn', 'lookupFallback', { message: String(error?.message ?? error) }, 'latest release lookup failed, listing releases instead')
      const list = await this.getJson(`${this.releasesUrl}?per_page=20`, job)
      release = Array.isArray(list) ? list.find(entry => entry.draft !== true && entry.prerelease !== true) : undefined
    }
    if (release === undefined || release === null) {
      throw new EasyTierInstallError('GitHub did not return a stable EasyTier release', 'release_not_found')
    }
    if (release.prerelease === true) {
      throw new EasyTierInstallError(`the newest release is a prerelease (${release.tag_name}); refusing to install it`, 'prerelease_only')
    }
    const tag = String(release.tag_name ?? '')
    const version = tag.replace(/^v/, '')
    const assets = Array.isArray(release.assets)
      ? release.assets.map(asset => ({
        name: String(asset.name ?? ''),
        size: Number(asset.size ?? 0),
        url: String(asset.browser_download_url ?? ''),
      })).filter(asset => asset.name !== '' && asset.url !== '')
      : []
    return { tag, version, assets }
  }

  /**
   * Pick this machine's archive out of a release.
   * @param {{tag: string, assets: object[]}} release - release facts.
   * @param {object} job - current job, for logging.
   * @returns {{name: string, size: number, url: string}} the asset to download.
   */
  pickAsset(release, job) {
    const triple = releaseTriple(this.platform, this.arch)
    if (triple === null) {
      throw new EasyTierInstallError(
        `EasyTier has no release build for ${this.platform}/${this.arch}; download it manually from the releases page`,
        'unsupported_platform',
      )
    }
    this.log(job, 'info', 'platform', { platform: this.platform, arch: this.arch, triple }, `looking for the ${triple} build`)
    for (const suffix of ARCHIVE_SUFFIXES) {
      const asset = release.assets.find(entry => entry.name.startsWith(`easytier-${triple}-v`) && entry.name.endsWith(suffix))
      if (asset !== undefined) return asset
    }
    const available = release.assets.filter(entry => entry.name.startsWith('easytier-')).map(entry => entry.name)
    throw new EasyTierInstallError(
      `release ${release.tag} has no archive for ${triple} (it ships: ${available.slice(0, 6).join(', ')}...)`,
      'asset_not_found',
    )
  }

  /**
   * Stream the archive to disk, reporting byte progress as it goes.
   * @param {object} job - current job.
   * @param {{name: string, size: number, url: string}} asset - chosen asset.
   * @param {string} targetPath - where to write the archive.
   */
  async download(job, asset, targetPath) {
    const out = createWriteStream(targetPath)
    let received = 0
    let lastReport = 0
    const consume = async (body) => {
      for await (const chunk of body) {
        this.checkCancelled(job)
        received += chunk.length
        job.downloaded = received
        if (!out.write(chunk)) await once(out, 'drain')
        const now = Date.now()
        if (now - lastReport > 250) {
          lastReport = now
          const total = job.total > 0 ? job.total : received
          this.phase(job, 'download', total > 0 ? received / total : 0)
        }
      }
      await new Promise((resolve, reject) => out.end(error => (error === null || error === undefined ? resolve() : reject(error))))
    }
    try {
      if (job.proxy === null || job.proxy === undefined) {
        const response = await fetch(asset.url, {
          headers: { 'user-agent': USER_AGENT, accept: 'application/octet-stream' },
          redirect: 'follow',
          signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
        })
        if (!response.ok || response.body === null) {
          throw new EasyTierInstallError(`download failed with HTTP ${response.status}`, 'download_failed')
        }
        const headerLength = Number(response.headers.get('content-length') ?? 0)
        if (headerLength > 0) job.total = headerLength
        await consume(response.body)
      } else {
        const result = await openStream(asset.url, this.streamOptions(job, DOWNLOAD_TIMEOUT_MS))
        job.proxyUsed = result.protocol
        if (result.total > 0) job.total = result.total
        await consume(result.stream)
      }
    } catch (error) {
      out.destroy()
      throw error
    }
    job.downloaded = received
    this.phase(job, 'download', 1)
    this.log(job, 'info', 'downloaded', { size: formatBytes(received) }, `download finished (${formatBytes(received)})`)
  }

  /** Whether a command can be spawned at all. */
  async hasCommand(command) {
    const probe = this.platform === 'win32'
      ? await runFile('where', [command], 5000)
      : await runFile('sh', ['-c', `command -v ${command}`], 5000)
    return probe.code === 0 && probe.stdout.trim() !== ''
  }

  /**
   * Unpack `archivePath` into `destination` with the platform's own tooling.
   * @param {object} job - current job, for logging.
   * @param {string} archivePath - downloaded archive.
   * @param {string} destination - directory to unpack into.
   * @returns {Promise<string>} the command that worked.
   */
  async extract(job, archivePath, destination) {
    const isZip = /\.zip$/i.test(archivePath)
    const expandArchive = `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`
    const candidates = []
    if (isZip) {
      if (this.platform === 'win32') {
        candidates.push(['tar', ['-xf', archivePath, '-C', destination]])
        candidates.push(['powershell', ['-NoProfile', '-NonInteractive', '-Command', expandArchive]])
        candidates.push(['unzip', ['-o', archivePath, '-d', destination]])
      } else if (this.platform === 'darwin') {
        candidates.push(['tar', ['-xf', archivePath, '-C', destination]])
        candidates.push(['unzip', ['-o', archivePath, '-d', destination]])
      } else {
        candidates.push(['unzip', ['-o', archivePath, '-d', destination]])
        candidates.push(['tar', ['-xf', archivePath, '-C', destination]])
      }
    } else {
      candidates.push(['tar', ['-xzf', archivePath, '-C', destination]])
      candidates.push(['tar', ['-xf', archivePath, '-C', destination]])
    }
    for (const [command, args] of candidates) {
      if (!(await this.hasCommand(command))) {
        this.log(job, 'warn', 'extractMissing', { tool: command }, `${command} is not available, trying the next unpacker`)
        continue
      }
      const result = await runFile(command, args, EXTRACT_TIMEOUT_MS)
      if (result.code === 0) return command
      this.log(job, 'warn', 'extractRetry', { tool: command, message: (result.stderr || result.stdout || '').trim().slice(0, 300) }, `${command} could not unpack the archive, trying the next unpacker`)
    }
    throw new EasyTierInstallError('no available tool could unpack the release archive (tried tar, unzip, Expand-Archive)', 'extract_failed')
  }

  /**
   * Collect the EasyTier executables inside an unpacked release.
   * @param {string} dir - unpacked directory tree.
   * @returns {{name: string, path: string}[]} binaries by name.
   */
  locateBinaries(dir) {
    const wanted = new Set(binaryNames(this.platform))
    const found = []
    for (const file of walkFiles(dir)) {
      const name = file.slice(file.lastIndexOf(this.platform === 'win32' ? '\\' : '/') + 1)
      if (!wanted.has(name)) continue
      if (found.some(entry => entry.name === name)) continue
      found.push({ name, path: file })
    }
    return found
  }

  /** Cancel any job (used when the plugin unmounts). */
  dispose() {
    if (this.job !== null && this.job.status === 'running') this.cancel()
  }
}
