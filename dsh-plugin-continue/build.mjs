/**
 * dsh-plugin-continue 的自包含构建脚本，独立于 DeepSeek Harness 源码库。
 * 共享的 `clientBundle` tsdown 预设并未发布，因此本脚本复刻它产出的浏览器
 * bundle 契约：通过 `window.__ModuleLoader__.load({ id, factory })` 注册一个
 * CJS 闭包工厂，并把平台模块（react、cordis、client-store、ui-slots、
 * ui-primitives）作为运行时由 DSH 模块表提供的 external 保留。
 */
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const ID = manifest.name

// 隐式的客户端基线（DSH web 外壳中的 PLATFORM_MODULES）。这里的每个
// specifier 都必须保持为 `require(...)`，以便模块表能应答它。
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

// Node 端：loader 导入 `exports["."]` 以挂载（空的）宿主插件。
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
})

// 浏览器端：客户端模块表注册并实例化的惰性 CJS 闭包工厂。工厂收到绑定到
// 模块表的同步 `require`；`module.exports` 承载插件的 `apply`/`inject` 导出。
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
