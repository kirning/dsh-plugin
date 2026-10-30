/**
 * 「继续」按钮输入控件插件，Node 端（宿主侧）部分。这是一个纯 UI 插件：
 * 空的 apply 只是为了满足 Loader 挂载该条目；浏览器端代码通过
 * exports["./client"] 导出，由 package.json 中的 dsh.client 声明来发现。
 */

/** 宿主插件主体 —— 该界面插件在宿主侧没有任何行为。 */
export function apply(): void {}
