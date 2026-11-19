#!/usr/bin/env node
/**
 * `npm run bundle` —— 把整个聚合包打成**一个** tgz（自带五个子插件）。
 *
 * 做法（在临时目录里干脏活，不污染开发期的软链 node_modules）：
 *   1. 把本包要发布的文件复制到 staging
 *   2. staging 的 package.json 里把 `file:../xxx` 改写成**绝对路径**，
 *      `npm install --install-links` 把子插件**拷贝**进 staging/node_modules
 *   3. 删掉每个子插件夹带的 node_modules（它们没有运行时依赖，全是构建期 devDeps）
 *   4. `npm pack` —— bundledDependencies 让子包一起进 tgz
 *   5. 校验 tgz 里确实有每个子插件，再把产物挪回本包根目录
 *
 * 装到别的机器上：`dsh plugin --profile web add <tgz>`，不需要再各自安装子插件。
 * 注意：pnpm 会把子插件留在 `<聚合包>/node_modules/<子包>`（嵌套），
 * DSH 的依赖闭包正是从聚合包目录出发找它们，所以嵌套位置就能被解析。
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

import { validateRows } from './lib/patch.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (name) => JSON.parse(readFileSync(join(root, name), 'utf8'))

const pkg = readJson('package.json')
const rows = validateRows(readJson('aggregate.json'))

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
/** @param {string[]} args @param {string} cwd */
const run = (args, cwd) => {
  const quote = (arg) => (/[ "&^*|<>]/.test(arg) ? `"${arg.replace(/"/g, '""')}"` : arg)
  execSync([npm, ...args].map(quote).join(' '), { cwd, stdio: 'inherit' })
}

const staging = mkdtempSync(join(tmpdir(), 'dsh-plugins-all-pack-'))

try {
  // ── 1) 复制要发布的文件 ────────────────────────────────────────────────
  for (const file of ['package.json', ...(pkg.files ?? [])]) {
    if (!existsSync(join(root, file))) {
      console.warn(`跳过不存在的发布文件：${file}`)
      continue
    }
    cpSync(join(root, file), join(staging, file), { recursive: true })
  }

  // ── 2) 子插件改成绝对 file: 路径，安装成真实拷贝 ──────────────────────
  const staged = JSON.parse(readFileSync(join(staging, 'package.json'), 'utf8'))
  const names = rows.map((row) => row.package)
  staged.dependencies = {}
  for (const row of rows) {
    const dir = resolve(root, row.dir).replace(/\\/g, '/')
    if (!existsSync(join(dir, 'package.json'))) throw new Error(`子插件目录不存在或没有 package.json：${dir}`)
    staged.dependencies[row.package] = `file:${dir}`
  }
  staged.bundledDependencies = names
  writeFileSync(join(staging, 'package.json'), `${JSON.stringify(staged, null, 2)}\n`, 'utf8')

  console.log(`安装子插件到 staging（${names.length} 个）：${names.join(', ')}`)
  run(['install', '--install-links', '--no-audit', '--no-fund', '--legacy-peer-deps', '--ignore-scripts'], staging)

  // ── 3) 剥掉子插件夹带的 node_modules（构建期 devDeps，运行时用不到）──
  for (const name of names) {
    const dep = join(staging, 'node_modules', name)
    if (!existsSync(dep)) throw new Error(`staging 里没有装出 ${name}，检查 aggregate.json 的 dir`)
    rmSync(join(dep, 'node_modules'), { recursive: true, force: true })
    const manifest = JSON.parse(readFileSync(join(dep, 'package.json'), 'utf8'))
    const runtimeDeps = Object.keys(manifest.dependencies ?? {})
    if (runtimeDeps.length > 0) {
      console.warn(`⚠ ${name} 有运行时 dependencies（${runtimeDeps.join(', ')}），其 node_modules 已被删掉，请确认宿主里另有提供`)
    }
  }

  // ── 4) 打包 ────────────────────────────────────────────────────────────
  run(['pack', '--pack-destination', root], staging)
  const tarball = join(root, `${pkg.name}-${pkg.version}.tgz`)
  if (!existsSync(tarball)) throw new Error(`没有生成 ${tarball}`)

  // ── 5) 校验 tgz 里真的带上了每个子插件 ────────────────────────────────
  const raw = gunzipSync(readFileSync(tarball))
  const missing = names.filter((name) => !raw.includes(Buffer.from(`package/node_modules/${name}/package.json`)))
  if (missing.length > 0) throw new Error(`tgz 里缺少子插件：${missing.join(', ')}（bundledDependencies 没生效？）`)

  const size = statSync(tarball).size / 1024 / 1024
  console.log(`\n产物：${tarball}（${size.toFixed(1)} MB，含 ${names.length} 个子插件）`)
  console.log(`安装：dsh plugin --profile web add "${tarball}"`)
} finally {
  rmSync(staging, { recursive: true, force: true })
}
