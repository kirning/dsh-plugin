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

### 4. 本机没装 EasyTier 时一键初始化

当发现逻辑在本机找不到任何 EasyTier 可执行文件时，面板不再只是一句「未发现实例」，而是给出一张初始化卡片：显示目标安装目录，并提供「初始化」按钮。

点击后插件自己做这几件事（面板上实时显示阶段、进度条和逐行日志）：

1. **解析版本**：请求 GitHub Releases 的 `latest`，只接受稳定版（`prerelease: false`）；如果最新的是预发布版，明确拒绝而不是降级安装。`latest` 接口异常时回退为列出发布列表挑第一个稳定版。
2. **选资产**：按 `平台/架构 → 发布资产三元组` 映射挑 `easytier-<triple>-v<版本>.zip`（Windows x64 对应 `windows-x86_64`，macOS ARM 对应 `macos-aarch64`，Linux 对应 `linux-x86_64` 等）；没有对应资产的架构会直接报错并提示去发布页手动下载。
3. **下载**：流式写盘，按 `content-length` 报百分比与已下载字节；支持取消（下个数据块边界退出并清理临时目录）。
4. **校验**：比对落盘大小与发布信息里的 `size`，不一致视为传输截断。
5. **解压**：用系统自带工具，依次尝试（Windows：`tar` → PowerShell `Expand-Archive` → `unzip`；macOS：`tar` → `unzip`；Linux：`unzip` → `tar`），全部失败才报错。
6. **安装**：把归档里的 `easytier-core` / `easytier-cli` / `easytier-gui` / `easytier-web` 复制到用户目录（Windows `%LOCALAPPDATA%\Programs\easytier`，其他平台 `~/.local/bin`），POSIX 下补 `0755`，然后跑一次 `--version` 确认可用。

#### 经代理下载

初始化卡片上有一个可选的代理输入框，**只需要填 `IP:端口`**（例如 `127.0.0.1:7890`）：

- 先按 **SOCKS5** 试（无认证），不通再自动降级到 **HTTP CONNECT**；降级会在日志里留一行说明，成功后会显示「已通过 xxx 下载（SOCKS5/HTTP）」。
- 想钉死协议就加前缀：`socks5://1.2.3.4:1080`、`http://proxy.local:3128`。带账号密码的 URL 暂不支持（两种协议都没实现认证）。
- 走代理时**版本查询（`api.github.com`）和下载都走同一条隧道**，方向键是本机 → 代理 → GitHub，所以内网里只有代理能出网时也能装。
- 没端口会直接报错（`needs a port, for example 127.0.0.1:7890`），留空则直连。
- 输入框内容记在浏览器 `localStorage`（`dsh-easytier.installProxy`），刷新后不用重填。

#### 使用已有的 EasyTier 目录

如果这台机器上已经有一份 EasyTier（绿色解压版、别人装好拷过来的、或者装在非默认目录），不用再下一次 31 MB：初始化卡片上还有一个 **EasyTier 目录** 输入框。

- 右侧「浏览…」按钮调的是 **DSH 自己的目录选择器**（`remote.directoryPicker`，本机 Windows/macOS 上就是系统原生的选择框），不需要手打路径；选完路径会写进输入框，也可以直接手输。
- 点「初始化」时，如果框里有目录，插件**先校验再采用**：目录里必须能找到 `easytier-core` 和 `easytier-cli`（`easytier-gui` / `easytier-web` 可选），搜索会向下探几层，所以指向解压出来的外层文件夹、或者里面那层 `easytier-windows-x86_64\`，都能认出来。
- 校验通过就**把它登记为本机的 EasyTier 目录**（`~/.dsh/dsh-easytier/install.json`），不复制、不下载；之后每次启动和「刷新」都从那里找。实际采用的是**二进制所在的那一层目录**——发现逻辑只在目录里直接看文件名，不会递归。
- 校验失败会在日志里点名缺哪个文件（`dir_not_found` / `invalid_directory`），不会退回成下载。
- Windows 上还会检查 `Packet.dll`：它是 `easytier-core.exe` 的**加载期依赖**，缺了进程会直接以 `0xC0000135`（STATUS_DLL_NOT_FOUND）退出、连日志都写不出来。所以只把 `.exe` 拷过来是不行的，报错里会明确点出这个文件（`missing_runtime`）。
- 目录在浏览器 `localStorage`（`dsh-easytier.installDir`）里留一份，刷新后不用重填。

#### 初始化完成后直接进控制面板，并且能直接启动节点

无论是下载安装完、还是采用已有目录校验通过，面板都会**自己切到控制视图**——即使此刻还没有任何节点在跑。这时界面是「启动 EasyTier 节点」卡片，而不是一句「去别处启动吧」：

1. **网络名称**（必填）：其它终端用同一个网络名（和同样的密钥）就能互相看到；
2. **网络密钥**（可选，密码框，不落 `localStorage`）；
3. **对端地址**（可选）：默认 `tcp://public.easytier.cn:11010`，多个用逗号/空格分开；
4. **虚拟 IP**（可选）与**「不创建虚拟网卡」**（默认勾选）。

点「启动节点」后，宿主直接拉起一个 `easytier-core` 进程（`--network-name … --network-secret … --peers … --no-tun true --rpc-portal 127.0.0.1:15888`），面板每秒轮询；等 RPC 门户起来、发现逻辑认到实例，界面自动变成正常的终端列表。运行中会显示 pid、调试日志尾部（`~/.dsh/dsh-easytier/core.log` 的最后十几行）和「停止节点」按钮（`taskkill /T /F` 结束整个进程树）。

设计取舍：

- **默认 `--no-tun`**：创建虚拟网卡在 Windows 上通常要管理员权限（还要 WinTun 驱动），而「看到终端」只需要入网。想让本机成为可被访问的节点时，取消勾选「不创建虚拟网卡」并填虚拟 IP 即可（此时需要权限）。
- **进程由插件自己记账**：pid 与参数写进 `~/.dsh/dsh-easytier/node.json`，宿主重启后仍能停掉它；记录里的进程已经不存在时，状态会显示「no longer running」并附日志尾部，而不是假装还在。
- **只装二进制，不注册服务、不自动加入网络**：组网参数由人决定，插件只负责把进程拉起来并看住它。
- **安装时复制整个压缩包内容**：除了三个 `.exe`，还有 `Packet.dll`、`wintun.dll`、`WinDivert64.sys` 等运行期文件（见上）。安装日志会写「installed N files」，只装 exe 会让节点在启动瞬间退出。
- **装到用户目录**：不需要管理员权限，也不改写系统 PATH；面板会显示完整路径，需要的话自己加进 PATH。
- **只信稳定版**：宁可报错也不装预发布版。
- **已有目录不复制也不移动**：只登记路径。用户删掉那个目录，插件下次启动会当作没装（状态文件里记的路径不存在就忽略）。

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
    installDir: 'C:\Users\me\AppData\Local\Programs\easytier'  # 初始化时的安装目录
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

端点：`/snapshot`、`/refresh`、`/terminals`、`/info`、`/port-forwards`、`/whitelist`、`/credentials`、`/connectors`、`/probe`、`/service`、`/config`、`/cli`，以及初始化用的 `/install`（`GET` 查状态、`POST` 开始、`DELETE` 取消）和启动节点用的 `/node`（`GET` 查状态、`POST` 启动、`DELETE` 停止）。`/snapshot` 的响应里额外带 `install`（检测结果 + 当前任务），面板据此决定显示初始化卡片还是空状态。

`POST /install` 的请求体是 `{ "proxy": "127.0.0.1:7890", "dir": "D:\\tools\\easytier" }`：`proxy` 可省略/null 表示直连，可带 `socks5://` / `http://` 前缀，只在本次任务里使用，任务快照的 `proxy.active` 会告诉你是 SOCKS5 还是 HTTP 真的通了；`dir` 可省略/null，给了就**只校验并采用**该目录（`mode: "adopt"`，不下载），校验内容与失败码见上文。

初始化接口同样受回环栅栏保护；下载目标是固定的 GitHub Releases 域名与发布资产地址，不接受客户端传入 URL——客户端只能提供**代理地址**和**一个已存在的本地目录**，不能替换下载源。

`POST /node` 的请求体是 `{ "networkName": "my-mesh", "networkSecret": "…", "peers": "tcp://public.easytier.cn:11010", "ipv4": "10.126.126.7", "noTun": true }`：`corePath` 由宿主从发现结果里取，客户端传不进来，因此没装 EasyTier 时这个接口只会报 `not_installed`。启动后 `lib/runner.js` 等 RPC 门户真正接受连接才算成功；`DELETE /node` 结束整棵进程树并清掉记录。

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
lib/install.js    初始化：GitHub 稳定版解析、流式下载、校验、解压、安装；已有目录的校验与登记（install.json）
lib/proxy.js      初始化下载用的代理：`host:port` 解析，SOCKS5 优先、HTTP CONNECT 兜底
lib/routes.js     /api/dsh-easytier 路由族（回环信任栅栏）
lib/tools.js      easytier 工具定义与文本渲染
client.js         浏览器端：侧边栏入口 + 分标签面板
locale/*.json     插件管理器显示的标题与描述
```

审计要点：所有外部命令都通过 `execFile` 直接拉起（不经过 shell），参数经过校验；发现结果与操作结果都带明确的错误码（`no_instance` / `cli_missing` / `portal_unreachable` / `invalid_argument` 等），便于调用方区分「没装」「没起来」「参数错」「没权限」。

## License

Apache-2.0
