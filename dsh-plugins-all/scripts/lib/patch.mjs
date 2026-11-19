/**
 * 聚合补丁的渲染器：把 aggregate.json 的 rows 变成
 *   1) cordis.patch.yml 的正文（一条 insert 里五个子插件行）
 *   2) package.json 的 dependencies / bundledDependencies
 *
 * 三个脚本共用这一份实现，所以 sync 写出来的东西和 verify 校验的东西
 * 永远是同一套规则（不会出现「手改一处、另一处没跟上」的漂移）。
 *
 * 设计口径（对齐 @linxin666/dsh-web-all）：
 * - 行名（name）用**子插件的真实包名**，不用聚合包的子路径。Loader 按行名
 *   import 宿主半，客户端模块扫描再从同一解析结果里取该包自己的
 *   dsh.client / exports["./client"] —— 于是每个子插件端到自己的浏览器半，
 *   子插件不需要知道自己被聚合了。
 * - 行 id 沿用各子插件自己 cordis.patch.yml 里的 id（ui-continue /
 *   company-quota / ...），这样面板里的开关、用户 patch 里的覆盖都还能
 *   按老 id 定位。
 */

/**
 * 校验 aggregate.json 的 rows：必填字段、id / 包名唯一。
 * @param {{rows?: Array<{id?: string, package?: string, dir?: string, disabled?: boolean, config?: object}>}} aggregate
 * @returns {Array<{id: string, package: string, dir: string, disabled?: boolean, config?: object}>}
 */
export function validateRows(aggregate) {
  const rows = aggregate?.rows
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('aggregate.json: rows 为空')
  const ids = new Set()
  const packages = new Set()
  for (const row of rows) {
    for (const key of ['id', 'package', 'dir']) {
      if (typeof row[key] !== 'string' || row[key].trim() === '') {
        throw new Error(`aggregate.json: 某一行缺少 ${key}（${JSON.stringify(row)}）`)
      }
    }
    if (ids.has(row.id)) throw new Error(`aggregate.json: 行 id 重复：${row.id}`)
    if (packages.has(row.package)) throw new Error(`aggregate.json: 包名重复：${row.package}`)
    ids.add(row.id)
    packages.add(row.package)
  }
  return /** @type {any} */ (rows)
}

/** YAML 标量：字符串一律单引号（内部的单引号翻倍），布尔/数字裸写。 */
function scalar(value) {
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (value === null) return 'null'
  return `'${String(value).replace(/'/g, "''")}'`
}

/** 把一个纯对象按 YAML block style 摊平（拒绝数组，避免隐式语义）。 */
function emitObject(value, indent, out, path) {
  for (const [key, item] of Object.entries(value)) {
    const here = path === '' ? key : `${path}.${key}`
    if (Array.isArray(item)) throw new Error(`aggregate.json: ${here} 不支持数组，请用嵌套对象`)
    if (item !== null && typeof item === 'object') {
      out.push(`${' '.repeat(indent)}${key}:`)
      emitObject(item, indent + 2, out, here)
      continue
    }
    out.push(`${' '.repeat(indent)}${key}: ${scalar(item)}`)
  }
}

/**
 * 渲染 cordis.patch.yml。
 * @param {Array<{id: string, package: string, packageDir?: string, disabled?: boolean, config?: object}>} rows
 * @returns {string}
 */
export function renderPatch(rows) {
  const out = [
    '# ⚠️ AUTO-GENERATED — 不要手改本文件。',
    '# 唯一事实来源是 aggregate.json；改完跑 `npm run sync` 重新生成，`npm run verify` 会',
    '# 在两者不一致时报错。手工临时试验请写在 profile 的 cordis.patch.yml 里（按行 id 覆盖），',
    '# 否则下次 sync 会被覆盖掉。',
    '#',
    '# 一个聚合 bundle = 一个 insert 里的若干子插件行。行名是该子插件自己的包名：',
    '# Loader 按包名挂载它的宿主半，客户端模块扫描据此端出它的浏览器半。',
    '# 行 id 沿用各子插件原本的 id，便于面板开关与用户层 patch 继续按老 id 定位。',
    '- insert:',
  ]
  for (const row of rows) {
    out.push(`    - id: ${row.id}`)
    out.push(`      name: ${scalar(row.package)}`)
    if (row.disabled !== undefined) out.push(`      disabled: ${scalar(row.disabled)}`)
    if (row.config !== undefined) {
      out.push('      config:')
      emitObject(row.config, 8, out, 'config')
    }
  }
  return `${out.join('\n')}\n`
}

/**
 * 渲染 dependencies / bundledDependencies。
 * - 开发期用 `file:` 目录依赖：npm 默认软链，改子插件源码后重启宿主即可生效。
 * - bundledDependencies 让 `npm run bundle` 出的单个 tgz 自带五个子包，
 *   装到别的机器上不需要再各自发布/安装。
 * @param {Array<{package: string, dir: string}>} rows
 * @returns {{ dependencies: Record<string, string>, bundledDependencies: string[] }}
 */
export function renderDependencies(rows) {
  /** @type {Record<string, string>} */
  const dependencies = {}
  for (const row of rows) {
    const dir = String(row.dir ?? '').replace(/\\/g, '/')
    if (dir === '') throw new Error(`aggregate.json: ${row.package} 缺少 dir`)
    dependencies[row.package] = `file:${dir}`
  }
  return { dependencies, bundledDependencies: Object.keys(dependencies) }
}
