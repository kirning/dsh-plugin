/**
 * dsh-plugin-company-quota 的自包含构建脚本。复刻 DSH 客户端 bundle 契约：
 * 通过 `window.__ModuleLoader__.load({ id, factory })` 注册一个 CJS 闭包工厂，
 * 平台模块（react / cordis / client-store / ui-slots / ui-primitives）保持
 * external，由 DSH 模块表在运行时应答。
 */
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const ID = manifest.name

const EXTERNAL = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
]

// 宿主半：ESM，node 平台；@deepseek-ai 的类型导入会被擦除，node 内建保持 external。
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  external: ['@deepseek-ai/*'],
})

// 浏览器半：模块表注册的惰性 CJS 闭包工厂。
await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: EXTERNAL,
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
})
