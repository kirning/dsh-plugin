# dsh-easytier

EasyTier 组网管理插件（DSH Web GUI 侧边栏「EasyTier」面板 + `easytier` agent 工具）。

自动**按进程**发现本机正在运行的 EasyTier，列出当前网络中的终端，并用 EasyTier 自身的功能管理它们。
面板和工具共用同一套 Host 实现，所以在界面上做的操作，agent 可以用工具做同样的事，反之亦然。

零运行时依赖：宿主端只用 Node 内置模块，浏览器端只从模块表取 `react`。

## 功能

### 1. 查看当前网络中的终端

| 列 | 含义 |
| --- | --- |
| 主机名 / 虚拟 IP | 终端在 EasyTier 虚拟网络中的身份 |
| 连接 | `p2p`（直连打洞）、`local`（本机）、`relay` 等，来自 peer 表 |
| 延迟 / 丢包 | peer 表实测链路质量 |
| 隧道 | `udp` / `tcp` 等传输协议 |
| 收发 | 该 peer 的收发字节数 |
| 下一跳 / 代理网段 | 来自 route 表的路由信息（代理网段表示该终端通告的子网） |
| 版本 | 对端 easytier 版本 |

终端列表是 `peer` 与 `route` 两个视图按虚拟 IP 合并的结果：peer 证明可达性，route 补充拓扑与代理网段，只在其中一侧出现的节点也会列出并标注。

### 2. 利用 EasyTier 功能管理终端

| 面板标签 | EasyTier 子命令 | 作用 |
| --- | --- | --- |
| 端口转发 | `port-forward add/remove/list` | 把终端上的服务通过隧道映射到本机（`tcp 0.0.0.0:8080 → 10.126.126.3:80`） |
| 白名单 | `whitelist set-tcp/set-udp/clear/show` | 限制本节点经隧道对外开放的端口 |
| 临时凭证 | `credential generate/list/revoke` | 为新终端签发/吊销临时凭证（密钥只在生成时返回一次） |
| 连接管理 | `connector add/remove/list` | 管理本节点的出站对端连接 |
| 状态 | `node` / `vpn-portal` / `acl stats` / `peer-center` / 系统服务 | 节点身份、本地监听端口表、STUN NAT、全局拓扑、服务启停 |
| 配置 | 直接读写 `--config-file` 指向的文件 | 查看/编辑实例配置文件，保存前校验、自动备份 |
| 终端行「探测」 | ICMP + TCP | 检查某终端是否可达、某个端口是否通（TCP 经隧道直连） |

### 状态页：本地监听端口

「状态」标签把该实例在本机监听的端口列成表格（协议 / 监听地址 / 端口 / 可见范围 / 作用），例如：

| 协议 | 监听地址 | 端口 | 作用 |
| --- | --- | --- | --- |
| tcp | 0.0.0.0 / [::] | 11010 | P2P 传输监听：与其它终端建立隧道、NAT 打洞 |
| udp | 0.0.0.0 / [::] | 11010 | 同上（UDP 传输与打洞） |
| tcp | 127.0.0.1 | 15888 | RPC 管理门户：easytier-cli 与 GUI 通过它管理本实例 |
| ring | 进程内 | — | 进程内实例通道（EasyTier 内部 ring 传输），不占用网络端口 |

数据来源：传输端口来自 `node` 的 `listeners` 配置（每个地址/协议组合一行），RPC 门户取自发现阶段已校验的端口，WireGuard 门户启用时会再补一行；`ring://` 是内部通道，单独标注为非网络端口。表格下方注明 `0.0.0.0`/`[::]` 表示对所有网卡开放、`127.0.0.1` 表示仅本机。

### 配置文件查看与编辑

「配置」标签页直接显示该实例启动时使用的配置文件（`--config-file` 指向的路径）原文，可直接编辑并保存：

- 显示路径、大小、修改时间、当前账户是否可写，以及已有的 `.bak` 备份列表。
- **保存前校验**：先用行级 lint 指出明显的 TOML 错误（缺少 `=`、引号未闭合、节头残缺，精确到行号），再调用 `easytier-core --check-config` 确认能否被 EasyTier 解析；不通过则不落盘。
- **自动备份**：写入前把原文件复制为 `<路径>.bak.<时间戳>`（与 EasyTier GUI 的备份命名一致）。
- **原子写入**：先写临时文件再 rename 覆盖，避免写一半留下坏文件。
- **只写该实例自己的文件**：接口不接受客户端传入的任意路径。
- 保存后需要**重启服务**才生效；面板上直接提供「重启服务」按钮（需要管理员权限，普通会话会报 Access denied）。
- 该文件包含 `network_secret`（网络密钥）：面板按你的要求显示原文，但宿主在**其他**接口（如快照）里仍会把它脱敏为 `***`；agent 的 `config_get` 也始终脱敏。
- 保存会拒绝含 `network_secret = "***"` 的内容，避免把脱敏文本写回、覆盖真实密钥。

### 3. 自动通过进程找到正在运行的 EasyTier

不需要手工配置任何主机。发现流程：

1. **枚举进程**：查找 `easytier-core`（Windows 用 PowerShell `Get-Process`，POSIX 用 `ps`）。
2. **定位可执行文件与配置**：服务方式启动的核心进程以 SYSTEM 运行，未提权时读不到进程映像路径，因此从服务注册表 `ImagePath` 取 exe 和 `--config-file` 参数（同时兼容 `\??\` 与 `\\?\` 前缀）；直接启动的进程则用进程路径。
3. **定位 CLI**：优先使用与 core 同目录的 `easytier-cli`，其次 `C:\ProgramData\easytier`、GUI 安装目录、PATH。
4. **确认 RPC 门户**：候选顺序为配置覆盖 → 配置文件里的 `rpc_portal` → 默认 `15888` → 该 PID 其余 TCP 监听端口，然后用 `easytier-cli node -o json` 逐个校验，只有真正应答的端口才会被采用（错误端口在 EasyTier 侧表现为约 5 秒超时）。
5. 结果缓存 5 秒，避免面板每次操作都重新探测。

因此「服务方式」「GUI 方式」「手工命令方式」启动的实例都能被发现；同时运行多个实例时，面板顶部会出现实例选择器。

## 安装

本插件位于工作区的 `dsh-easytier/` 子目录（每个插件一个独立目录）。

```bash
# 在 DSH 中用插件管理器安装这个目录
dsh plugin --profile web add D:\workspace\dsh-plugin\dsh-easytier
```

或由 agent 通过 `plugin_manager`（`action: install_bundle`，`target` 传本目录绝对路径）安装。装好后重启或热加载即可在侧边栏看到「EasyTier」入口。

> **移动目录后必须重启 `dsh web`**：宿主在启动时记录客户端产物的绝对路径，HMR 监听的是那个路径。移动或重命名本目录后，宿主仍监听旧路径，改动 `client.js` 将不再热更新；重启一次即可重新定位。
>
> **改宿主端代码（`index.js` / `lib/*`）同样需要重启**：这些是 Node ESM 模块，进程内无法重新求值。

## 配置（全部可选）

```yaml
- id: easytier
  name: 'dsh-easytier'
  config:
    enabled: true            # 总开关：关闭后不注册路由/工具/提示段
    announceToAgent: true    # 是否向 agent 注入本插件的能力说明
    cliPath: 'C:\ProgramData\easytier\easytier-cli.exe'   # 覆盖 CLI 路径
    rpcPortal: '127.0.0.1:15888'                          # 覆盖 RPC 门户
    configFile: 'C:\ProgramData\easytier\config.toml'     # 覆盖配置文件
    discoveryCacheMs: 5000                                # 发现结果缓存时长
```

自动发现失败时才需要覆盖项；默认情况下留空即可。

## Agent 工具

单个工具 `easytier`，用 `action` 区分操作，与面板一一对应：

- `list_instances` / `info` / `terminals` / `probe`
- `port_forward_list` / `port_forward_add` / `port_forward_remove`
- `whitelist_show` / `whitelist_set` / `whitelist_clear`
- `credential_list` / `credential_generate` / `credential_revoke`
- `connector_list` / `connector_add` / `connector_remove`
- `service`（status/start/stop/restart）
- `config_get`（读取配置文件，`network_secret` 脱敏）/ `config_set`（写入，会先校验并备份，拒绝写回脱敏文本）
- `cli`（透传任意 `easytier-cli` 子命令）

## HTTP 接口

面板通过 `/api/dsh-easytier/*` 访问宿主，**仅限本机回环**（校验 socket 地址与 Host 头，并检查浏览器同源标记）。这些接口能改 VPN 配置、能读写配置文件、能启停系统服务，因此把 dsh web 暴露到局域网时不应开放它们。

端点：`/snapshot`、`/refresh`、`/terminals`、`/info`、`/port-forwards`、`/whitelist`、`/credentials`、`/connectors`、`/probe`、`/service`、`/config`、`/cli`。

## 安全与限制

- **凭证密钥是敏感信息**：`credential generate` 只在生成时返回一次密钥，插件不落盘、不记录；请勿把密钥粘贴进日志或提交仓库。
- **配置文件含网络密钥**：面板「配置」页按需显示原文（这是你要求的编辑界面，且接口仅本机回环可访问），但快照等其他接口与 agent 的 `config_get` 都会把 `network_secret` 脱敏为 `***`；写入时会拒绝含 `***` 的内容，避免覆盖真实密钥。
- **改配置会改变组网行为**：保存前会校验并自动备份为 `<路径>.bak.<时间戳>`，需要时可直接还原；保存后必须重启服务才生效。
- **网络共享密钥不外发**：`node` 输出里的 `network_secret` 在送往浏览器前已替换为 `***`。
- **启停系统服务需要管理员权限**：普通会话会返回 `Access denied`，面板会给出提示。
- **只管理本机实例**：远端 Windows 主机请用 `dsh-winrm`，SSH 主机请用 `dsh-ssh`。
- **变更影响真实连通性**：端口转发、白名单、connector 都会改变实际网络行为，操作前请确认。
- 端口转发删除必须同时给出目标地址；只给绑定地址时插件会先在当前规则里解析出目标再删除（EasyTier 自身只给 bind 时不会真正匹配）。

## 已知取舍

- **升级宿主端代码后需要重启 dsh**：Host 端 JS 模块由 Node ESM 缓存，重新启用插件行不会重新求值；浏览器端（`client.js`）改动会经 HMR 自动生效，宿主端（`index.js` / `lib/*`）改动必须在重启 `dsh web` 后生效。若面板提示「宿主端仍在运行旧版本」，就是这个原因。
- 「连接」列直接展示 EasyTier 的 `cost` 字符串（`p2p` / `Local` 等），不做二次归纳。
- connector 状态只有 `0` 被确认是 `connected`，其他数值按 `state N` 原样展示，不猜测含义。
- `easytier-core --check-config` 只回答「能/不能解析」，不输出原因，所以校验失败时给出的行号提示来自插件自己的行级 lint。
- 未使用 `Config` schema：配置以原始对象读取，因此不支持 `Volatile` 热更新，改动需重新加载插件行。

## 开发

```
index.js          宿主入口：注册路由 + 工具 + 系统提示段
lib/discover.js   进程优先的发现逻辑（进程/端口/配置/CLI 定位）
lib/cli.js        easytier-cli 调用与错误归一
lib/ops.js        纯解码器（peer/route 合并、IPv4 u32、白名单、凭证等）
lib/easytier.js   领域服务：面板与工具共用的全部操作
lib/routes.js     /api/dsh-easytier 路由族（回环信任栅栏）
lib/tools.js      easytier 工具定义与文本渲染
client.js         浏览器端：侧边栏入口 + 分标签面板
locale/*.json     插件管理器显示的标题与描述
```

审计要点：所有外部命令都通过 `execFile` 直接拉起（不经过 shell），参数经过校验；发现结果与操作结果都带明确的错误码（`no_instance` / `cli_missing` / `portal_unreachable` / `invalid_argument` 等），便于调用方区分「没装」「没起来」「参数错」「没权限」。

## License

Apache-2.0
