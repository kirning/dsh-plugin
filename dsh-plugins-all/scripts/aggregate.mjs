#!/usr/bin/env node
/**
 * `npm run sync` —— 从 aggregate.json 重新生成
 *   - cordis.patch.yml（聚合 bundle 挂哪些行）
 *   - package.json 的 dependencies / bundledDependencies（行名 ⇒ 子插件目录）
 *
 * 幂等：内容没变就只报告、不写盘（避免无意义的 mtime 抖动）。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderDependencies, renderPatch, validateRows } from './lib/patch.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (name) => JSON.parse(readFileSync(join(root, name), 'utf8'))

const aggregate = readJson('aggregate.json')
const rows = validateRows(aggregate)
const pkg = readJson('package.json')

const { dependencies, bundledDependencies } = renderDependencies(rows)
const patchText = renderPatch(rows)

/** @type {string[]} */
const changed = []

const nextPkg = { ...pkg, dependencies, bundledDependencies }
const nextPkgText = `${JSON.stringify(nextPkg, null, 2)}\n`
if (nextPkgText !== `${JSON.stringify(pkg, null, 2)}\n`) {
  writeFileSync(join(root, 'package.json'), nextPkgText, 'utf8')
  changed.push('package.json')
}

const patchPath = join(root, 'cordis.patch.yml')
const patchNow = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
if (patchNow !== patchText) {
  writeFileSync(patchPath, patchText, 'utf8')
  changed.push('cordis.patch.yml')
}

console.log(
  [
    `聚合 bundle：${pkg.name}@${pkg.version}（${rows.length} 个子插件）`,
    ...rows.map((row) => {
      const dir = resolve(root, row.dir)
      return `  - ${row.id.padEnd(18)} ${row.package.padEnd(26)} ${relative(root, dir) || '.'}${row.config ? '  [带 config]' : ''}`
    }),
    changed.length === 0 ? '已是最新，没有写盘。' : `已更新：${changed.join(', ')}`,
  ].join('\n'),
)
