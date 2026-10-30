# dsh-plugin-company-quota

DeepSeek Harness Web 插件：在设置面板里新增一个「公司额度」一级分区，展示公司
大模型（ai.meicloud.com 网关）的月度额度、逐日消费/tokens 日历与额度耗尽预测。

## 它做什么

- **额度汇总**：剩余额度、本月已用比例、重置日期、今日已用（金额 + tokens）。
- **逐日日历**：每格一天，右上角日期，中间当天消费金额与 tokens；0 不显示，可翻月，
  底部给出本月合计。
- **额度耗尽预测**：按本周期「已用金额 ÷ 已过天数」得到的日均速度预测用完的那一天。
  耗尽日落在本月内就在那一格标红「预计用完」；若本月用不完，则在月末那格标出
  「剩 ¥X」（到周期末的预计剩余额度）。

## 数据来源

| 数据 | 来源 |
| --- | --- |
| 逐日 tokens/调用数 | `$DSH_HOME/dsh-usage/usage-ledger.json`（只当磁盘数据读，不依赖 dsh-usage 的代码） |
| 当天金额 | 宿主半按公司网关价目表（CNY/百万 tokens：输入/输出/缓存命中）折算 |
| 当月额度 | `GET https://ai.meicloud.com/token-kanban/api/v1/openapi/member-quota?user_id=<MIP账号>`，`Authorization: Bearer <MIDEA_API_KEY>` |

`MIDEA_API_KEY` 由宿主 `credentials` 服务解析，**永远不下发到浏览器**；浏览器只读
宿主合成的 JSON。MIP 账号默认 `wuxw32`，可用环境变量 `MIP_USER_ID` 覆盖。

## 公司路由怎么识别

公司模型在 DSH 里是自定义配置的，路由 id（名称）不保证统一，但网关 URL 一定一致。
宿主半因此**按 baseURL 前缀识别**，不写死路由 id：

1. 读 `llm-pi-ai` 设置命名空间的 `providers`（先 `settings.describe()`，失败再翻
   loader 条目，两级都有 try/catch 兜底）；
2. 凡 `baseURL` 命中公司网关前缀（默认 `https://ai.meicloud.com/`，可用环境变量
   `COMPANY_URL_PREFIX` 覆盖；origin 相同也算命中）的 provider 都算公司路由——
   配了两条都指向公司网关就两条一起统计；
3. 拿到路由后：台账按它的 id 分桶聚合、凭据用它自己的 `apiKeyEnv`、额度接口的
   origin 直接从 baseURL 推导（仍是同域名的 `/token-kanban/...`）；
4. 一条都没匹配到时退回历史 id `midea` + `MIDEA_API_KEY` + 硬编码地址，行为与
   旧版本一致；台账聚合永远额外包含历史桶 `midea`，路由改名后旧数据不丢。

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
dsh plugin --profile desktop add ./dsh-plugin-company-quota-0.1.0.tgz
```

包声明了 `dsh.bundle.patch`，安装后会自动挂载 profile 行；宿主半新增路由需要重启
`dsh web`/桌面应用，浏览器半刷新页面即可。

## 配置

无插件自身配置项，全部走常量与环境变量：

| 项 | 位置 | 说明 |
| --- | --- | --- |
| 价目表 | `src/index.ts` 的 `PRICES` | 公司网关调价时改这里 |
| 公司网关前缀 | 环境变量 `COMPANY_URL_PREFIX` | 默认 `https://ai.meicloud.com/` |
| MIP 账号 | 环境变量 `MIP_USER_ID` | 额度接口的 user_id，默认 `wuxw32`；模型配置里推不出来，保持显式 |

## 已知限制

- 额度接口按前台口径只对**本机**开放；从远端（配对设备）访问该分区会看到 403。
- 未列入价目表的历史模型 id（如 `...-free`、token-plan 类）按不计费处理，因此那些天
  只显示 tokens、不显示金额。
- 统计自 dsh-usage 台账启用起，不回填更早历史。
- 台账聚合固定包含历史桶 `midea`：若将来另有一个**不指向公司网关**的 provider 恰好
  也叫 `midea`，它的用量会被一并计入（个人部署下可忽略）。
