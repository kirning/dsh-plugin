/**
 * The `easytier` agent tool.
 *
 * Registered as a plain definition object rather than through `defineTool`, so
 * this package needs no runtime dependency: `parameters` and `output.schema`
 * are written directly in the supported JSON-Schema subset, and every action
 * returns one rendered text block.
 *
 * The tool calls the same `EasytierService` methods as the panel, so a network
 * managed in the UI is immediately operable by the model and vice versa.
 *
 * @module dsh-easytier/lib/tools
 */

import { EasyTierError } from './easytier.js'
import { redactConfig } from './ops.js'

/** One text content block. */
function text(value) {
  return [{ type: 'text', text: value }]
}

/** Render the instance list. */
function renderInstances(snapshot) {
  if (snapshot.instances.length === 0) {
    const hint = snapshot.diagnostics?.cliMissing === true
      ? ' Easytier is running but no easytier-cli was found; set cliPath in the plugin config.'
      : ''
    return `No running easytier-core process was found on this machine.${hint}`
  }
  const header = 'id | hostname | virtual ip | portal | managed by | online | config'
  const separator = '--- | --- | --- | --- | --- | --- | ---'
  const rows = snapshot.instances.map(instance => [
    instance.id,
    instance.hostname || '-',
    instance.ipv4 || '-',
    instance.rpcPortal ?? '-',
    instance.managedBy === 'service' ? `service:${instance.service?.name ?? 'easytier'}` : 'process',
    instance.online ? 'yes' : 'no',
    instance.configPath ?? '-',
  ].join(' | '))
  return [header, separator, ...rows].join('\n')
}

/** Render the terminal table. */
function renderTerminals(payload) {
  const { terminals } = payload
  if (terminals.length === 0) return 'The EasyTier network currently has no terminals.'
  const header = 'hostname | virtual ip | link | latency | loss | tunnel | rx | tx | next hop | proxy cidrs | version'
  const separator = '--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---'
  const rows = terminals.map(entry => [
    entry.hostname || '-',
    entry.ipv4,
    entry.isLocal ? 'local' : entry.connection,
    entry.latencyMs === null ? '-' : `${entry.latencyMs}`,
    entry.lossRate ?? '-',
    entry.tunnelProto ?? '-',
    entry.rxBytes ?? '-',
    entry.txBytes ?? '-',
    entry.isLocal ? '-' : (entry.nextHopHostname ?? entry.nextHop ?? '-'),
    entry.proxyCidrs.length > 0 ? entry.proxyCidrs.join(',') : '-',
    entry.version || '-',
  ].join(' | '))
  return [`${terminals.length} terminal(s) in ${payload.instanceId}:`, header, separator, ...rows].join('\n')
}

/** Render a port-forward list. */
function renderPortForwards(payload) {
  if (payload.rules.length === 0) return 'No port-forward rules.'
  const rows = payload.rules.map(rule => `${rule.protocol} ${rule.bind} -> ${rule.dst}`)
  return [`${payload.rules.length} port-forward rule(s):`, ...rows].join('\n')
}

/** Render a whitelist. */
function renderWhitelist(payload) {
  const { tcp, udp } = payload.whitelist
  return [
    `TCP whitelist: ${tcp.length === 0 ? 'none (all ports allowed)' : tcp.join(',')}`,
    `UDP whitelist: ${udp.length === 0 ? 'none (all ports allowed)' : udp.join(',')}`,
  ].join('\n')
}

/** Render the credential list. */
function renderCredentials(payload) {
  if (payload.credentials.length === 0) return 'No active temporary credentials.'
  const rows = payload.credentials.map(entry => {
    const expiry = entry.expiryUnix === null ? '-' : new Date(entry.expiryUnix * 1000).toISOString()
    return `${entry.id} | groups=${entry.groups.length > 0 ? entry.groups.join(',') : '-'} | allow_relay=${entry.allowRelay} | reusable=${entry.reusable} | expires=${expiry}`
  })
  return [`${payload.credentials.length} active credential(s):`, ...rows].join('\n')
}

/** Render the connector list. */
function renderConnectors(payload) {
  if (payload.connectors.length === 0) return 'No connectors.'
  return payload.connectors.map(entry => `${entry.url} (${entry.state})`).join('\n')
}

/** Render a probe result. */
function renderProbe(payload) {
  const { terminal, ping, tcp } = payload
  const lines = [
    `terminal: ${terminal.hostname || '-'} (${terminal.ipv4}) link=${terminal.isLocal ? 'local' : terminal.connection}`,
    `icmp: ${ping.received ?? 0}/${ping.sent ?? '?'} replies` +
      `${ping.lossPercent === null ? '' : `, ${ping.lossPercent}% loss`}` +
      `${ping.avgMs === null ? '' : `, ${ping.avgMs} ms average`}`,
  ]
  if (tcp !== null && tcp !== undefined) {
    lines.push(tcp.connected
      ? `tcp: connected in ${tcp.latencyMs} ms`
      : `tcp: failed (${tcp.error})`)
  }
  lines.push(`reachable: ${payload.reachable ? 'yes' : 'no'}`)
  return lines.join('\n')
}

/** Render the status/info payload. */
function renderInfo(payload) {
  const node = payload.node ?? {}
  const lines = [
    `instance ${payload.instance.id} (pid ${payload.instance.pid}, ${payload.instance.managedBy})`,
    `hostname ${node.hostname ?? '-'}  virtual ip ${node.ipv4 ?? '-'}  peer id ${node.peerId ?? '-'}`,
    `network ${payload.instance.configSummary?.networkName ?? '-'}  rpc portal ${payload.instance.rpcPortal ?? '-'}`,
    `listeners ${node.listeners?.length ? node.listeners.join(', ') : '-'}`,
    `stun udp ${node.udpNatType ?? '-'} / tcp ${node.tcpNatType ?? '-'}  public ${node.publicIps?.length ? node.publicIps.join(', ') : '-'}`,
    `proxy cidrs ${node.proxyCidrs?.length ? node.proxyCidrs.join(', ') : '-'}`,
    `service ${payload.service?.name ?? '-'} ${payload.service?.status ?? ''}${payload.service?.startMode ? ` (${payload.service.startMode})` : ''}`,
    `vpn portal ${payload.vpnPortal === null ? '-' : `${payload.vpnPortal.vpnType} started=${payload.vpnPortal.started}`}`,
    `acl rules=${payload.acl?.ruleCount ?? '-'} connections=${payload.acl?.connectionCount ?? '-'}`,
  ]
  if (payload.peerCenter.length > 0) {
    lines.push('global topology:')
    for (const entry of payload.peerCenter) {
      const peers = entry.peers.map(peer => `${peer.hostname}(${peer.latencyMs ?? '?'}ms)`).join(', ')
      lines.push(`  ${entry.hostname} ${entry.ipv4 ?? ''} -> ${peers || '-'}`)
    }
  }
  return lines.join('\n')
}

/** Render a config file (secrets masked for the transcript). */
function renderConfig(payload) {
  if (payload.exists !== true) return `config file ${payload.path} does not exist yet`
  const notes = []
  if (payload.containsSecret === true) notes.push('(network_secret is masked in this output; the Web panel shows the real value for editing)')
  if (payload.writable !== true) notes.push('(not writable by the current account)')
  const modified = typeof payload.mtimeMs === 'number' ? new Date(payload.mtimeMs).toISOString() : '-'
  return [
    `config file: ${payload.path}`,
    `${payload.size} bytes, modified ${modified}`,
    ...notes,
    '---',
    redactConfig(payload.content),
  ].join('\n')
}

/**
 * Build the `easytier` tool definition.
 * @param {import('./easytier.js').EasytierService} service - the domain service.
 */
export function easytierTool(service) {
  return {
    name: 'easytier',
    description:
      'Manage the EasyTier mesh VPN running on this machine. Discovers the EasyTier instance automatically by process (easytier-core) ' +
      'and its RPC portal, then lists the terminals in the current network and manages them with EasyTier\'s own features: ' +
      'port forwarding, TCP/UDP whitelist, temporary credentials, connectors, service control, plus ICMP/TCP reachability probes. ' +
      'Also reads and writes the config file the instance was started with (config_get / config_set; config_set validates first and keeps a backup). ' +
      'Actions: list_instances, info, terminals, probe, port_forward_list/add/remove, whitelist_show/set/clear, ' +
      'credential_list/generate/revoke, connector_list/add/remove, service, config_get, config_set, cli. ' +
      'Triggers: EasyTier, 组网, 虚拟局域网, 异地组网, mesh VPN, 终端列表, 节点, 端口转发, 白名单, 临时凭证, 连接管理.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: [
            'list_instances',
            'info',
            'terminals',
            'probe',
            'port_forward_list',
            'port_forward_add',
            'port_forward_remove',
            'whitelist_show',
            'whitelist_set',
            'whitelist_clear',
            'credential_list',
            'credential_generate',
            'credential_revoke',
            'connector_list',
            'connector_add',
            'connector_remove',
            'service',
            'config_get',
            'config_set',
            'cli',
          ],
          description: 'The operation to perform.',
        },
        instance: { type: 'string', description: 'Instance id (pid), or omit for the first running EasyTier core.' },
        target: { type: 'string', description: 'probe: terminal virtual IPv4 or hostname.' },
        port: { type: 'integer', description: 'probe: optional TCP port to connect-test through the tunnel.' },
        protocol: { type: 'string', enum: ['tcp', 'udp'], description: 'port_forward_*: protocol.' },
        bind: { type: 'string', description: 'port_forward_*: local bind address, e.g. 0.0.0.0:8080.' },
        dst: { type: 'string', description: 'port_forward_*: destination reached over the tunnel, e.g. 10.126.126.3:80.' },
        kind: { type: 'string', enum: ['tcp', 'udp'], description: 'whitelist_*: which whitelist.' },
        ports: { type: 'string', description: 'whitelist_set: ports such as "80,443,8000-9000". Empty clears.' },
        ttl: { type: 'integer', description: 'credential_generate: lifetime in seconds.' },
        credentialId: { type: 'string', description: 'credential_generate/revoke: credential id.' },
        groups: { type: 'string', description: 'credential_generate: comma-separated ACL groups.' },
        allowRelay: { type: 'boolean', description: 'credential_generate: allow relay through this node.' },
        reusable: { type: 'boolean', description: 'credential_generate: whether several peers may share it.' },
        allowedProxyCidrs: { type: 'string', description: 'credential_generate: comma-separated allowed proxy CIDRs.' },
        url: { type: 'string', description: 'connector_*: peer URL, e.g. tcp://1.2.3.4:11010.' },
        serviceAction: { type: 'string', enum: ['status', 'start', 'stop', 'restart'], description: 'service: what to do.' },
        content: {
          type: 'string',
          description: 'config_set: complete new config file text. It must not contain a redacted network_secret ("***").',
        },
        args: { type: 'array', items: { type: 'string' }, description: 'cli: raw easytier-cli arguments, e.g. ["stats","show"].' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['text'],
        properties: { text: { type: 'string' } },
      },
      render: (_args, value) => text(typeof value?.text === 'string' ? value.text : 'no output'),
    },
    async execute(args) {
      try {
        const action = String(args.action)
        if (action === 'list_instances') {
          return { text: renderInstances(await service.snapshot({ force: true })) }
        }
        if (action === 'info') {
          return { text: renderInfo(await service.info(args.instance)) }
        }
        if (action === 'terminals') {
          return { text: renderTerminals(await service.terminals(args.instance)) }
        }
        if (action === 'probe') {
          return { text: renderProbe(await service.probe(args.instance, { target: args.target, port: args.port })) }
        }
        if (action === 'port_forward_list') {
          return { text: renderPortForwards(await service.portForwards(args.instance)) }
        }
        if (action === 'port_forward_add') {
          const result = await service.addPortForward(args.instance, { protocol: args.protocol, bind: args.bind, dst: args.dst })
          return { text: result.message }
        }
        if (action === 'port_forward_remove') {
          const result = await service.removePortForward(args.instance, { protocol: args.protocol, bind: args.bind, dst: args.dst })
          return { text: `${result.message}\nremoved ${result.removed} rule(s)` }
        }
        if (action === 'whitelist_show') {
          return { text: renderWhitelist(await service.whitelist(args.instance)) }
        }
        if (action === 'whitelist_set') {
          const result = await service.setWhitelist(args.instance, { kind: args.kind ?? 'tcp', ports: args.ports })
          return { text: result.message }
        }
        if (action === 'whitelist_clear') {
          const result = await service.clearWhitelist(args.instance, { kind: args.kind ?? 'tcp' })
          return { text: result.message }
        }
        if (action === 'credential_list') {
          return { text: renderCredentials(await service.credentials(args.instance)) }
        }
        if (action === 'credential_generate') {
          const result = await service.generateCredential(args.instance, {
            ttl: args.ttl,
            id: args.credentialId,
            groups: args.groups,
            allowRelay: args.allowRelay,
            reusable: args.reusable,
            allowedProxyCidrs: args.allowedProxyCidrs,
          })
          return { text: result.message }
        }
        if (action === 'credential_revoke') {
          const result = await service.revokeCredential(args.instance, { id: args.credentialId })
          return { text: result.message }
        }
        if (action === 'connector_list') {
          return { text: renderConnectors(await service.connectors(args.instance)) }
        }
        if (action === 'connector_add') {
          const result = await service.addConnector(args.instance, { url: args.url })
          return { text: result.message }
        }
        if (action === 'connector_remove') {
          const result = await service.removeConnector(args.instance, { url: args.url })
          return { text: result.message }
        }
        if (action === 'service') {
          const result = await service.serviceAction(args.instance, { action: args.serviceAction ?? 'status' })
          if (result.service !== undefined && result.service !== null) {
            const state = result.service
            return { text: `${result.message ? `${result.message}\n` : ''}service ${state.name ?? '-'} status=${state.status}${state.startMode ? ` start=${state.startMode}` : ''}` }
          }
          return { text: result.message ?? 'done' }
        }
        if (action === 'config_get') {
          return { text: renderConfig(await service.readConfig(args.instance)) }
        }
        if (action === 'config_set') {
          const result = await service.writeConfig(args.instance, { content: args.content })
          const lines = [`saved ${result.path}`]
          if (result.backupPath !== null && result.backupPath !== undefined) lines.push(`backup: ${result.backupPath}`)
          if (result.needsRestart === true) {
            lines.push(result.serviceName ? `restart the "${result.serviceName}" service to apply (an elevated session is required)` : 'restart the EasyTier instance to apply')
          }
          for (const warning of result.warnings ?? []) lines.push(`warning: ${warning}`)
          return { text: lines.join('\n') }
        }
        if (action === 'cli') {
          const result = await service.runRaw(args.instance, { args: args.args })
          return { text: result.error !== undefined ? `[error] ${result.error}\n${result.output}` : result.output }
        }
        return { text: `unknown action: ${action}` }
      } catch (error) {
        const message = error instanceof EasyTierError ? `${error.code}: ${error.message}` : String(error?.message ?? error)
        return { text: `[error] ${message}` }
      }
    },
  }
}
