# dsh-plugin-company-quota

DeepSeek Harness Web 插件：在设置面板里新增一个「公司额度」一级分区，展示公司
大模型（ai.meicloud.com 网关）的月度额度、逐日消费日历与额度耗尽预测。

## 它做什么

- **额度汇总**：剩余额度、本月已用比例、重置日期、今日已用金额。
- **逐日日历**：每格一天，右上角日期，中间当天消费金额；0 不显示，可翻月，
  底部给出本月合计。
- **额度耗尽预测**：按本周期「已用金额 ÷ 已过天数」得到的日均速度预测用完的那一天。
  耗尽日落在本月内就在那一格标红「预计用完」；若本月用不完，则在月末那格标出
  「剩 ¥X」（到周期末的预计剩余额度）。

## 数据来源

| 数据 | 来源 |
| --- | --- |
| 当月额度 | `GET https://ai.meicloud.com/token-kanban/api/v1/openapi/member-quota?user_id=<MIP账号>`，`Authorization: Bearer <MIDEA_API_KEY>` |
| 逐日消费 | 同一接口的 `quota.remaining` 做差：**当天消费 = 上一条余额快照 − 当天余额** |

统计口径刻意保持朴素：不看 token、不查价目表、不读任何别的插件的台账。每次拿到
余额就按本地日期记一笔快照，落在 `$DSH_HOME/company-quota/balance-days.json`
（原子写，保留 120 天）；某天的消费就是相邻两笔快照的余额差，余额变多（充值或
月度重置）的那天按 0 处理，不会出现负数。首次装上新版时只有当天一笔快照，所以
日历会从**第二天**开始出现金额，之后逐日累积。

快照的采集时机：设置分区打开时每 60 秒轮询一次额度；此外宿主每 15 分钟后台采样
一次（`SAMPLE_MS`），因此即使一天没打开界面也会留下记录。没采到样的日子在日历上
直接空着，不伪造数据。

`MIDEA_API_KEY` 由宿主 `credentials` 服务解析，**永远不下发到浏览器**；浏览器只读
宿主合成的 JSON。MIP 账号默认 `wuxw32`，可用环境变量 `MIP_USER_ID` 覆盖。

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
dsh plugin --profile web add ./dsh-plugin-company-quota-0.1.4.tgz
```

包声明了 `dsh.bundle.patch`，安装后会自动挂载 profile 行；`dsh plugin add` 触发
profile 重新合成后，宿主半的新代码当场就会生效（实测），浏览器半刷新页面即可。

## 配置

无插件自身配置项，全部走常量与环境变量：

| 项 | 位置 | 说明 |
| --- | --- | --- |
| 后台采样周期 | `src/index.ts` 的 `SAMPLE_MS` | 默认 15 分钟 |
| 快照保留天数 | `src/balance.ts` 的 `KEEP_DAYS` | 默认 120 天 |
| 公司网关前缀 | 环境变量 `COMPANY_URL_PREFIX` | 默认 `https://ai.meicloud.com/` |
| MIP 账号 | 环境变量 `MIP_USER_ID` | 额度接口的 user_id，默认 `wuxw32`；模型配置里推不出来，保持显式 |

## 已知限制

- 额度接口按前台口径只对**本机**开放；从远端（配对设备）访问该分区会看到 403。
- 逐日金额依赖余额快照：插件没运行的时段、以及装上新版**之前**的历史，都没有快照，
  因此不会出现在日历上（旧版按会话日志/台账统计出来的历史不会迁移过来）。
- 一天多笔快照只保留最后一笔；某天最后一笔与次日最后一笔之间的差全部记在次日。
- 若两次快照之间跨了额度重置，那天的差额按 0 处理（不会把它算成消费）。
- 余额变化最小精度取决于接口返回的小数位，小额消费可能显示为 `¥0.0000`。
