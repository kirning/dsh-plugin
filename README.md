# dsh-plugin 工作区

本工作区存放本机自研的 DSH 插件，**每个插件一个独立目录**；目录名一般等于 npm 包名，带前缀的包以各目录 `package.json` 的 `name` 为准。

```
dsh-plugin/
├── dsh-easytier/         EasyTier 组网管理（侧边栏面板 + easytier 工具）
├── token-calendar/       Token 消耗日历（侧边栏面板 + token_calendar 工具）
├── dsh-quota/            公司额度（设置分区：额度日历 + 耗尽预测；包名 dsh-plugin-company-quota）
└── dsh-plugin-continue/  输入框「继续」下拉 + 设置里的「常用指令」页
```

## 安装 / 更新

在 DSH 中用插件管理器安装某个子目录（**不是本根目录**）：

```bash
dsh plugin --profile web add D:\workspace\dsh-plugin\dsh-easytier
```

或由 agent 通过 `plugin_manager`（`action: install_bundle`，`target` 传子目录绝对路径）完成。

安装时会被登记为 `link:<子目录>` 软链，因此改源码后不需要重新安装；只要宿主要重新加载，见下。

`dsh-quota/` 与 `dsh-plugin-continue/` 是 TS 源码 + esbuild 自建产物：仓库里已带编译好的 `lib/`，可直接安装；改 `src/` 后要在该目录跑 `npm install && npm run build`（`npm run typecheck` 是类型闸门）。

## 改动何时生效

| 改动 | 生效方式 |
| --- | --- |
| `client.js`（浏览器端） | 改完刷新页面即可——宿主会 HMR 重新读取产物 |
| `index.js` / `lib/*`（宿主端） | **必须重启 `dsh web`**：Node ESM 模块在进程内无法重新求值 |
| 移动 / 重命名插件目录 | **必须重启 `dsh web`**：宿主在启动时记录客户端产物的绝对路径，HMR 监听的是那个路径 |

本机的 `dsh web` 由用户在 PowerShell 窗口里手动启动（`node .../@deepseek-ai/dsh/lib/bin.js web`），没有守护进程；重启就是在该窗口 `Ctrl+C` 后重新运行。

## 各插件

| 目录 | 说明 |
| --- | --- |
| [`dsh-easytier/`](dsh-easytier/README.md) | 自动发现本机运行的 EasyTier，列出组网终端，用 EasyTier 自身的端口转发 / 白名单 / 临时凭证 / 连接管理等功能操作它们，并可查看与编辑实例配置文件 |
| [`token-calendar/`](token-calendar/README.md) | 读取本机 magpie 网关的请求流水，按 models.dev 价格表折算，渲染 token 用量与花费日历 |
| [`dsh-quota/`](dsh-quota/README.md) | 设置面板里的「公司额度」分区：公司大模型的月度额度、逐日消费 / tokens 日历与额度耗尽预测；宿主半按 baseURL 识别公司路由并合成数据，`MIDEA_API_KEY` 不下发浏览器 |
| [`dsh-plugin-continue/`](dsh-plugin-continue/README.md) | 输入框左侧的「继续」下拉，与设置里的「常用指令」页共享同一份自定义指令，用于一键续写 / 沿用常用指令 |

