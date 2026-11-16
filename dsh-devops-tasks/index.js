/**
 * 「我的 DevOps」插件宿主半。
 *
 * 只做一件事：把 `/api/dsh-devops-tasks` 挂在 DSH 的 webServer 上，让浏览器半
 * 通过本机 HTTP 取到「待办 / 待审 / 我创建的」三个桶的快照。真正的取数逻辑在
 * `lib/`：
 *
 *  - `lib/mcp.js`     MCP Streamable-HTTP 客户端 + endpoint 发现（PAT 只在宿主；
 *  - `lib/devops.js`  三个桶的 scene 组合、双层信封解包、行归一化、计数；
 *  - `lib/routes.js`  路由、loopback 围栏、报文脱敏。
 *
 * 配置（插件行 `config`，全部可选）：
 *  - `mcpServerName` MCP 服务名，默认 `devops-mcp-agile`；
 *  - `endpoint`      直接指定 MCP URL（含 PAT），跳过配置发现；
 *  - `systemId` / `orgId` 指定请求头，跳过 `list_user_permission_systems`；
 *  - `view`          请求视图，默认 `org`（工作台是组织维度）。
 *
 * @module dsh-devops-tasks
 */

import { createRoutes } from './lib/routes.js'

export const name = 'dsh-devops-tasks'
export const inject = ['webServer']

/**
 * 挂载路由。清理交给 `ctx.effect`：插件卸载时路径随请求处理器一起摘掉，
 * 不会留下一个还在应答的孤儿路由。
 *
 * 路由挂好后再预热一次快照：宿主启动阶段事件循环被各个插件的挂载占满，
 * 第一次出站请求会被拖到几十秒；把这段代价挪到后台，面板打开时通常已经有缓存。
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - 宿主上下文。
 * @param {Record<string, unknown>} [config] - 插件行配置。
 */
export function apply(ctx, config) {
  const { route, warmup } = createRoutes({ config: config ?? {} })
  const unmount = ctx.webServer.register(route)
  const timer = setTimeout(warmup, 2000)
  if (typeof timer.unref === 'function') timer.unref()
  ctx.effect(() => () => {
    clearTimeout(timer)
    if (typeof unmount === 'function') unmount()
  })
}
