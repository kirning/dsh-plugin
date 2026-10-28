# dsh-plugin 工作区

本工作区存放本机自研的 DSH 插件，**每个插件一个独立目录**，目录名即 npm 包名。

```
dsh-plugin/
├── dsh-easytier/      EasyTier 组网管理（侧边栏面板 + easytier 工具）
└── token-calendar/    Token 消耗日历（侧边栏面板 + token_calendar 工具）
```

## 安装 / 更新

在 DSH 中用插件管理器安装某个子目录（**不是本根目录**）：

```bash
dsh plugin --profile web add D:\workspace\dsh-plugin\dsh-easytier
```

或由 agent 通过 `plugin_manager`（`action: install_bundle`，`target` 传子目录绝对路径）完成。

安装时会被登记为 `link:<子目录>` 软链，因此改源码后不需要重新安装；只要宿主要重新加载，见下。

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
