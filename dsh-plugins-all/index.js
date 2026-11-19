/**
 * dsh-plugins-all —— 纯 bundle 的宿主半。
 *
 * 本包自己**不挂任何行**：它的全部内容都在 cordis.patch.yml 里那几条 insert，
 * Loader 按包名挂载各子插件（宿主半 + 浏览器半），插件管理面板因此把它显示成
 * 「一个插件（bundle）+ 其下若干子插件行」。
 *
 * Loader 仍然需要一个可 import 的包根入口（package.json 的 main / exports["."]），
 * 所以这里保留一个空 apply。**不要**在这里注册能力 / 工具 / 路由，否则会凭空多出
 * 一条「dsh-plugins-all」插件条目 —— 需要自挂一行时，改 aggregate.json 的 rows。
 */
export const name = 'dsh-plugins-all'

export function apply() {}
