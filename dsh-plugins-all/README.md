# dsh-plugins-all —— 一个聚合插件，装齐五个子插件

对标 `@linxin666/dsh-web-all` 的聚合范式：**一个 npm 包 = 一个 DSH bundle**，包里的
`cordis.patch.yml` 把若干**子插件**各自的行插进 profile 组合树。装一个包，五个子插件
同时上线；在「设置 → 插件」里它显示为一个 bundle（下面挂着五个子插件行），而不是五个
互不相干的插件。

| 行 id | 子插件包 | 目录 | 在 GUI 里的样子 |
|---|---|---|---|
| `ui-continue` | `dsh-plugin-continue` | `../dsh-plugin-continue` | 输入框左侧「继续」下拉 + 设置里的「常用指令」 |
| `company-quota` | `dsh-plugin-company-quota` | `../dsh-quota` | 设置里的「公司额度」分区（额度日历 / 耗尽预测 / 可用模型价目表） |
| `easytier` | `dsh-easytier` | `../dsh-easytier` | 侧边栏「EasyTier」面板 + `easytier` agent 工具 |
| `dsh-devops-tasks` | `dsh-devops-tasks` | `../dsh-devops-tasks` | 侧边栏「我的工作台」面板（会话管理 / Devops 管理） |
| `token-calendar` | `dsh-token-calendar` | `../token-calendar` | 侧边栏「Token 日历」面板 + 对应 agent 工具 |

## 怎么聚合的（和 dsh-web-all 同一套机制）

1. 本包 `package.json` 的 `dependencies` 指向五个子插件（开发期 `file:` 目录依赖）。
2. 本包 `cordis.patch.yml` 用一个 `insert` 挂五条行，**行名就是子插件自己的包名**：
   Loader 按行名 import 子插件的宿主半；`dsh-client-modules` 再从同一解析结果里读它的
   `dsh.client` / `exports["./client"]`，端出它自己的浏览器半。
   所以子插件**不需要知道自己被聚合**，改一个子插件只需改它自己的项目、重启宿主。
3. 行 id 沿用子插件原本的 id，面板开关、用户层 `cordis.patch.yml` 的老写法都继续有效。
4. 本包自己的宿主半（`index.js`）是**空的**，不自挂行 —— 否则会多出一条空插件条目。

## 唯一事实来源：`aggregate.json`

```jsonc
{ "id": "easytier", "package": "dsh-easytier", "dir": "../dsh-easytier" }
```

`package.json` 的 `dependencies` / `bundledDependencies` 和 `cordis.patch.yml` 都是由它
生成的（`cordis.patch.yml` 顶部有 AUTO-GENERATED 标记，别手改）。**加一个子插件 = 在
`aggregate.json` 里加一条 + `npm run sync`**。

## 命令

```sh
cd dsh-plugins-all
npm install        # 开发期：把五个子插件软链进 node_modules（改子插件源码即时生效）
npm run sync       # aggregate.json → package.json 依赖 + cordis.patch.yml
npm run verify     # 体检：三份口径是否漂移 / 行名能否解析 / 浏览器半 id 是否对得上
npm run bundle     # 出一个自带五个子插件的 tgz（bundledDependencies）
```

`npm run verify` 是可以直接当门禁的：它还会检查每个子插件声明的
`__ModuleLoader__.load({ id: "<包名>" })` 与包名一致 —— 对不上时浏览器半会注册到错误的
模块名下，DSH 里端出来就是一片空白，构建期却不会报错。

## 装进 profile

开发期（改子插件源码即时生效，profile 里不用重装）：

```jsonc
// $DSH_HOME/profiles/web/package.json
"dependencies": { "dsh-plugins-all": "link:D:/workspace/dsh-plugin/dsh-plugins-all" },
"dsh": { "profile": { "bundles": [ ..., "dsh-plugins-all" ] } }
```

并**从 `bundles` 里去掉**五个子插件自己的条目（`dsh-plugin-continue` /
`dsh-plugin-company-quota` / `dsh-easytier` / `dsh-devops-tasks` / `dsh-token-calendar`），
否则它们会被当成独立 bundle 再叠一层 patch，出现重复的行 id。

分发到别的机器：`npm run bundle` 出 `dsh-plugins-all-<version>.tgz`，然后

```sh
dsh plugin --profile web add "D:\path\to\dsh-plugins-all-1.0.0.tgz"
```

pnpm 会把子插件留在 `node_modules/dsh-plugins-all/node_modules/<子包>`（嵌套位置），
DSH 的依赖闭包正是从聚合包目录出发解析它们的，所以嵌套就够用，不会再往 profile 顶层装。

## 注意

- **不能与「独立安装」共存**：行 id 沿用子插件原名，同一个 id 出现两次会冲突。要共存就得
  把行 id 改成命名空间式（例如 `all:continue`），但那会让用户层 patch 的老 id 失效。
- 子插件的浏览器半只 `require("react")`（devops-tasks 还会 `require` 平台模块），
  运行时依赖由 DSH 外壳提供，所以 tgz 里删掉子插件的 `node_modules` 是安全的。
- `easytier` / `token-calendar` 的宿主半需要 `webServer` / `tools` / `systemPrompt` 服务，
  由 profile 里的 `@deepseek-ai/dsh-web-app` 等 base bundle 提供，别在精简 profile 里只装本包。
- 子插件若自己带 `config`（`token-calendar` 的 `enabled` / `announceToAgent` / `defaultCurrency`），
  写在 `aggregate.json` 的 `config` 里，sync 会原样搬进行定义。
