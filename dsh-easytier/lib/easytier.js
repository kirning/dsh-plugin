/**
 * The EasyTier domain service.
 *
 * One implementation of every operation, shared by the HTTP routes (the panel)
 * and the agent tool, so a terminal managed in the UI behaves exactly like one
 * managed by the model.
 *
 * Operations are grouped by the EasyTier feature they drive:
 * discovery/service status, terminals, port forwarding, whitelist, temporary
 * credentials, connectors, reachability probes, and a raw CLI escape hatch.
 *
 * @module dsh-easytier/lib/easytier
 */

import { connect } from 'node:net'
import {
  accessSync,
  constants as fsConstants,
  copyFileSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { runFile, discover as discoverRaw } from './discover.js'
import { cliJson, cliText, runCli } from './cli.js'
import {
  parseAclSummary,
  parseConnectors,
  parseCredentialGenerate,
  parseCredentials,
  parseNode,
  parsePeerCenter,
  parsePing,
  parsePortForwards,
  parsePortForwardTable,
  parseVpnPortal,
  parseWhitelist,
  mergeTerminals,
} from './ops.js'

/** Failure carrying a user-facing reason. */
export class EasyTierError extends Error {
  constructor(message, code = 'easytier_error') {
    super(message)
    this.name = 'EasyTierError'
    this.code = code
  }
}

/** How long a discovery result is reused before re-probing the machine. */
const DISCOVERY_TTL_MS = 5000

/** Ping packet count used by the reachability probe. */
const PROBE_COUNT = 3

/** Domain service over one or more running EasyTier cores. */
export class EasytierService {
  /**
   * @param {{cliPath?: string, rpcPortal?: string, configFile?: string, discoveryCacheMs?: number}} config - overrides;
   *   all optional, used to pin a CLI path or portal when auto-detection cannot.
   */
  constructor(config = {}) {
    this.overrides = {
      ...(typeof config.cliPath === 'string' && config.cliPath !== '' ? { cliPath: config.cliPath } : {}),
      ...(typeof config.rpcPortal === 'string' && config.rpcPortal !== '' ? { rpcPortal: config.rpcPortal } : {}),
      ...(typeof config.configFile === 'string' && config.configFile !== '' ? { configFile: config.configFile } : {}),
    }
    this.ttlMs = Number.isFinite(config.discoveryCacheMs) ? Number(config.discoveryCacheMs) : DISCOVERY_TTL_MS
    this.cache = null
    this.pending = null
  }

  /** Drop the cached discovery result (after a mutation or service action). */
  invalidate() {
    this.cache = null
  }

  /**
   * Discover running cores, reusing a recent result.
   * @param {{force?: boolean}} options - force re-probes the machine.
   * @returns {Promise<{platform: string, instances: object[], diagnostics: object}>}
   */
  async discover(options = {}) {
    const now = Date.now()
    if (options.force !== true && this.cache !== null && now - this.cache.at < this.ttlMs) return this.cache.value
    if (this.pending !== null) return this.pending
    this.pending = (async () => {
      try {
        const value = await discoverRaw(this.overrides)
        this.cache = { at: Date.now(), value }
        return value
      } finally {
        this.pending = null
      }
    })()
    return this.pending
  }

  /**
   * Resolve the instance an operation targets, failing with an actionable reason.
   * @param {string|undefined} instanceId - instance id (PID), portal, or undefined for the first.
   */
  async requireInstance(instanceId) {
    const state = await this.discover()
    if (state.instances.length === 0) {
      throw new EasyTierError(
        'No running easytier-core process was found on this machine. Start EasyTier (service or GUI) and refresh.',
        'no_instance',
      )
    }
    const wanted = instanceId === undefined || instanceId === '' ? undefined : String(instanceId)
    const instance = wanted === undefined
      ? state.instances[0]
      : state.instances.find(entry => entry.id === wanted || entry.rpcPortal === wanted || String(entry.pid) === wanted)
    if (instance === undefined) {
      throw new EasyTierError(`Unknown EasyTier instance "${wanted}". Known: ${state.instances.map(entry => entry.id).join(', ')}.`, 'unknown_instance')
    }
    if (instance.cliPath === undefined) {
      throw new EasyTierError(
        'Found easytier-core but no easytier-cli binary next to it or on PATH. Set "cliPath" in the plugin config.',
        'cli_missing',
      )
    }
    if (instance.online !== true || instance.rpcPortal === undefined) {
      throw new EasyTierError(
        `easytier-core (pid ${instance.pid}) is running but its RPC portal did not answer on ${instance.ports.join('/') || 'any port'}. ` +
        'The instance may still be starting, or its rpc_portal is not a local loopback port.',
        'portal_unreachable',
      )
    }
    return instance
  }

  /** Project one discovered instance into the shape the UI/tool consume. */
  static publicInstance(instance) {
    const node = parseNode(instance.node)
    return {
      id: instance.id,
      pid: instance.pid,
      process: instance.process,
      managedBy: instance.managedBy,
      service: instance.service,
      exePath: instance.exePath,
      cliPath: instance.cliPath,
      configPath: instance.configPath,
      configSummary: instance.configSummary,
      rpcPortal: instance.rpcPortal,
      online: instance.online,
      ports: instance.ports,
      hostname: node?.hostname ?? instance.configSummary?.instanceName ?? '',
      ipv4: node?.ipv4 ?? instance.configSummary?.ipv4 ?? '',
      node,
    }
  }

  /**
   * The panel's primary payload: everything needed to render the overview.
   * @param {{force?: boolean}} options - force re-discovery.
   */
  async snapshot(options = {}) {
    const state = await this.discover({ force: options.force === true })
    const instances = state.instances.map(instance => EasytierService.publicInstance(instance))
    return {
      available: instances.some(instance => instance.online),
      platform: state.platform,
      takenAt: Date.now(),
      instances,
      activeId: instances.length > 0 ? instances[0].id : null,
      diagnostics: state.diagnostics,
    }
  }

  /**
   * Every terminal currently in the network.
   * @param {string|undefined} instanceId - target instance.
   */
  async terminals(instanceId) {
    const instance = await this.requireInstance(instanceId)
    const [peers, routes] = await Promise.all([
      cliJson(instance.cliPath, instance.rpcPortal, ['peer']),
      cliJson(instance.cliPath, instance.rpcPortal, ['route']),
    ])
    if (!peers.ok && !routes.ok) throw new EasyTierError(peers.error ?? routes.error ?? 'peer/route query failed', 'query_failed')
    const terminals = mergeTerminals(peers.data, routes.data)
    return { instanceId: instance.id, terminals }
  }

  /**
   * Identity, listeners, topology and service state for the status tab.
   * @param {string|undefined} instanceId - target instance.
   */
  async info(instanceId) {
    const instance = await this.requireInstance(instanceId)
    const [node, proxy, vpn, acl, center] = await Promise.all([
      cliJson(instance.cliPath, instance.rpcPortal, ['node']),
      cliJson(instance.cliPath, instance.rpcPortal, ['proxy']),
      cliJson(instance.cliPath, instance.rpcPortal, ['vpn-portal']),
      cliJson(instance.cliPath, instance.rpcPortal, ['acl', 'stats']),
      cliJson(instance.cliPath, instance.rpcPortal, ['peer-center']),
    ])
    const service = await this.serviceStatus(instance).catch(() => null)
    return {
      instance: EasytierService.publicInstance({ ...instance, node: node.ok ? node.data : instance.node }),
      node: node.ok ? parseNode(node.data) : parseNode(instance.node),
      proxy: Array.isArray(proxy.data) ? proxy.data : [],
      vpnPortal: vpn.ok ? parseVpnPortal(vpn.data) : null,
      acl: acl.ok ? parseAclSummary(acl.data) : null,
      peerCenter: center.ok ? parsePeerCenter(center.data) : [],
      service,
    }
  }

  // ------------------------------------------------------------ port forward

  /**
   * List port-forward rules, decoding the binary JSON form and falling back to
   * the human table when an address shape is not decodable.
   * @param {string|undefined} instanceId - target instance.
   */
  async portForwards(instanceId) {
    const instance = await this.requireInstance(instanceId)
    const result = await cliJson(instance.cliPath, instance.rpcPortal, ['port-forward', 'list'])
    if (result.ok) {
      const rules = parsePortForwards(result.data)
      if (rules !== undefined) return { instanceId: instance.id, rules }
    }
    const table = await cliText(instance.cliPath, instance.rpcPortal, ['port-forward', 'list'])
    if (!table.ok) throw new EasyTierError(table.error ?? result.error ?? 'port-forward list failed', 'query_failed')
    return { instanceId: instance.id, rules: parsePortForwardTable(table.text) }
  }

  /**
   * Add a port-forward rule: expose a destination reachable over the tunnel on
   * a local bind address.
   * @param {string|undefined} instanceId - target instance.
   * @param {{protocol: string, bind: string, dst: string}} rule - rule to add.
   */
  async addPortForward(instanceId, rule) {
    const instance = await this.requireInstance(instanceId)
    const protocol = normalizeProtocol(rule.protocol)
    const bind = normalizeAddress(rule.bind, 'bind')
    const dst = normalizeAddress(rule.dst, 'dst')
    const result = await cliText(instance.cliPath, instance.rpcPortal, ['port-forward', 'add', protocol, bind, dst])
    this.invalidate()
    if (!result.ok) throw new EasyTierError(result.error ?? 'port-forward add failed', 'mutation_failed')
    return { ok: true, message: result.text || `added ${protocol} ${bind} -> ${dst}`, rule: { protocol, bind, dst } }
  }

  /**
   * Remove port-forward rules. EasyTier only matches when the destination is
   * also supplied, so a bind-only request is resolved against the live list.
   * @param {string|undefined} instanceId - target instance.
   * @param {{protocol: string, bind: string, dst?: string}} rule - rule to remove.
   */
  async removePortForward(instanceId, rule) {
    const instance = await this.requireInstance(instanceId)
    const protocol = normalizeProtocol(rule.protocol)
    const bind = normalizeAddress(rule.bind, 'bind')
    const explicitDst = typeof rule.dst === 'string' && rule.dst.trim() !== '' ? normalizeAddress(rule.dst, 'dst') : undefined

    let targets
    if (explicitDst !== undefined) {
      targets = [explicitDst]
    } else {
      const { rules } = await this.portForwards(instance.id)
      const matches = rules.filter(entry => entry.protocol === protocol && entry.bind === bind)
      if (matches.length === 0) throw new EasyTierError(`no ${protocol} rule bound to ${bind}`, 'not_found')
      targets = matches.map(entry => entry.dst)
    }

    const messages = []
    for (const dst of targets) {
      const result = await cliText(instance.cliPath, instance.rpcPortal, ['port-forward', 'remove', protocol, bind, dst])
      if (!result.ok) throw new EasyTierError(result.error ?? 'port-forward remove failed', 'mutation_failed')
      messages.push(result.text || `removed ${protocol} ${bind} -> ${dst}`)
    }
    this.invalidate()
    return { ok: true, message: messages.join('\n'), removed: targets.length }
  }

  // --------------------------------------------------------------- whitelist

  /** Current TCP/UDP service whitelist of this node. */
  async whitelist(instanceId) {
    const instance = await this.requireInstance(instanceId)
    const result = await cliJson(instance.cliPath, instance.rpcPortal, ['whitelist', 'show'])
    if (!result.ok) throw new EasyTierError(result.error ?? 'whitelist show failed', 'query_failed')
    return { instanceId: instance.id, whitelist: parseWhitelist(result.data) }
  }

  /**
   * Replace one whitelist. An empty list clears it.
   * @param {string|undefined} instanceId - target instance.
   * @param {{kind: string, ports: string}} request - `kind` is tcp|udp, `ports` is CLI syntax.
   */
  async setWhitelist(instanceId, request) {
    const instance = await this.requireInstance(instanceId)
    const kind = normalizeProtocol(request.kind)
    const ports = String(request.ports ?? '').trim()
    if (ports === '') return this.clearWhitelist(instanceId, { kind })
    if (!/^[\d,\-\s]+$/.test(ports)) throw new EasyTierError('ports must look like "80,443,8000-9000"', 'invalid_argument')
    const result = await cliText(instance.cliPath, instance.rpcPortal, ['whitelist', `set-${kind}`, ports])
    if (!result.ok) throw new EasyTierError(result.error ?? 'whitelist update failed', 'mutation_failed')
    return { ok: true, message: result.text }
  }

  /** Clear one whitelist. */
  async clearWhitelist(instanceId, request) {
    const instance = await this.requireInstance(instanceId)
    const kind = normalizeProtocol(request.kind)
    const result = await cliText(instance.cliPath, instance.rpcPortal, ['whitelist', `clear-${kind}`])
    if (!result.ok) throw new EasyTierError(result.error ?? 'whitelist clear failed', 'mutation_failed')
    return { ok: true, message: result.text }
  }

  // ------------------------------------------------------------- credentials

  /** Active temporary credentials. */
  async credentials(instanceId) {
    const instance = await this.requireInstance(instanceId)
    const result = await cliJson(instance.cliPath, instance.rpcPortal, ['credential', 'list'])
    if (!result.ok) throw new EasyTierError(result.error ?? 'credential list failed', 'query_failed')
    return { instanceId: instance.id, credentials: parseCredentials(result.data) }
  }

  /**
   * Issue a temporary credential so a new terminal can join the network.
   * The secret is returned once, by EasyTier's own design.
   * @param {string|undefined} instanceId - target instance.
   * @param {{ttl: number, id?: string, groups?: string, allowRelay?: boolean, reusable?: boolean, allowedProxyCidrs?: string}} request - credential options.
   */
  async generateCredential(instanceId, request) {
    const instance = await this.requireInstance(instanceId)
    const ttl = Number(request.ttl)
    if (!Number.isFinite(ttl) || ttl <= 0) throw new EasyTierError('ttl must be a positive number of seconds', 'invalid_argument')
    const args = ['credential', 'generate', '--ttl', String(Math.round(ttl))]
    if (typeof request.id === 'string' && request.id.trim() !== '') args.push('--credential-id', request.id.trim())
    if (typeof request.groups === 'string' && request.groups.trim() !== '') args.push('--groups', request.groups.trim())
    if (request.allowRelay === true) args.push('--allow-relay')
    if (typeof request.reusable === 'boolean') args.push('--reusable', String(request.reusable))
    if (typeof request.allowedProxyCidrs === 'string' && request.allowedProxyCidrs.trim() !== '') {
      args.push('--allowed-proxy-cidrs', request.allowedProxyCidrs.trim())
    }
    const result = await cliText(instance.cliPath, instance.rpcPortal, args)
    if (!result.ok) throw new EasyTierError(result.error ?? 'credential generate failed', 'mutation_failed')
    const parsed = parseCredentialGenerate(result.text)
    return { ok: true, ...parsed, message: result.text }
  }

  /** Revoke a temporary credential by id. */
  async revokeCredential(instanceId, request) {
    const instance = await this.requireInstance(instanceId)
    const id = String(request.id ?? '').trim()
    if (id === '') throw new EasyTierError('a credential id is required', 'invalid_argument')
    const result = await cliText(instance.cliPath, instance.rpcPortal, ['credential', 'revoke', id])
    if (!result.ok) throw new EasyTierError(result.error ?? 'credential revoke failed', 'mutation_failed')
    return { ok: true, message: result.text }
  }

  // --------------------------------------------------------------- connectors

  /** Outbound peer connections this node maintains. */
  async connectors(instanceId) {
    const instance = await this.requireInstance(instanceId)
    const result = await cliJson(instance.cliPath, instance.rpcPortal, ['connector', 'list'])
    if (!result.ok) throw new EasyTierError(result.error ?? 'connector list failed', 'query_failed')
    return { instanceId: instance.id, connectors: parseConnectors(result.data) }
  }

  /** Dial an additional peer URL. */
  async addConnector(instanceId, request) {
    const instance = await this.requireInstance(instanceId)
    const url = normalizeConnectorUrl(request.url)
    const result = await cliText(instance.cliPath, instance.rpcPortal, ['connector', 'add', url])
    this.invalidate()
    if (!result.ok) throw new EasyTierError(result.error ?? 'connector add failed', 'mutation_failed')
    return { ok: true, message: result.text || `connector added: ${url}` }
  }

  /** Stop dialing a peer URL. */
  async removeConnector(instanceId, request) {
    const instance = await this.requireInstance(instanceId)
    const url = normalizeConnectorUrl(request.url)
    const result = await cliText(instance.cliPath, instance.rpcPortal, ['connector', 'remove', url])
    this.invalidate()
    if (!result.ok) throw new EasyTierError(result.error ?? 'connector remove failed', 'mutation_failed')
    return { ok: true, message: result.text || `connector removed: ${url}` }
  }

  // ------------------------------------------------------------------ probes

  /**
   * Reachability probe for one terminal: ICMP over the tunnel and, when a port
   * is given, a TCP connect to that service.
   * @param {string|undefined} instanceId - target instance.
   * @param {{target: string, port?: number, count?: number}} request - terminal selector.
   */
  async probe(instanceId, request) {
    const instance = await this.requireInstance(instanceId)
    const { terminals } = await this.terminals(instance.id)
    const selector = String(request.target ?? '').trim()
    if (selector === '') throw new EasyTierError('target (virtual IP or hostname) is required', 'invalid_argument')
    const terminal = terminals.find(entry => entry.ipv4 === selector)
      ?? terminals.find(entry => entry.hostname.toLowerCase() === selector.toLowerCase())
      ?? terminals.find(entry => entry.cidr === selector)
    if (terminal === undefined) {
      throw new EasyTierError(
        `"${selector}" is not a terminal in this network. Known terminals: ${terminals.map(entry => `${entry.hostname}(${entry.ipv4})`).join(', ')}.`,
        'unknown_terminal',
      )
    }
    const count = Number.isFinite(Number(request.count)) && Number(request.count) > 0 ? Math.min(Number(request.count), 10) : PROBE_COUNT
    const ping = await this.ping(terminal.ipv4, count)
    const port = Number(request.port)
    const tcp = Number.isFinite(port) && port > 0 ? await tcpProbe(terminal.ipv4, port) : null
    return {
      instanceId: instance.id,
      terminal,
      ping,
      tcp,
      reachable: ping.received !== null ? ping.received > 0 : (tcp?.connected ?? false),
    }
  }

  /**
   * ICMP ping one address.
   *
   * Windows is handled through .NET's Ping rather than `ping.exe`: the console
   * tool prints in the OEM code page (GBK on a zh-CN host), so its output is
   * both unreadable and impossible to parse by locale-independent means. The
   * .NET call returns structured status and round-trip times directly.
   * @param {string} address - destination IPv4 or hostname.
   * @param {number} count - number of echo requests.
   */
  async ping(address, count = PROBE_COUNT) {
    if (process.platform === 'win32') return this.pingWindows(address, count)
    const result = await runFile('ping', ['-c', String(count), '-W', '2', address], 15000)
    const parsed = parsePing(`${result.stdout}\n${result.stderr}`)
    return { ...parsed, exitCode: result.code, ok: parsed.received !== null && parsed.received > 0 }
  }

  /** Structured ICMP probe through System.Net.NetworkInformation.Ping. */
  async pingWindows(address, count) {
    const target = escapeSingle(address)
    const script = [
      "$ErrorActionPreference = 'SilentlyContinue'",
      `$target = '${target}'`,
      `$count = ${Math.max(1, Math.min(10, Math.round(count)))}`,
      'if ($count -lt 1) { $count = 1 }',
      'try { $p = New-Object System.Net.NetworkInformation.Ping } catch { Write-Output "0|0|"; exit 0 }',
      '$ok = 0',
      '$times = @()',
      'for ($i = 0; $i -lt $count; $i++) {',
      '  try {',
      '    $reply = $p.Send($target, 1500)',
      "    if ($reply.Status -eq [System.Net.NetworkInformation.IPStatus]::Success) { $ok = $ok + 1; $times += $reply.RoundtripTime }",
      '  } catch { }',
      '}',
      '$avg = ""',
      'if ($times.Count -gt 0) { $avg = [math]::Round((($times | Measure-Object -Average).Average), 1) }',
      'Write-Output "$count|$ok|$avg"',
    ].join('\n')

    const result = await runFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], 20000)
    const parts = result.stdout.trim().split('|')
    const sent = Number(parts[0])
    const received = Number(parts[1])
    const avg = parts.length > 2 && parts[2] !== '' ? Number(parts[2]) : null
    const validSent = Number.isFinite(sent) ? sent : null
    const validReceived = Number.isFinite(received) ? received : null
    const lossPercent = validSent !== null && validSent > 0 && validReceived !== null
      ? Math.round(((validSent - validReceived) / validSent) * 1000) / 10
      : null
    return {
      sent: validSent,
      received: validReceived,
      lossPercent,
      avgMs: avg !== null && Number.isFinite(avg) ? avg : null,
      raw: validSent === null
        ? (result.error ?? 'ping failed')
        : `${validReceived ?? 0}/${validSent} replies${lossPercent === null ? '' : `, ${lossPercent}% loss`}${avg === null ? '' : `, ${avg} ms average`}`,
      exitCode: result.code,
      ok: validReceived !== null && validReceived > 0,
    }
  }

  // ----------------------------------------------------------------- service

  /**
   * Read the Windows/launchd/systemd state of the EasyTier service.
   * @param {object} instance - discovered instance.
   */
  async serviceStatus(instance) {
    if (instance.service === null || instance.service === undefined) {
      return { name: null, status: 'not-a-service', startMode: null, note: 'This core was started directly (not as a system service).' }
    }
    const name = instance.service.name
    if (process.platform === 'win32') {
      // Get-Service covers status without elevation; the SCM `Start` value in
      // the registry gives the startup type. CIM is deliberately avoided: WMI
      // access is commonly denied to the unelevated account this plugin runs as.
      const safe = escapeSingle(name.replace(/'/g, ''))
      const result = await runFile('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        `$s = Get-Service -Name '${safe}' -ErrorAction SilentlyContinue; ` +
        `if ($s) { $start = (Get-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\${safe}" -ErrorAction SilentlyContinue).Start; "$($s.Status)|$start" }`,
      ], 15000)
      const text = result.stdout.trim()
      if (text === '') return { name, status: instance.service.status ?? 'unknown', startMode: null }
      const [status, startValue] = text.split('|')
      const startModes = { '0': 'Boot', '1': 'System', '2': 'Automatic', '3': 'Manual', '4': 'Disabled' }
      return { name, status: status ?? 'unknown', startMode: startModes[String(startValue)] ?? null }
    }
    const result = await runFile('systemctl', ['is-active', name], 8000)
    return { name, status: result.stdout.trim() || 'unknown', startMode: null }
  }

  /**
   * Start, stop or restart the EasyTier service. Needs an elevated session;
   * the failure is reported verbatim when it is not.
   * @param {string|undefined} instanceId - target instance.
   * @param {{action: string}} request - start|stop|restart|status.
   */
  async serviceAction(instanceId, request) {
    const instance = await this.requireInstance(instanceId)
    const action = String(request.action ?? '').toLowerCase()
    if (!['start', 'stop', 'restart', 'status'].includes(action)) {
      throw new EasyTierError('action must be one of start, stop, restart, status', 'invalid_argument')
    }
    if (action === 'status') return { ok: true, service: await this.serviceStatus(instance) }
    if (instance.service === null || instance.service === undefined) {
      throw new EasyTierError('This core was not started as a system service, so it cannot be controlled here.', 'not_a_service')
    }
    const name = instance.service.name
    let result
    if (process.platform === 'win32') {
      const verb = action === 'start' ? 'Start-Service' : action === 'stop' ? 'Stop-Service' : 'Restart-Service'
      const force = action === 'start' ? '' : ' -Force'
      result = await runFile('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        `$ErrorActionPreference='Stop'; ${verb} -Name '${name.replace(/'/g, '')}'${force}; (Get-Service -Name '${name.replace(/'/g, '')}').Status`,
      ], 40000)
    } else {
      result = await runFile('systemctl', [action, name], 40000)
    }
    this.invalidate()
    const text = `${result.stdout}\n${result.stderr}`.trim()
    if (result.code !== 0) {
      const elevated = /拒绝访问|Access is denied|权限|root/i.test(text)
      throw new EasyTierError(
        `${action} failed${elevated ? ' (this operation needs an elevated/Administrator session)' : ''}: ${text || `exit code ${result.code}`}`,
        'service_failed',
      )
    }
    return { ok: true, message: text, service: await this.serviceStatus(instance).catch(() => null) }
  }

  // ------------------------------------------------------------------ config

  /**
   * Read the config file the running instance was started with.
   *
   * The raw text is returned verbatim — this is the user's own configuration
   * file and the panel is the editor for it. Consumers that put text into a
   * model-facing transcript (the agent tool) must mask it with `redactConfig`.
   * @param {string|undefined} instanceId - target instance.
   */
  async readConfig(instanceId) {
    const instance = await this.requireInstance(instanceId)
    if (instance.configPath === undefined || instance.configPath === '') {
      throw new EasyTierError(
        'This instance was not started with --config-file (or --config-dir), so no config file is known for it.',
        'no_config_file',
      )
    }
    const path = instance.configPath
    let content = ''
    let exists = false
    let size = null
    let mtimeMs = null
    try {
      const info = statSync(path)
      content = readFileSync(path, 'utf8')
      exists = true
      size = info.size
      mtimeMs = info.mtimeMs
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new EasyTierError(`Cannot read ${path}: ${error.message}`, 'config_unreadable')
      }
    }
    return {
      instanceId: instance.id,
      path,
      exists,
      content,
      size,
      mtimeMs,
      writable: canWrite(path),
      managedBy: instance.managedBy,
      // The file carries the shared network secret; the panel warns about it.
      containsSecret: /network_secret\s*=\s*\S/.test(content),
      backupFiles: listConfigBackups(path),
    }
  }

  /**
   * Validate and save config file text for one instance.
   *
   * Safety properties:
   *  - only the path discovered for the instance is ever written (no
   *    client-supplied path is accepted);
   *  - redacted text (`network_secret = "***"`) is refused, so masked content
   *    can never overwrite the real secret;
   *  - optional line-level lint gives a concrete hint, then
   *    `easytier-core --check-config` decides whether the text parses;
   *  - the previous file is copied to `<path>.bak.<epoch>` first, and the new
   *    text lands through a temp file + rename so a partial write is impossible.
   * @param {string|undefined} instanceId - target instance.
   * @param {{content: string, skipValidation?: boolean}} request - new file text.
   */
  async writeConfig(instanceId, request) {
    const instance = await this.requireInstance(instanceId)
    if (instance.configPath === undefined || instance.configPath === '') {
      throw new EasyTierError(
        'This instance was not started with --config-file (or --config-dir), so there is no config file to save.',
        'no_config_file',
      )
    }
    const path = instance.configPath
    const content = typeof request.content === 'string' ? request.content : ''
    if (content.trim() === '') throw new EasyTierError('config content is empty', 'invalid_argument')
    if (content.length > 256 * 1024) throw new EasyTierError('config content is too large (limit 256 KiB)', 'invalid_argument')
    if (/network_secret\s*=\s*"\*\*\*"/.test(content)) {
      throw new EasyTierError(
        'refusing to save a redacted network_secret ("***"): it would overwrite the real secret. Edit the file in the panel, which shows the actual value.',
        'invalid_argument',
      )
    }
    if (!canWrite(path)) {
      throw new EasyTierError(`no write permission on ${path}; saving needs an account allowed to modify it (Administrators).`, 'permission_denied')
    }

    const issues = lintToml(content)
    if (issues.length > 0) {
      throw new EasyTierError(`config does not look like valid TOML — ${issues[0].message}`, 'config_invalid')
    }
    if (request.skipValidation !== true) {
      const validation = await this.validateConfigContent(instance, content)
      if (validation.ok !== true) throw new EasyTierError(validation.message, 'config_invalid')
    }

    let backupPath = null
    try {
      if (statSync(path).isFile()) {
        backupPath = `${path}.bak.${Math.floor(Date.now() / 1000)}`
        copyFileSync(path, backupPath)
      }
    } catch {
      /* no previous file to back up */
    }

    const tempPath = `${path}.tmp-${randomUUID().slice(0, 8)}`
    try {
      writeFileSync(tempPath, content, 'utf8')
      renameSync(tempPath, path)
    } catch (error) {
      try {
        unlinkSync(tempPath)
      } catch {
        /* temp already gone */
      }
      throw new EasyTierError(`failed to write ${path}: ${error.message}`, 'config_write_failed')
    }
    this.invalidate()

    const warnings = []
    if (!/network_identity/.test(content)) warnings.push('missing [network_identity]: the node may not join the expected network')
    if (!/\bipv4\s*=/.test(content) && !/\bdhcp\s*=\s*true/.test(content)) warnings.push('no ipv4 and dhcp is not enabled: the node may start without a virtual address')
    return {
      ok: true,
      path,
      backupPath,
      savedAt: Date.now(),
      needsRestart: true,
      warnings,
      serviceName: instance.service !== null && instance.service !== undefined ? instance.service.name : null,
    }
  }

  /**
   * Validate candidate config text with `easytier-core --check-config`.
   * The check parses the TOML and the known keys; it reports a non-zero exit
   * but no message, so the failure text stays generic.
   */
  async validateConfigContent(instance, content) {
    const core = coreBinaryFor(instance)
    if (core === undefined) return { ok: true, skipped: true }
    const tempPath = join(tmpdir(), `dsh-easytier-check-${randomUUID().slice(0, 8)}.toml`)
    try {
      writeFileSync(tempPath, content, 'utf8')
      const result = await runFile(core, ['--check-config', '--config-file', tempPath], 20000)
      if (result.code === 0) return { ok: true, skipped: false }
      const detail = `${result.stderr}\n${result.stdout}`.trim()
      return {
        ok: false,
        message: `EasyTier rejected this config (easytier-core --check-config exited ${result.code ?? 'null'})` +
          (detail !== '' ? `: ${detail}` : '. Check TOML syntax, quoting, and section names.'),
      }
    } finally {
      try {
        unlinkSync(tempPath)
      } catch {
        /* already removed */
      }
    }
  }

  // -------------------------------------------------------------------- misc

  /**
   * Raw `easytier-cli` escape hatch for anything the typed actions do not cover.
   * @param {string|undefined} instanceId - target instance.
   * @param {{args: string[]}} request - subcommand argv.
   */
  async runRaw(instanceId, request) {
    const instance = await this.requireInstance(instanceId)
    const args = Array.isArray(request.args) ? request.args.map(String).filter(part => part !== '') : []
    if (args.length === 0) throw new EasyTierError('args is required, e.g. ["stats","show"]', 'invalid_argument')
    const result = await runCli(instance.cliPath, instance.rpcPortal, args, { json: false, noTrunc: true })
    return { ok: result.ok, output: result.raw, exitCode: result.code, ...(result.error !== undefined ? { error: result.error } : {}) }
  }
}

/** Validate and normalise a protocol name. */
function normalizeProtocol(value) {
  const text = String(value ?? '').toLowerCase()
  if (text !== 'tcp' && text !== 'udp') throw new EasyTierError('protocol must be tcp or udp', 'invalid_argument')
  return text
}

/** Validate a `host:port` / `ip:port` endpoint. */
function normalizeAddress(value, field) {
  const text = String(value ?? '').trim()
  const match = /^(\d{1,3}(?:\.\d{1,3}){3}|\[[0-9a-fA-F:]+\]|[a-zA-Z0-9_.-]+):(\d{1,5})$/.exec(text)
  if (match === null) throw new EasyTierError(`${field} must look like 0.0.0.0:8080 or 10.0.0.1:80`, 'invalid_argument')
  const port = Number(match[2])
  if (!Number.isFinite(port) || port < 1 || port > 65535) throw new EasyTierError(`${field} port must be 1-65535`, 'invalid_argument')
  return text
}

/** Validate a connector URL. */
function normalizeConnectorUrl(value) {
  const text = String(value ?? '').trim()
  if (!/^(tcp|udp|ws|wss|ring|quic):\/\/\S+$/i.test(text)) {
    throw new EasyTierError('url must look like tcp://1.2.3.4:11010', 'invalid_argument')
  }
  return text
}

/** Escape a PowerShell single-quoted literal body. */
function escapeSingle(value) {
  return String(value).replace(/'/g, "''")
}

/**
 * Whether the current process may write this path, without mutating it.
 * A missing file is writable when its directory is writable.
 */
function canWrite(path) {
  try {
    accessSync(path, fsConstants.W_OK)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        accessSync(dirname(path), fsConstants.W_OK)
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

/** Existing `<config>.bak.*` siblings, newest first (EasyTier writes the same shape). */
function listConfigBackups(path) {
  try {
    const base = basename(path)
    return readdirSync(dirname(path))
      .filter(name => name.startsWith(`${base}.bak.`))
      .sort()
      .reverse()
      .slice(0, 10)
  } catch {
    return []
  }
}

/** Locate the `easytier-core` binary that pairs with a discovered instance. */
function coreBinaryFor(instance) {
  const exeName = process.platform === 'win32' ? 'easytier-core.exe' : 'easytier-core'
  const candidates = []
  if (typeof instance.exePath === 'string' && instance.exePath !== '') candidates.push(instance.exePath)
  if (typeof instance.cliPath === 'string' && instance.cliPath !== '') candidates.push(join(dirname(instance.cliPath), exeName))
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      /* try the next candidate */
    }
  }
  return undefined
}

/** Remove a trailing TOML comment that is outside any string literal. */
function stripTomlComment(line) {
  let quote = ''
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (quote !== '') {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '#') return line.slice(0, index)
  }
  return line
}

/** Whether every quote opened on this fragment is also closed. */
function isBalancedQuotes(value) {
  let quote = ''
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (quote !== '') {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") quote = char
  }
  return quote === ''
}

/**
 * Cheap line-level TOML lint.
 *
 * `easytier-core --check-config` answers pass/fail without any message, so this
 * pre-pass exists purely to name the offending line when the text is obviously
 * malformed. It is deliberately conservative: it never rejects text it does not
 * understand.
 * @param {string} text - candidate config.
 * @returns {Array<{line: number, message: string}>} issues, empty when plausible.
 */
function lintToml(text) {
  const issues = []
  const lines = text.split(/\r?\n/)
  let inMultiline = false
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]
    if (raw.includes('"""') || raw.includes("'''")) inMultiline = !inMultiline
    if (inMultiline) continue
    const line = stripTomlComment(raw).trim()
    if (line === '') continue
    if (line.startsWith('[')) {
      if (!/^\[\[?.+\]\]?$/.test(line)) {
        issues.push({ line: index + 1, message: `line ${index + 1}: malformed section header "${line}"` })
      }
      continue
    }
    if (!line.includes('=')) {
      issues.push({ line: index + 1, message: `line ${index + 1}: expected "key = value" but found "${line.slice(0, 60)}"` })
      continue
    }
    if (!isBalancedQuotes(line.slice(line.indexOf('=') + 1))) {
      issues.push({ line: index + 1, message: `line ${index + 1}: unbalanced quotes` })
    }
  }
  return issues
}

/**
 * TCP connect probe with a bounded timeout.
 * @param {string} host - destination address.
 * @param {number} port - destination port.
 * @param {number} timeoutMs - connect deadline.
 */
export function tcpProbe(host, port, timeoutMs = 3000) {
  const started = Date.now()
  return new Promise(resolve => {
    let settled = false
    const socket = connect({ host, port })
    const finish = value => {
      if (settled) return
      settled = true
      try {
        socket.destroy()
      } catch {
        /* already closed */
      }
      resolve(value)
    }
    socket.setTimeout(timeoutMs, () => finish({ connected: false, latencyMs: null, error: 'timeout' }))
    socket.once('connect', () => finish({ connected: true, latencyMs: Date.now() - started, error: null }))
    socket.once('error', error => finish({ connected: false, latencyMs: null, error: String(error.code ?? error.message ?? error) }))
  })
}
