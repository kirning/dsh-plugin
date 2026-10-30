# FAQ

## 新对话第一轮必失败：`本轮运行失败 format v4 message requires a producer-owned source kind`

### 症状

DSH 升到 0.1.7-rc.2 后，**每个新会话的第一条消息**都失败，界面上是「处理失败 / 本轮运行失败 format v4 message requires a producer-owned source kind」。同一会话把消息**再发一次就正常**了（第二轮开始不再报错）。老会话继续对话也不受影响。

### 根因

`@vectorize-io/hindsight-coding-agents`（0.6.1 与 0.7.0 都有）在 `preStep` 里往会话注入一条记忆召回消息，用的是**已退役的 V3 source 信封**：

```js
source: { kind: "plugin", plugin: HINDSIGHT_PLUGIN, form: "recall" }   // dist/dsh.js injectionMessage()
```

DSH 0.1.7 的 session format v4 只接受「producer-owned kind」（非空且不等于字符串 `plugin`），`assertV4RowAdmission` / `assertV4MessageSources` 直接拒绝这条消息 → 首轮在 `preStep` 里抛错，`turn/end` 记为 `interrupted`，日志里连 `step/start` 都没有（注入只发生在会话首轮，所以第二轮就好了）。

判定证据（都可复核）：

- 出问题的会话日志：`{"type":"turn/start"}` 紧接着就是 inbox 清空 + `turn/end reason:{kind:"interrupted"}`，没有 `step/start`。
- `~/.hindsight/coding-agents-logs/diag.jsonl`：失败会话前一条正好是 `{"event":"inject_ok","chars":2343}`。
- 用 DSH 自己的校验器复现：`{kind:"plugin",...}` → 抛同一条报错；`{kind:"plugin:hindsight"}` / `{kind:"hindsight"}` → 通过（`temp/check-source-kinds.mjs`）。
- 把 hindsight 组件开关关掉后，新会话首轮立刻正常。

### 处置（本机已按「直接卸载」处理，2026-09-26）

没有用到这个插件，所以最终处置是**卸载**，而不是继续打补丁：

```sh
# GUI：设置/侧栏「插件」→ 查看 @vectorize-io/hindsight-coding-agents → 卸载（宿主实时下线，无需重启）
# 或 CLI：
dsh plugin --profile web remove @vectorize-io/hindsight-coding-agents
```

卸载后实测：新会话首轮立刻恢复正常（连跑一次「只回复两个字：ok」→ `已完成工作`）。因为插件条目是**实时**从 Loader 里摘掉的，不需要重启；这与「改宿主侧插件代码」不同（那种情况必须重启，见下）。

随之清掉的残留：profile `cordis.patch.yml` 里 `- id: hindsight` 那行（开关写的，卸载后会变成 `patch: entry "hindsight" not found` 告警）、`patches/` + `patchedDependencies` + `allowUnusedPatches`、`node_modules/@vectorize-io`、lockfile 条目。**没删** `~/.hindsight/`（只剩它自己的日志，需要的话 `Remove-Item -Recurse ~\.hindsight`）；mnemon 自己的 `dsh-mnemon-provider-hindsight`（memory-spaces 的一个可选 provider，与这个插件无关）也保持原样。

### 如果要留着它（补丁法）

把注入消息的 source 改成 DSH 迁移同样会产出的 producer-owned kind，并用 pnpm patch 固化：

```sh
cd ~/.dsh/profiles/web
pnpm patch @vectorize-io/hindsight-coding-agents@0.6.1     # 编辑 dist/dsh.js
#   - source: { kind: "plugin", plugin: HINDSIGHT_PLUGIN, form: "recall" }
#   + source: { kind: "plugin:" + HINDSIGHT_PLUGIN, form: "recall" }
pnpm patch-commit <pnpm 打印的目录>
```

产物：`patches/@vectorize-io__hindsight-coding-agents@0.6.1.patch` + `pnpm-workspace.yaml` 的 `patchedDependencies`；建议同时加 `allowUnusedPatches: true`，这样将来 hindsight 升级（补丁 key 不再匹配）只会告警，不会让整个 `dsh plugin add/update` 以 `ERR_PNPM_UNUSED_PATCH` 挂掉。离线自检：`node temp/verify-hindsight-fix.mjs`（从已安装包里取出 `injectionMessage` 跑一遍 DSH 的真校验器）。

**改宿主侧插件代码必须重启 `dsh web` 才生效**：宿主模块在启动时 import 并进 ESM 模块缓存，禁用/启用同一个组件不会重新 import（实测：在 `dist/dsh.js` 里加一条「被 import 就写文件」的探针，禁用→启用后探针文件始终没出现）。重启前若不想被这个报错挡住，可在「插件」面板把 hindsight 组件关掉，或在 profile `cordis.patch.yml` 里加 `- id: hindsight` / `disabled: true`。

### 附带发现

`~/.hindsight/coding-agent.json` 不存在 ⇒ 没配 apiToken，hindsight 的 reflect / retain / pages 全部 401（`diag.jsonl` 里成片 `*_failed`、`plugin.log` 里 `session runs without memory`）。也就是说它的「长期记忆」从来就没在工作，只注入一个本地块 —— 这也是「没用上、直接卸载」的依据。上游 0.7.0（2026-09-24 发布，早于 DSH 0.1.7-rc.2）仍是旧写法，值得反馈给 vectorize-io。

### 它是怎么进来的

不是被别的插件拉进来的：`@vectorize-io/hindsight-coding-agents` 是 profile 的**直接顶层依赖**（`dsh.profile.bundles` 里独立一行，`manifest` 是 `@vectorize-io/hindsight-coding-agents/dsh`），只能由某次 `dsh plugin --profile web add @vectorize-io/hindsight-coding-agents`（或 GUI 插件市场）显式安装；`~/.hindsight/coding-agents-logs/diag.jsonl` 第一条是 2026-09-18，即那时装的。`dsh-mnemon` 里的 `dsh-mnemon-provider-hindsight` 是 mnemon 自带的 provider 目录项，跟它没有依赖关系。

## DSH 升级后「继续」插件失效（0.1.7-rc.2 实录）

### 症状

DSH 升到 0.1.7-rc.2 后，输入框左侧的「继续」下拉直接消失，设置里的「常用指令」页也没了。

### 根因（两件事叠加，都要修）

1. **插件没被挂载**：0.1.7 换了 profile 布局（`$DSH_HOME/profiles/<name>`，装载的包看 profile `package.json` 的 `dsh.profile.bundles`）。旧布局残留的 `$DSH_HOME/profiles/node_modules`（含指向源码 checkout 的 junction）不再参与组合，于是没有任何 `ui-continue` 行。
2. **客户端图标 API 改名**：`@deepseek-ai/dsh-client-ui-primitives` 在 0.1.7 把图标从「尺寸后缀」改成「描边后缀」。旧名（`IconChevronDownOutline14` / `IconEditOutline16` / `IconPlusOutline16` / `IconTrashOutline16`）全部消失。因为平台模块是 DSH 外壳在**运行时**提供的，`npm run build` 不会报错，但组件会因 `undefined` 组件在浏览器里整块不渲染。

### 修复

```sh
# 1) package.json 的 @deepseek-ai/dsh-client-* devDeps 精确 pin 到与 DSH 同版本（0.1.7-rc.2）
npm install
npx tsc --noEmit        # ← 只有这一步能报出图标改名
# 2) 按报错把 Icon*14/16 改成 Icon*Regular / Icon*Medium（尺寸走 size prop）
npm run build; npm run pack
# 3) 重新挂载（dsh.bundle.patch 会自动进 dsh.profile.bundles 并插入 ui-continue 行）
dsh plugin --profile web add ./dsh-plugin-continue-0.3.1.tgz
# 4) 确认真的挂了
dsh --profile web --dump-config | Select-String continue
```

**不用重启 `dsh web`**：profile 变化会被宿主 HMR 观察，已打开的页面通过 HMR transport 收到新插件（刷新页面即可看到）。

### 怎么在浏览器里实测（GUI 有鉴权）

`dsh web` 的 index 需要签名 cookie，未认证直接 401（`/favicon.svg` 等静态资源不挡；`/plugins/...` 只服务已登记的精确 combo URL，随便拼路径一律 404，不能拿它判断挂载状态）。签名密钥是 `$DSH_HOME/.credentials.yaml` 里 `client-connection/browser-session` 的 secret，可以本地签发 cookie 给无头浏览器：

```sh
node temp/mint-cookie.mjs 127.0.0.1:3080 1     # 只打印 cookie 值，不打印 secret
```

再用 chrome-devtools MCP 的 `emulate extraHttpHeaders={"Cookie":"<cookie>"}` + reload，即可在真实 GUI 里验证「继续」下拉、打开目录按钮和设置页。另一个免鉴权的捷径：已挂载的客户端插件行会出现在 index HTML 的 `window.__DSH_BOOT__` 中。

## `ERR_PNPM_NO_MATURE_MATCHING_VERSION`：pnpm 11 安装/更新插件报「released just now」

### 症状

用 `dsh plugin --profile web add/update`（或 web GUI 的插件管理器）安装/更新插件时，pnpm 报错：

```
[ERR_PNPM_NO_MATURE_MATCHING_VERSION] Version 2.0.1 (released just now) of argparse does not meet the minimumReleaseAge constraint
```

特点：错误会**在不同包上反复出现**（rxjs、argparse……），且版本号随目标包升级而变（0.3.17 → 0.3.18 → 0.3.20……），每次都卡在同一个传递依赖上。

### 根因

pnpm 11 默认开启供应链门禁 `minimumReleaseAge`（默认 1440 分钟 = 1 天）：拒绝安装「发布不足 24 小时」的版本。这里叠了两个因素：

1. **npmmirror 镜像时间戳失真**：`registry.npmmirror.com` 对某些稳定老包（如 `argparse@2.0.1`、`rxjs@7.8.2`）返回了错误的「刚发布」时间，触发门禁误报。
2. **官方更新器的绕过 flag 是坏的**：`@linxin666/dsh-remote-web-ui` 更新时执行

   ```
   pnpm update --latest --config.minimumReleaseAge=0 <包名>
   ```

   它想用 `--config.minimumReleaseAge=0` 绕过门禁，但 pnpm 的 `--config.` 命令行参数**不做类型强转**，`0` 被当成字符串 `"0"`（非空字符串为真），于是：

   - 门禁不但没关掉，反而**被激活**（`"0"` 为真 → 生成「0 分钟」的发布时间窗口）；
   - 且因为 `minimumReleaseAge` 被「显式设置」，pnpm 自动把 `minimumReleaseAgeStrict` 置为 `true`（严格模式 → 硬失败，而非默认的静默跳过）。

   同时 **CLI 参数优先级高于工作区文件**，所以单独写在 `pnpm-workspace.yaml` 里的 `minimumReleaseAge: 0` 会被这个坏 flag 覆盖，等于白写。

### 修复

编辑 `~/.dsh/profiles/<profile>/pnpm-workspace.yaml`（本机即 `D:\Users\wuxw32.CN\.dsh\profiles\web\pnpm-workspace.yaml`）：

```yaml
minimumReleaseAge: 0
minimumReleaseAgeStrict: false
minimumReleaseAgeExclude:
  - '@linxin666/*'
  - rxjs
  - argparse
```

要点：

- `minimumReleaseAgeStrict: false`：抵消坏 flag 触发的严格模式，遇到「immature」版本改为**回退安装**而不是硬失败（这是关键一行）。
- `minimumReleaseAgeExclude`：直接豁免会误报的包（这也是 pnpm 报错信息本身建议的做法），以后再有别的包中招就往这里加包名。
- 改完**直接重跑更新即可，无需重启**：每次更新都会新起 pnpm 进程，重新读取磁盘上的该文件。

### 排查过程中验证过的关键结论

| 命令/配置 | 结果 |
|---|---|
| `pnpm add <包名>@<版本>`（无 flag，工作区 `minimumReleaseAge: 0`） | ✅ 成功 |
| `pnpm update <包名>`（无 `--latest`） | ✅ 成功 |
| `pnpm update --latest <包名>`（无 flag） | ✅ 成功 |
| `pnpm update --latest --config.minimumReleaseAge=0 <包名>`（更新器真实命令） | ❌ argparse 硬失败 |
| 工作区加 `minimumReleaseAgeStrict: false` + `argparse` 进 exclude 后，重跑上一条 | ✅ 成功 |

其他小结论：

- pnpm CLI 设置值的正确写法是 `--config.<camelCase>=<值>`；`--<kebab-case>=<值>`（如 `--minimum-release-age=0`）会报 `Unknown option`。
- 复现/验证命令：在 profile 目录里跑 `pnpm update --latest --config.minimumReleaseAge=0 "<包名>"`。
- npmmirror tarball 下载偶发 `UNABLE_TO_VERIFY_LEAF_SIGNATURE` / `ERR_SSL_INVALID_SESSION_ID`（镜像 SSL 证书问题，pnpm 自动重试后通常能恢复），与 `minimumReleaseAge` 门禁无关，别混淆。
