/**
 * dsh-easytier — host half.
 *
 * Mounts the EasyTier service (process-first discovery + every management
 * operation), the `/api/dsh-easytier` route family the panel calls, the
 * `easytier` agent tool, and a system-prompt announcement. The browser half
 * (`./client`) renders the sidebar "EasyTier" panel.
 *
 * Zero runtime dependencies: only Node builtins and this package's own
 * modules, so a locally linked checkout needs no install step.
 *
 * Config is the row's raw `config` object (no Config schema is declared):
 *
 * ```yaml
 * - id: easytier
 *   name: 'dsh-easytier'
 *   config:
 *     enabled: true
 *     announceToAgent: true
 *     cliPath: 'C:\ProgramData\easytier\easytier-cli.exe'  # optional override
 *     rpcPortal: '127.0.0.1:15888'                          # optional override
 *     configFile: 'C:\ProgramData\easytier\config.toml'     # optional override
 * ```
 *
 * @module dsh-easytier
 */

import { EasytierService } from './lib/easytier.js'
import { makeRoute } from './lib/routes.js'
import { easytierTool } from './lib/tools.js'

/** Stable cordis plugin name. */
export const name = 'easytier'

/** Services required before the EasyTier surfaces can mount. */
export const inject = ['webServer', 'tools', 'systemPrompt']

/** Guidance announced to every agent, mirroring the plugin family's style. */
export const EASYTIER_GUIDANCE =
  '本机已安装 dsh-easytier 插件（EasyTier 组网管理）：侧边栏「EasyTier」入口 + easytier 工具。' +
  '能力：自动按进程发现本机正在运行的 EasyTier（枚举 easytier-core 进程 → 从服务注册表/进程映像定位 exe 与 --config-file → 从监听端口与配置确认 RPC portal → 用 easytier-cli 校验），' +
  '因此无需手工配置主机；面板与工具共用同一套实现。' +
  '查看：easytier 工具 action=terminals 列出当前网络中的终端（主机名、虚拟 IP、连接方式 p2p/local/relay、延迟、丢包、隧道协议、收发流量、版本、下一跳、代理网段），' +
  'action=info 看本节点身份/监听/STUN NAT/服务状态/全局拓扑，action=probe 对某个终端做 ICMP 与 TCP 可达性探测。' +
  '管理（均为 EasyTier 自身功能）：action=port_forward_add/remove/list 把终端上的服务通过隧道映射到本机（如 tcp 0.0.0.0:8080 -> 10.126.126.3:80）；' +
  'action=whitelist_set/clear/show 控制本节点经隧道对外开放的 TCP/UDP 端口；' +
  'action=credential_generate/revoke/list 为新的终端签发/吊销临时凭证（含密钥，仅生成时返回一次）；' +
  'action=connector_add/remove/list 管理本节点的出站对端连接；action=service 启停 easytier 系统服务；action=cli 透传任意 easytier-cli 子命令。' +
  '配置：面板「配置」标签可直接查看并编辑该实例的配置文件（含原文，保存前用 easytier-core --check-config 校验、自动备份为 <路径>.bak.<时间戳>，保存后需重启服务生效）；' +
  'agent 用 action=config_get 读取（输出中 network_secret 会脱敏）、action=config_set 写入（会拒绝含 *** 的脱敏文本）。' +
  '限制：只管理本机运行的实例（远端 Windows 主机请用 dsh-winrm，SSH 主机用 dsh-ssh）；' +
  '启停系统服务需要管理员权限，普通会话会返回 Access denied；凭证密钥属敏感信息，勿写入日志或提交仓库；' +
  '修改端口转发/白名单/连接会影响真实网络连通性，操作前先确认。' +
  '用户提到「EasyTier / 组网 / 虚拟局域网 / 异地组网 / 终端列表 / 节点 / 端口转发 / 白名单 / 临时凭证」时即指本插件，请据此协作。'

/** Order of the announcement section (after dsh-winrm's 151). */
const SECTION_ORDER = 152

/** Process-wide single-mount registry (survives duplicate module instances). */
const MOUNTED = Symbol.for('dsh-easytier.mounted')

/**
 * Register the service, routes, tool and prompt section.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host plugin context.
 * @param {{enabled?: boolean, announceToAgent?: boolean, cliPath?: string, rpcPortal?: string, configFile?: string, discoveryCacheMs?: number}} [config] - row config.
 */
export function apply(ctx, config) {
  const registry = globalThis
  const mounted = (registry[MOUNTED] ??= new Set())
  if (mounted.has('dsh-easytier')) return
  mounted.add('dsh-easytier')
  ctx.effect(() => () => {
    mounted.delete('dsh-easytier')
  }, 'dsh-easytier: mount guard')

  const resolved = config !== null && typeof config === 'object' ? config : {}
  const service = new EasytierService({
    ...(typeof resolved.cliPath === 'string' ? { cliPath: resolved.cliPath } : {}),
    ...(typeof resolved.rpcPortal === 'string' ? { rpcPortal: resolved.rpcPortal } : {}),
    ...(typeof resolved.configFile === 'string' ? { configFile: resolved.configFile } : {}),
    ...(typeof resolved.discoveryCacheMs === 'number' ? { discoveryCacheMs: resolved.discoveryCacheMs } : {}),
  })

  const disposers = []
  if (resolved.enabled === false) return

  if (resolved.announceToAgent !== false) {
    disposers.push(ctx.systemPrompt.section({
      name: 'plugin:dsh-easytier',
      order: SECTION_ORDER,
      text: EASYTIER_GUIDANCE,
    }))
  }

  disposers.push(ctx.webServer.register(makeRoute({ service })))
  disposers.push(ctx.tools.register(easytierTool(service)))

  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        /* already released */
      }
    }
  }, 'dsh-easytier: teardown')
}
