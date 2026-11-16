# dsh-plugin-company-quota

DeepSeek Harness Web 插件：在设置面板里新增一个「公司额度」一级分区，展示公司
大模型（ai.meicloud.com 网关）的月度额度、逐日消费日历与额度耗尽预测。

## 它做什么

- **额度汇总**：剩余额度、本月已用比例、重置日期、今日消耗的 token 数（金额为 0 时不显示）。
- **逐日日历**：每格一天，右上角日期，中间是当天公司网关消耗的 **token 数**，下面小字是金额；
  两者都为 0 的那天才留空，可翻月，底部给出本月合计（token 与金额）。
- **额度耗尽预测**：按本周期「已用金额 ÷ 已过天数」得到的日均速度预测用完的那一天。
  耗尽日落在本月内就在那一格标红「预计用完」；若本月用不完，则在月末那格标出
  「剩 ¥X」（到周期末的预计剩余额度）。

## 数据来源

| 数据 | 来源 |
| --- | --- |
| 当月额度 | `GET https://ai.meicloud.com/token-kanban/api/v1/openapi/member-quota?user_id=<MIP账号>`，`Authorization: Bearer <MIDEA_API_KEY>` |
| 逐日消费（今天以后） | 同一接口的 `quota.remaining` 做差：**当天消费 = 上一条余额快照 − 当天余额** |
| 逐日消费（余额快照之前的历史） | 只读旧用量台账 `$DSH_HOME/dsh-usage/usage-ledger.json`，按内置旧价目表折算金额 |
| 逐日 token | DSH 自己的会话日志 `$DSH_HOME/sessions/<workspace>/<session>/session.v4.jsonl.zstd`：`assistant/message.usage` 的输入/缓存命中/输出，按 `request/header` 的路由归属，落到本地日期 |

统计口径刻意保持朴素：新数据不看 token、不查价目表。每次拿到余额就按本地日期记一笔
快照，落在 `$DSH_HOME/company-quota/balance-days.json`（原子写，保留 120 天）；某天的
消费就是相邻两笔快照的余额差，余额变多（充值或月度重置）的那天按 0 处理，不会出现
负数。首次装上新版时只有当天一笔快照，所以余额差口径从**第二天**开始出现金额。

**历史不丢**：早于第一笔余额快照的日子由 `src/legacy.ts` 从旧台账折算（台账是只读
存量，插件永远不改它），因此切换口径不会把过去的日子从日历上抹掉。台账按
`(size, mtimeMs)` 缓存在内存里，文件不再变化时零 IO 开销；台账缺失/损坏时只是历史
空白，不影响新数据。同一日期以余额差为准。

快照的采集时机：设置分区打开时每 60 秒轮询一次额度；此外宿主每 15 分钟后台采样
一次（`SAMPLE_MS`），因此即使一天没打开界面也会留下记录。没采到样的日子在日历上
直接空着，不伪造数据。

`MIDEA_API_KEY` 由宿主 `credentials` 服务解析，**永远不下发到浏览器**；浏览器只读
宿主合成的 JSON。MIP 账号默认 `wuxw32`，可用环境变量 `MIP_USER_ID` 覆盖。

**逐日 token**：金额走余额差，token 走 DSH 自己的会话日志——`src/tokens.ts` 逐帧解压
`session.v4.jsonl.zstd`，取 `assistant/message.usage`（`inputTokens / cacheReadTokens /
outputTokens`），按同会话 `request/header` 的 `provider / model` 归属，合计到本地日期。
这些日志正是宿主「统计」页签的数据源，`totalTokens = 输入 + 缓存命中 + 输出`，与宿主口径一致。
扫描窗口 120 天（覆盖旧台账起点），解压走异步 `zstdDecompress`（线程池，不阻塞事件循环），
每个文件按 `(size, mtimeMs)` 缓存并落盘到 `$DSH_HOME/company-quota/token-cache.json`，
所以稳态只重解正在写的那一两个文件；宿主启动 8 秒后预热一次，其余按 30 秒节流增量刷新。
**token 比旧台账更全**：比对 48 天发现 13 天（集中在 9 月）日志记录的用量明显大于台账
（如 2026-09-16 日志 311,506,764 vs 台账 174,751,979），日志里没有重复记录，是旧台账漏记
部分会话，因此 token 一律以日志为准。

## 公司路由怎么识别

公司模型在 DSH 里是自定义配置的，路由 id（名称）不保证统一，但网关 URL 一定一致。
宿主半因此**按 baseURL 前缀识别**，不写死路由 id：

1. 读 `llm-pi-ai` 设置命名空间的 `providers`（先 `settings.describe()`，失败再翻
   loader 条目，两级都有 try/catch 兜底）；
2. 凡 `baseURL` 命中公司网关前缀（默认 `https://ai.meicloud.com/`，可用环境变量
   `COMPANY_URL_PREFIX` 覆盖；origin 相同也算命中）的 provider 都算公司路由；
3. 拿到路由后用它自己的 `apiKeyEnv` 作凭据，额度接口的 origin 直接从 baseURL 推导
   （仍是同域名的 `/token-kanban/...`）；
4. 一条都没匹配到时退回历史 id `midea` + `MIDEA_API_KEY` + 硬编码地址。

注意 `vision-toolkit` 等其它命名空间也可能配了同一个 URL，但识别范围只限
`llm-pi-ai.providers`，不会误取它的凭据（如 `VISION_API_KEY`）。

## 路由

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/company-quota/overview` | 合成文档（额度结果缓存 60 秒） |
| POST | `/api/company-quota/refresh` | 强制重取额度 |

两个路由都只接受本机（loopback）请求。

## 安装

```sh
npm install
npm run build
npm run pack
dsh plugin --profile web add ./dsh-plugin-company-quota-0.2.0.tgz
```

包声明了 `dsh.bundle.patch`，安装后会自动挂载 profile 行；`dsh plugin add` 触发
profile 重新合成后，宿主半的新代码当场就会生效（实测），浏览器半刷新页面即可。

## 配置

无插件自身配置项，全部走常量与环境变量：

| 项 | 位置 | 说明 |
| --- | --- | --- |
| 后台采样周期 | `src/index.ts` 的 `SAMPLE_MS` | 默认 15 分钟 |
| 快照保留天数 | `src/balance.ts` 的 `KEEP_DAYS` | 默认 120 天 |
| token 扫描窗口 | `src/tokens.ts` 的 `DEFAULT_WINDOW_DAYS` | 默认 120 天，可用环境变量 `COMPANY_USAGE_WINDOW_DAYS` 覆盖 |
| token 增量节流 | `src/tokens.ts` 的 `RESCAN_MS` | 默认 30 秒 |
| 公司网关前缀 | 环境变量 `COMPANY_URL_PREFIX` | 默认 `https://ai.meicloud.com/` |
| MIP 账号 | 环境变量 `MIP_USER_ID` | 额度接口的 user_id，默认 `wuxw32`；模型配置里推不出来，保持显式 |

## 已知限制

- 额度接口按前台口径只对**本机**开放；从远端（配对设备）访问该分区会看到 403。
- 逐日金额依赖余额快照：插件没运行的时段没有快照，那几天不会出现金额（历史日子由
  旧台账补，见上文「历史不丢」；台账之后的空档补不回来）。
- 旧台账折算用的是内置价目表快照：台账里出现价目表之外的模型时，那天只算已识别的
  模型（可能偏小或为 0），这是旧口径本身的限制。
- 一天多笔快照只保留最后一笔；某天最后一笔与次日最后一笔之间的差全部记在次日。
- 若两次快照之间跨了额度重置，那天的差额按 0 处理（不会把它算成消费）。
- 余额变化最小精度取决于接口返回的小数位，小额消费可能显示为 `¥0.0000`。
- token 窗口默认 120 天，更早的日子只有金额、没有 token（日志早已滚动出窗口）。
- token 来自本地会话日志：在**别的机器**上跑的会话不计入本机日历。
- 会话日志尾部正在写的那一帧可能解压失败，该帧的数据要等下一次增量扫描才补齐。
