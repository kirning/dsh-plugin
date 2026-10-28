/**
 * Pure decoders for `easytier-cli` payloads.
 *
 * EasyTier's JSON is mostly serde-clean, with two exceptions this module
 * normalises so the rest of the plugin never sees them:
 *
 *  - port-forward addresses arrive as binary Rust structs
 *    (`{"Ipv4":{"addr":176061955}}`), not dotted strings;
 *  - several surfaces only have a human table / prose form, which is parsed
 *    here as a documented fallback.
 *
 * @module dsh-easytier/lib/ops
 */

/** Decode a big-endian u32 IPv4 address into dotted quad form. */
export function ipv4FromU32(value) {
  if (!Number.isFinite(value)) return undefined
  const n = Number(value) >>> 0
  return `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`
}

/** Decode EasyTier's IpAddr enum shape into a printable address. */
export function decodeIp(value) {
  if (typeof value === 'string') return value
  if (value === null || typeof value !== 'object') return undefined
  const v4 = value.Ipv4 ?? value.ipv4
  if (v4 !== undefined) {
    if (typeof v4 === 'string') return v4
    if (typeof v4 === 'number') return ipv4FromU32(v4)
    if (Array.isArray(v4.octets)) return v4.octets.join('.')
    if (typeof v4.addr === 'number') return ipv4FromU32(v4.addr)
  }
  const v6 = value.Ipv6 ?? value.ipv6
  if (v6 !== undefined) {
    if (typeof v6 === 'string') return v6
    if (Array.isArray(v6.segments)) return compressIpv6(v6.segments)
    if (Array.isArray(v6.octets)) {
      const groups = []
      for (let index = 0; index < 16; index += 2) groups.push((v6.octets[index] << 8) | v6.octets[index + 1])
      return compressIpv6(groups)
    }
  }
  return undefined
}

/** Render eight 16-bit groups with the longest zero run collapsed. */
function compressIpv6(groups) {
  if (!Array.isArray(groups) || groups.length !== 8) return undefined
  const hex = groups.map(group => Number(group).toString(16))
  let bestStart = -1
  let bestLength = 0
  for (let index = 0; index < 8; index += 1) {
    if (hex[index] !== '0') continue
    let run = 0
    while (index + run < 8 && hex[index + run] === '0') run += 1
    if (run > bestLength) {
      bestLength = run
      bestStart = index
    }
    index += run - 1
  }
  if (bestLength < 2) return hex.join(':')
  const head = hex.slice(0, bestStart).join(':')
  const tail = hex.slice(bestStart + bestLength).join(':')
  return `${head}::${tail}`
}

/** Decode a `{ip, port}` socket address pair. */
export function decodeEndpoint(value) {
  if (value === null || typeof value !== 'object') return undefined
  const ip = decodeIp(value.ip)
  const port = Number(value.port)
  if (ip === undefined || !Number.isFinite(port)) return undefined
  return `${ip}:${port}`
}

/** Map port-forward `socket_type` to a protocol name. */
export function socketTypeName(value) {
  if (value === 0) return 'tcp'
  if (value === 1) return 'udp'
  return `type:${String(value)}`
}

/** Normalise `port-forward list -o json` into printable rules. */
export function parsePortForwards(payload) {
  const cfgs = payload !== null && typeof payload === 'object' && Array.isArray(payload.cfgs) ? payload.cfgs : []
  const rules = []
  for (const cfg of cfgs) {
    if (cfg === null || typeof cfg !== 'object') continue
    const bind = decodeEndpoint(cfg.bind_addr)
    const dst = decodeEndpoint(cfg.dst_addr)
    if (bind === undefined || dst === undefined) return undefined
    rules.push({ protocol: socketTypeName(cfg.socket_type), bind, dst })
  }
  return rules
}

/**
 * Parse the human `port-forward list` table (fallback when the JSON shape
 * changes or carries an address form this module cannot decode).
 */
export function parsePortForwardTable(text) {
  const rows = []
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.split('|').slice(1, -1).map(cell => cell.trim())
    if (cells.length < 3) continue
    if (/^-+$/.test(cells[0].replace(/:/g, ''))) continue
    if (cells[0].toLowerCase() === 'protocol') continue
    rows.push({ protocol: cells[0].toLowerCase(), bind: cells[1], dst: cells[2] })
  }
  return rows
}

/** Normalise `connector list -o json`. */
export function parseConnectors(payload) {
  if (!Array.isArray(payload)) return []
  return payload.map(entry => {
    const url = entry?.url?.url ?? entry?.url ?? undefined
    const status = entry?.status
    let state = 'unknown'
    if (status === 0) state = 'connected'
    else if (typeof status === 'number') state = `state ${status}`
    return { url: typeof url === 'string' ? url : String(url ?? ''), state, status: typeof status === 'number' ? status : null }
  })
}

/** Normalise `whitelist show -o json`. */
export function parseWhitelist(payload) {
  const tcp = Array.isArray(payload?.tcp_ports) ? payload.tcp_ports.map(String) : []
  const udp = Array.isArray(payload?.udp_ports) ? payload.udp_ports.map(String) : []
  return { tcp, udp }
}

/** Normalise `credential list -o json`. */
export function parseCredentials(payload) {
  const list = Array.isArray(payload?.credentials) ? payload.credentials : []
  return list.map(entry => ({
    id: String(entry?.credential_id ?? ''),
    groups: Array.isArray(entry?.groups) ? entry.groups.map(String) : [],
    allowRelay: entry?.allow_relay === true,
    reusable: entry?.reusable !== false,
    expiryUnix: typeof entry?.expiry_unix === 'number' ? entry.expiry_unix : null,
    allowedProxyCidrs: Array.isArray(entry?.allowed_proxy_cidrs) ? entry.allowed_proxy_cidrs.map(String) : [],
  }))
}

/** Extract the one-time secret from `credential generate` prose output. */
export function parseCredentialGenerate(text) {
  const source = String(text ?? '')
  const idMatch = /credential[_-]id\s*:\s*(\S+)/i.exec(source)
  const secretMatch = /credential[_-]secret\s*:\s*(\S+)/i.exec(source)
  return {
    id: idMatch !== null ? idMatch[1] : undefined,
    secret: secretMatch !== null ? secretMatch[1] : undefined,
    raw: source.trim(),
  }
}

/** Parse EasyTier's `-` placeholder and unit suffixes into numbers. */
export function parseMetric(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '-') return null
  const direct = Number(trimmed)
  if (Number.isFinite(direct)) return direct
  const match = /^([\d.]+)\s*([kKmMgG]?)B?$/.exec(trimmed)
  if (match === null) return null
  const base = Number(match[1])
  if (!Number.isFinite(base)) return null
  const scale = match[2].toLowerCase() === 'k' ? 1024 : match[2].toLowerCase() === 'm' ? 1024 ** 2 : match[2].toLowerCase() === 'g' ? 1024 ** 3 : 1
  return base * scale
}

/** Split a CIDR into its bare address. */
export function bareAddress(cidr) {
  if (typeof cidr !== 'string') return undefined
  const slash = cidr.indexOf('/')
  return slash < 0 ? cidr : cidr.slice(0, slash)
}

/** Split `proxy_cidrs` (space or comma separated) into an array. */
export function splitCidrs(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value !== 'string') return []
  return value.split(/[,\s]+/).map(part => part.trim()).filter(Boolean)
}

/**
 * Build the terminal list by merging the peer table (live link quality) with
 * the route table (topology and advertised proxy networks).
 *
 * A peer entry proves reachability; a route entry adds path information. Some
 * nodes appear in only one of them, so the union is used.
 *
 * @param {unknown} peersPayload - `peer -o json`.
 * @param {unknown} routesPayload - `route -o json`.
 * @returns {object[]} normalised terminals, local node first.
 */
export function mergeTerminals(peersPayload, routesPayload) {
  const peers = Array.isArray(peersPayload) ? peersPayload : []
  const routes = Array.isArray(routesPayload) ? routesPayload : []

  const routesByAddress = new Map()
  for (const route of routes) {
    const address = bareAddress(route?.ipv4 ?? route?.ipv4_addr ?? route?.cidr)
    if (address !== undefined) routesByAddress.set(address, route)
  }

  const terminals = []
  const seen = new Set()

  for (const peer of peers) {
    const address = bareAddress(peer?.ipv4 ?? peer?.cidr)
    if (address === undefined || seen.has(address)) continue
    seen.add(address)
    const route = routesByAddress.get(address)
    const cost = String(peer?.cost ?? '')
    terminals.push({
      ipv4: address,
      cidr: typeof peer?.cidr === 'string' && peer.cidr !== '' ? peer.cidr : `${address}/24`,
      hostname: String(peer?.hostname ?? ''),
      peerId: peer?.id !== undefined ? String(peer.id) : undefined,
      isLocal: /^local$/i.test(cost),
      connection: cost === '' ? 'unknown' : cost,
      latencyMs: parseMetric(peer?.lat_ms),
      lossRate: typeof peer?.loss_rate === 'string' && peer.loss_rate !== '-' ? peer.loss_rate : null,
      rxBytes: typeof peer?.rx_bytes === 'string' && peer.rx_bytes !== '-' ? peer.rx_bytes : null,
      txBytes: typeof peer?.tx_bytes === 'string' && peer.tx_bytes !== '-' ? peer.tx_bytes : null,
      tunnelProto: typeof peer?.tunnel_proto === 'string' && peer.tunnel_proto !== '-' ? peer.tunnel_proto : null,
      natType: typeof peer?.nat_type === 'string' && peer.nat_type !== '-' ? peer.nat_type : null,
      version: String(peer?.version ?? ''),
      nextHop: route?.next_hop_ipv4 !== undefined && route.next_hop_ipv4 !== '-' ? String(route.next_hop_ipv4) : null,
      nextHopHostname: typeof route?.next_hop_hostname === 'string' && route.next_hop_hostname !== '-' ? route.next_hop_hostname : null,
      pathLen: typeof route?.path_len === 'number' ? route.path_len : null,
      pathLatency: typeof route?.path_latency === 'number' ? route.path_latency : null,
      proxyCidrs: splitCidrs(route?.proxy_cidrs),
      reached: true,
    })
  }

  // Routes without a live peer entry still describe a terminal in the network.
  for (const route of routes) {
    const address = bareAddress(route?.ipv4)
    if (address === undefined || seen.has(address)) continue
    seen.add(address)
    const nextHopHostname = typeof route?.next_hop_hostname === 'string' ? route.next_hop_hostname : ''
    terminals.push({
      ipv4: address,
      cidr: typeof route?.ipv4 === 'string' ? route.ipv4 : `${address}/24`,
      hostname: String(route?.hostname ?? ''),
      peerId: undefined,
      isLocal: /^local$/i.test(nextHopHostname),
      connection: 'route-only',
      latencyMs: typeof route?.next_hop_lat === 'number' ? route.next_hop_lat : null,
      lossRate: null,
      rxBytes: null,
      txBytes: null,
      tunnelProto: null,
      natType: null,
      version: String(route?.version ?? ''),
      nextHop: route?.next_hop_ipv4 !== undefined && route.next_hop_ipv4 !== '-' ? String(route.next_hop_ipv4) : null,
      nextHopHostname: nextHopHostname !== '' && nextHopHostname !== '-' ? nextHopHostname : null,
      pathLen: typeof route?.path_len === 'number' ? route.path_len : null,
      pathLatency: typeof route?.path_latency === 'number' ? route.path_latency : null,
      proxyCidrs: splitCidrs(route?.proxy_cidrs),
      reached: false,
    })
  }

  terminals.sort((left, right) => {
    if (left.isLocal !== right.isLocal) return left.isLocal ? -1 : 1
    return compareAddress(left.ipv4, right.ipv4)
  })
  return terminals
}

/** Numeric comparison for dotted IPv4 addresses. */
function compareAddress(left, right) {
  const a = String(left).split('.').map(Number)
  const b = String(right).split('.').map(Number)
  if (a.length !== 4 || b.length !== 4 || a.some(Number.isNaN) || b.some(Number.isNaN)) return String(left).localeCompare(String(right))
  for (let index = 0; index < 4; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }
  return 0
}

/**
 * Mask shared secrets inside a config dump before it leaves the host.
 * The `node` payload echoes the whole instance config, which includes the
 * network secret; the panel has no use for it and it must not travel to a
 * browser.
 * @param {string} text - raw config text.
 */
export function redactConfig(text) {
  return String(text)
    .replace(/(network_secret\s*=\s*)"[^"]*"/g, '$1"***"')
    .replace(/(network_secret\s*=\s*)'[^']*'/g, "$1'***'")
    .replace(/(credential\s*=\s*)"[^"]*"/g, '$1"***"')
    .replace(/(credential_id\s*=\s*)"[^"]*"/g, '$1"***"')
}

/** Normalise the `node -o json` payload. */
export function parseNode(payload) {
  if (payload === null || typeof payload !== 'object') return null
  const stun = payload.stun_info ?? {}
  const natNames = { 1: 'OpenInternet', 2: 'NoPAT', 3: 'FullCone', 4: 'Restricted', 5: 'PortRestricted', 6: 'Symmetric' }
  return {
    hostname: String(payload.hostname ?? ''),
    ipv4: str(payload.ipv4_addr ?? payload.ipv4),
    peerId: payload.peer_id !== undefined ? String(payload.peer_id) : undefined,
    instanceId: str(payload.inst_id ?? payload.instance_id),
    instanceName: str(payload.instance_name),
    proxyCidrs: splitCidrs(payload.proxy_cidrs),
    listeners: Array.isArray(payload.listeners) ? payload.listeners.map(String) : [],
    publicIps: Array.isArray(stun.public_ip) ? stun.public_ip.map(String) : [],
    udpNatType: typeof stun.udp_nat_type === 'number' ? (natNames[stun.udp_nat_type] ?? `type ${stun.udp_nat_type}`) : null,
    tcpNatType: typeof stun.tcp_nat_type === 'number' ? (natNames[stun.tcp_nat_type] ?? `type ${stun.tcp_nat_type}`) : null,
    config: typeof payload.config === 'string' ? redactConfig(payload.config) : undefined,
  }
}

/** String coercion that maps null/undefined to undefined. */
function str(value) {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** Normalise `peer-center -o json` into a compact global topology. */
export function parsePeerCenter(payload) {
  if (!Array.isArray(payload)) return []
  return payload.map(node => ({
    nodeId: node?.node_id !== undefined ? String(node.node_id) : '',
    hostname: String(node?.hostname ?? ''),
    ipv4: str(node?.ipv4),
    peers: Array.isArray(node?.direct_peers)
      ? node.direct_peers.map(peer => ({
        nodeId: peer?.node_id !== undefined ? String(peer.node_id) : '',
        hostname: String(peer?.hostname ?? ''),
        ipv4: str(peer?.ipv4),
        latencyMs: typeof peer?.latency_ms === 'number' ? peer.latency_ms : null,
      }))
      : [],
  }))
}

/** Summarise `acl stats -o json` without dumping the whole cache. */
export function parseAclSummary(payload) {
  const rules = Array.isArray(payload?.rules) ? payload.rules : []
  const connTrack = Array.isArray(payload?.conn_track) ? payload.conn_track : []
  const global = payload?.global ?? {}
  return {
    ruleCount: rules.length,
    connectionCount: connTrack.length,
    cacheSize: typeof global.CacheSize === 'number' ? global.CacheSize : null,
    cacheMaxSize: typeof global.CacheMaxSize === 'number' ? global.CacheMaxSize : null,
  }
}

/** Normalise `vpn-portal -o json`. */
export function parseVpnPortal(payload) {
  if (payload === null || typeof payload !== 'object') return null
  const config = typeof payload.client_config === 'string' ? payload.client_config : ''
  return {
    vpnType: str(payload.vpn_type),
    started: !/ERROR/i.test(config),
    clientConfig: config,
    connectedClients: Array.isArray(payload.connected_clients) ? payload.connected_clients : [],
  }
}

/**
 * Parse `ping` output into loss/latency numbers, keeping the raw tail.
 * @param {string} text - ping output.
 * @returns {{received: number|null, sent: number|null, lossPercent: number|null, avgMs: number|null, raw: string}}
 */
export function parsePing(text) {
  const source = String(text ?? '')
  const raw = source.trim()
  const out = { received: null, sent: null, lossPercent: null, avgMs: null, raw }
  const windowsLoss = /Lost = (\d+) \((\d+)% loss\)/.exec(source)
  if (windowsLoss !== null) {
    out.lossPercent = Number(windowsLoss[2])
  }
  const windowsSent = /Sent = (\d+), Received = (\d+)/.exec(source)
  if (windowsSent !== null) {
    out.sent = Number(windowsSent[1])
    out.received = Number(windowsSent[2])
  }
  const windowsAvg = /Average = (\d+)ms/.exec(source)
  if (windowsAvg !== null) out.avgMs = Number(windowsAvg[1])
  const posixLoss = /(\d+(?:\.\d+)?)% packet loss/.exec(source)
  if (posixLoss !== null) out.lossPercent = Number(posixLoss[1])
  const posixRtt = /=\s*[\d.]+\/([\d.]+)\//.exec(source)
  if (posixRtt !== null) out.avgMs = Number(posixRtt[1])
  return out
}
