# dsh-devops-tasks — DSH Web 插件：我的工作台（会话管理 + DevOps 待办）

在 DeepSeek Harness Web GUI 的侧边栏加一个「我的工作台」入口，面板分两个页签：

**会话管理**（默认，纯客户端、零请求）

- 本机会话按卡片列出：官方状态点（执行任务中带旋转动画）+ 会话标题（两行省略），不再显示状态文字
- 卡片分上/中/下三区：上部是状态点 + 标题 + 置顶图标（官方 pushpin；未置顶时 hover 才出现），
  中部是备注 + 轮次数 + 累计 token，下部贴底显示工作区名、最近使用时间，右侧是定位图标与三点菜单
  （这两个图标常显，不再只在 hover 时出现）
- 备注（点一下就地编辑，Enter 保存、Esc 取消，存 `localStorage`）
- 定位图标：在左侧「工作区」里展开分组、必要时展开被折叠的会话并滚动高亮该会话
- 聊天图标（定位旁边）：弹出发送框，Enter 发送、Shift+Enter 换行，把这段文本作为一条新消息投给该会话
  （投递即排队，不会打断正在跑的那一轮）
- 三点菜单：置顶 / 取消置顶、重命名、分叉会话、复制 Session ID、在应用打开、归档会话（运行中的会先停下来再归档）
- 工具栏：工作区筛选（全部 / 各工作区 / 未分组）+ **工作区凸显**（多选勾选，被选中的工作区给卡片加边框）
  + 标题搜索（标题与备注都能搜）
- 排序：置顶的按置顶时间排在最前，其余按最近使用时间倒序（不分工作区）；已归档与子代理会话不展示

**Devops 管理**

- **五张卡片**：全部 / 待办 / 待审 / 我创建的（各自带分类明细）+ **任务点数合计**（跟着当前列表一起算，
  换系统勾选、加搜索词、切状态/类型都会立刻变）
- **四个页签的列表**：「全部」把待办、待审、我创建的合并去重；编号（点一下在 DevOps 网页打开）、标题、类型、
  状态、优先级、任务点数、截止日期（过期标红，已完成/已关闭的行不再标红）、所属系统
- **三个筛选**：状态（多选勾选）、类型、所属系统（多选勾选，默认全选，勾选结果记在 `localStorage`）
- **分页**：每页 20 / 50 / 100 条可选，翻页与每页条数都在表格底部；筛选条件一变就回到第 1 页
- **搜索框**：在前端按编号/标题过滤，不发新请求
- **刷新**：手动强制刷新，并显示数据来自缓存还是刚取回

数据来自 DevSecOps（`devsecops.midea.com`）的 MCP OpenApi 通道，也就是 DSH 里那个
`devops-mcp-agile` MCP 服务；插件宿主半复用它配置里的 URL/PAT，PAT 不会进浏览器。

## 结构

```
dsh-devops-tasks/
├── index.js            # 宿主半：注册 /api/dsh-devops-tasks 路由 + 启动 2s 后预热
├── client.js           # 浏览器半：sidebar.panellist 入口 + main 面板（手写 CJS 工厂，无构建）
├── lib/mcp.js          # 极简 MCP Streamable-HTTP JSON-RPC 客户端 + 端点发现
├── lib/devops.js       # 取数：三个桶的 scene、字段归一化、去重、排序、缓存
├── lib/containers.js   # podman 容器只读列表（跑 podman ps --all --format json 并归一化）
├── lib/routes.js       # /health、/snapshot（stale-while-revalidate）、/item-*、/containers
├── cordis.patch.yml    # 自动挂载行
└── package.json
```

## 宿主 HTTP 接口

| 路径 | 说明 |
|---|---|
| `GET /api/dsh-devops-tasks/health` | 只读本地状态：`server`、脱敏后的 `endpoint`、`source`（发现到端点的文件）。加 `?probe=1` 才会真打平台列系统 |
| `GET /api/dsh-devops-tasks/snapshot` | 完整快照：`counts`、`tabs.todo/review/created`（`items/total/truncated/partial`）、`warnings`、`fetchedAt`、`stale`。加 `?force=1` 强制回源 |
| `GET /api/dsh-devops-tasks/item-detail?id=&systemId=` | 一条工作项的详情（按 `basic/people/plan/desc` 分组），平台响应是信封，`fieldList` 在 `body` 下一层 |
| `GET /api/dsh-devops-tasks/item-log?id=&page=&size=` | 一条工作项的活动日志（`/agile-service/opera/list/{id}/1`，`size` 上限 100） |
| `GET /api/dsh-devops-tasks/containers` | 本机 podman 容器只读列表：`containers`（`name/state/status/image/ports/created/createdText/networks/pod/id`）、`count`、`fetchedAt` |

两个接口都只接受**本机回环**请求（socket + Host 双校验），浏览器半靠同源 fetch 访问。

## 端点发现顺序

1. 插件 config 的 `endpoint`（`cordis.patch.yml` 里给 `dsh-devops-tasks` 行加 `config: { endpoint: ... }`）
2. 环境变量 `DSH_DEVOPS_MCP_URL`
3. `$DSH_HOME/cordis.patch.yml` 与 `$DSH_HOME/profiles/*/cordis.patch.yml|cordis.yml` 里
   `- id: devops-mcp-agile` 块的 `url:`（默认，无需配置）

发现结果缓存 60s；`/health` 的 `source` 会告诉你到底读的是哪个文件。

## 性能与缓存（重要）

DevSecOps 的 MCP 通道冷启动很慢（实测首次 `initialize` + `tools/list` 合计 20s+，平台侧 12 次
串行查询 2s），所以：

- 快照写入 `$DSH_HOME/dsh-devops-tasks/last-snapshot.json`，**下次启动首帧直接返回缓存**（`stale: true`），
  同时后台 `warmup()` 回源；浏览器半看到 `stale` 会在 2.5s 后自动重取一次。
- 宿主注册路由后 2s 自动预热一次，避免用户第一次点开就等。
- 调用一律**串行**：MCP 侧并发会把其中一路响应丢成空数组（实测 8 并发必丢 1 路），串行 2s 换正确性。
- 平台单页硬上限 **50 行**（`pageSize` 给 100 也只回 50），命中上限时该桶标 `partial`，面板提示数据可能不完整。
- 平台代理会关闭空闲 keep-alive 连接（`read ECONNRESET`），MCP 客户端遇传输错误会自动清会话并重试一次。

排查时可开 `DSH_DEVOPS_TASKS_DEBUG=1`，宿主 stderr 会打印每一跳耗时：

```
[dsh-devops-tasks] rpc initialize 200 4929ms (...)
[dsh-devops-tasks] snapshot 30701ms (identity=24736ms counts=482ms todo=435ms ...)
```

## 数据口径

- 待办 = `toDoStatus: NOT_STARTED`，scene `to_do_item_all`（= 责任人是我）
- 待审 = `toDoStatus: NOT_REVIEW`，6 个评审 scene（测试计划/测试报告/里程碑/通用流程/审批流/共享用例）
- 我创建的 = **并集**：`toDoStatus: CREATED` 的 4 个 scene（需求/缺陷/审批流程/通用评审流程）
  ∪ `toDoStatus: COMPLETED` + `conditionList: [{ key: "fc_creator", operator: "in", value: "姓名(账号)" }]`。
  后者补上了「我创建但不属于上面 4 个 scene」的故事与任务（实测 122 行：缺陷 23 + 需求 50 + 故事/任务 49）。
  账号取自待办桶第一行的 `fc_responsible_person`（待办的定义就是指派给我），可用 `DSH_DEVOPS_ME` 覆盖。
- 平台**没有**「开发负责人」字段（`fc_dev_owner` 在所有模板里都为空），所以「我是开发负责人」用
  「待办（责任人是我）+ 我经办的（COMPLETED）」覆盖；参与但不是我建、也不是派给我的，平台只提供
  `COMPLETED`（= 我经办的，共 547 条），本面板不整库翻页。
- `listItem` 的 `systemId` **不参与过滤**（传了也回多系统混合数据），所以「只查勾选系统」是客户端对
  快照行的过滤，效果等价、也不多发请求；`orderByList` 同样无效，排序一律在客户端做。
- 任务点数 = 模板字段 `456e2950-4644-4d9c-b99f-ae2ef52311aa`（float，非必填；故事/任务模板共用这个 fieldCode），
  空值显示 `-`
- 计数走 `getCountAutoZone?zone=yellow`（组织不支持红黄区时 `isShowZoneSwitch` 为 false）
- 「提醒」行是 @我 的评论：没有工作项编号，`toDoCategory.value = "6"`，标题是富文本 HTML，
  面板里已剥成纯文本，并且只对带编号的行按 id 去重、无编号的提醒行一律保留（否则同标题提醒会塌成一条）

## 会话管理的数据来源（DSH 客户端服务）

全部是已安装 DSH 的公开客户端面，没有自造状态，也没有额外 HTTP：

| 用途 | 服务 / 方法 |
|---|---|
| 会话清单 | `ctx.sessions.list`（`{ids, byId, phase, projectionsBySession}` 快照存储，订阅式） |
| 会话状态 | `ctx.uiSession.sessionStatus`（`Map<sessionId, {running, pendingInteraction, completionUnread}>`） |
| 轮次数 / token | `ctx.sessions.list.projectionsBySession[id].values`（`sessionStats.turns`、`tokenUsage` 四桶求和）+ `ctx.sessions.refreshProjections(id)` 懒加载 |
| 状态图标 | `require("@deepseek-ai/dsh-client-ui-primitives").StateDot`（外壳模块表提供，ongoing 自带旋转） |
| 工作区、归档、置顶 | `ctx.workspaces.list`（`{items, archivedSessionIds, pinnedSessionIds}`）+ `pinSession/unpinSession/archiveSession` |
| 打开 / 分叉 / 归档 | `ctx.uiWorkspace.openSession/forkSession/archiveSession` |
| 重命名 | `ctx.remote.session.rename({ sessionId, title })` → `RemoteResult` |
| 在应用打开 | `ctx.remote.session.openWorkspacePath({ path })` → `RemoteResult` |
| 给会话发消息 | `ctx.remote.session.prompt({ requestId, sessionId, mode: "queue", content: [{ type: "text", text }] })` → `RemoteResult` |
| 侧栏定位 | DOM：`[data-row-key="workspace:…"]` 分组头、`[data-row-key="overflow:…"]`、`[data-row-key="session:…"]` |

状态映射与 DSH 侧边栏一致：`pendingInteraction.kind` 为 `approval`/`plan-review`/`question` 时算「待回答」类，
否则 `running` 算「执行任务中」，`completionUnread` 算「执行完成」，其余「没有任务」。
子代理会话（`origin === "subagent"`）与已归档会话不在卡片里出现。

## 容器管理（容器管理页签）

面板第三个页签，**只读**：列出本机 podman 的全部容器（含已停止），列是
容器名称 / 状态 / 镜像 / 端口 / 创建时间，右上角有刷新按钮，不提供启停或删除。

- 取数在宿主进程跑 `podman ps --all --format json`（`lib/containers.js`），
  浏览器永远不直接碰容器引擎，`/api/dsh-devops-tasks/containers` 是唯一入口。
- podman 可执行文件解析顺序：插件配置 `podmanPath` → 环境变量 `DSH_PODMAN_BIN` →
  `%LOCALAPPDATA%\Programs\Podman\podman.exe` → `/usr/bin/podman`、`/usr/local/bin/podman` → PATH 里的 `podman`。
- 归一化：`Ports` 拼成 `0.0.0.0:8080->80/tcp`；`Created`（epoch 秒）转毫秒由面板格式化为 `YYYY-MM-DD HH:mm`；
  排序为「运行中在前，其余按创建时间倒序」。
- 时间戳字段缺失时退回 podman 自己的相对时间（`9 days ago`），不会显示空值。

## 安装 / 卸载

```powershell
# profile package.json：dependencies 加 "dsh-devops-tasks": "link:D:/workspace/dsh-plugin/dsh-devops-tasks"
#                     dsh.profile.bundles 加 "dsh-devops-tasks"
dsh plugin --profile web install
# 浏览器刷新即可，无需重启宿主（实测新增宿主插件行会被 profile 变化触发重新合成）
```

卸载：从 `dsh.profile.bundles` 与 `dependencies` 里去掉，再 `dsh plugin --profile web install`。

## 已知限制

- 编号跳转用固定规则 `https://devsecops.midea.com/agile/demand/list?sysId=<systemId>&detailId=<编号>`
  （`process_link` 对 story/detail 链接返回未命中，所以这是实测可用的入口，不是官方文档保证的深链）。
- 「我创建的」不包含平台 `COMPLETED` 之外的历史（例如已删除的工作项）。
- 所属系统勾选只影响本地过滤，宿主仍会把所有系统的行取回来（平台不支持按系统查询）。
- 依赖 `devops-mcp-agile` MCP 服务的 PAT（`mcpu_…`），PAT 轮换后插件会在 60s 内自动用新端点。
- 复制 Session ID 依赖浏览器的剪贴板授权（`navigator.clipboard.writeText`，失败时回退 `document.execCommand("copy")`）；
  自动化探针里没有真实点击手势时会显示「复制失败」
- 会话管理没有「取消归档」入口（归档动作直接调 `archiveSession`，恢复走 DSH 侧栏自己的「全部对话」）。
- 备注只存在本机 `localStorage`（key `dsh-devops-tasks:notes`），不进会话、不上传。
- 侧栏定位走 DOM（DSH 没有公开的 reveal API）：分组是虚拟列表，代码会点开分组、点「展开其余 N 个会话」并轮询等待行出现，最多约 4s。
- 宿主半的字段改动（如新增「任务点数」）需要重启 `dsh web` 才生效；浏览器半刷新页面即可。
