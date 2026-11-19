#!/usr/bin/env node
/**
 * `npm run verify` —— 聚合包的体检（失败退出码 1，可直接当门禁跑）：
 *
 *   1) aggregate.json / package.json / cordis.patch.yml 三者是否一致（有漂移就提示 `npm run sync`）
 *   2) 每个行名能否从本包解析到子插件（解析不到 ⇒ 忘了 `npm install`，或 dir 写错）
 *   3) 子插件的宿主半入口（exports["."] / main）是否真实存在
 *   4) 声明了 dsh.client 的子插件：platform === "web"、exports["./client"] 存在、
 *      浏览器半产物的 __ModuleLoader__.load({ id: "<包名>" }) 与包名一致
 *      （id 对不上时浏览器半会被注册到错误的模块名下，DSH 端出一片空白）
 */
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderDependencies, renderPatch, validateRows } from './lib/patch.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (name) => JSON.parse(readFileSync(join(root, name), 'utf8'))
const require = createRequire(join(root, 'package.json'))

const failures = []
const notes = []
const fail = (message) => failures.push(message)
const note = (message) => notes.push(message)

/** 子包 exports 里取一个子路径再拼成绝对路径。 */
function entryPath(pkgDir, manifest, subpath) {
  const target = manifest.exports?.[subpath]
  if (typeof target !== 'string') return undefined
  return join(pkgDir, target)
}

const aggregate = readJson('aggregate.json')
const rows = validateRows(aggregate)
const pkg = readJson('package.json')

// ── 1) 三份事实来源一致性 ────────────────────────────────────────────────
const expectedPatch = renderPatch(rows)
const patchPath = join(root, 'cordis.patch.yml')
const actualPatch = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
if (actualPatch !== expectedPatch) fail('cordis.patch.yml 与 aggregate.json 不一致 → 跑 `npm run sync`')

const { dependencies, bundledDependencies } = renderDependencies(rows)
if (JSON.stringify(pkg.dependencies) !== JSON.stringify(dependencies)) {
  fail('package.json 的 dependencies 与 aggregate.json 不一致 → 跑 `npm run sync`')
}
if (JSON.stringify(pkg.bundledDependencies) !== JSON.stringify(bundledDependencies)) {
  fail('package.json 的 bundledDependencies 与 aggregate.json 不一致 → 跑 `npm run sync`')
}
if (pkg.dsh?.bundle?.patch !== './cordis.patch.yml') fail('package.json 缺少 dsh.bundle.patch = "./cordis.patch.yml"')
if (pkg.name !== 'dsh-plugins-all') note(`包名是 ${pkg.name}（profile 的 bundles 条目要与之相同）`)
if (rows.some((row) => row.package === pkg.name)) fail('aggregate.json 里不能把聚合包自己当子插件')

// ── 2~4) 每一行 ─────────────────────────────────────────────────────────
const table = []
for (const row of rows) {
  const name = row.package
  let manifestPath
  try {
    manifestPath = require.resolve(`${name}/package.json`)
  } catch {
    fail(`解析不到 ${name} → 在 ${relative(process.cwd(), root) || '.'} 里跑一次 \`npm install\`（或检查 dir）`)
    table.push(`✗ ${row.id.padEnd(18)} ${name}  (unresolved)`)
    continue
  }
  const pkgDir = dirname(manifestPath)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const problems = []
  if (manifest.name !== name) problems.push(`manifest.name=${manifest.name} ≠ ${name}`)

  const hostEntry = entryPath(pkgDir, manifest, '.') ?? (manifest.main ? join(pkgDir, manifest.main) : undefined)
  if (hostEntry === undefined) problems.push('没有宿主半入口（exports["."] / main）')
  else if (!existsSync(hostEntry)) problems.push(`宿主半入口不存在：${relative(root, hostEntry)}`)

  const clientDecl = manifest.dsh?.client
  let clientState = '—'
  if (clientDecl !== undefined) {
    if (clientDecl.platform !== 'web') problems.push(`dsh.client.platform=${clientDecl.platform}（应为 web）`)
    const clientEntry = entryPath(pkgDir, manifest, './client')
    if (clientEntry === undefined) problems.push('声明了 dsh.client 却没有 exports["./client"]')
    else if (!existsSync(clientEntry)) problems.push(`浏览器半不存在：${relative(root, clientEntry)}`)
    else {
      const source = readFileSync(clientEntry, 'utf8')
      const idPattern = new RegExp(`__ModuleLoader__\\s*\\.\\s*load\\(\\s*\\{\\s*id:\\s*["'\`]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\`]`)
      if (!idPattern.test(source)) problems.push(`浏览器半的 __ModuleLoader__.load id 不是 ${name}`)
      clientState = 'browser'
    }
  } else {
    clientState = 'host-only'
  }

  const tag = problems.length === 0 ? '✓' : '✗'
  table.push(`${tag} ${row.id.padEnd(18)} ${name}@${manifest.version}  [${clientState}]`)
  for (const problem of problems) fail(`${name}: ${problem}`)
}

// ── 汇总 ────────────────────────────────────────────────────────────────
console.log(`聚合包 ${pkg.name}@${pkg.version} · ${rows.length} 个子插件 · 根目录 ${root}`)
console.log(table.join('\n'))
for (const item of notes) console.log(`· ${item}`)
if (failures.length === 0) {
  console.log('\n全部检查通过。')
  process.exit(0)
}
console.error(`\n${failures.length} 项失败：`)
for (const item of failures) console.error(`  - ${item}`)
process.exit(1)
