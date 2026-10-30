/**
 * 「继续」按钮插件，浏览器端部分：注册 `continue` 词典，并在输入框的
 * `conversation.input.left` 座位中注册一个「继续」下拉控件；同时在设置面板
 * 注册一个「常用指令」页面，用于管理客户自定义的指令短语。
 *
 * 下拉与设置页共享同一个 localStorage 持久化的指令 store：内置「继续」指令
 * 不可修改、不可删除；自定义指令可新增、编辑、删除。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// 仅类型：拉取 ui-conversation 的 SlotMap 合并（input.left 座位）。
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// 仅类型：拉取 locale 插件的 Context 合并（ctx.locale）。
import type {} from '@deepseek-ai/dsh-client-locale/client'
// 仅类型：拉取 renderer 的 Context 合并（ctx.slots）。
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// 仅类型：拉取 ui-settings 的 SlotMap 合并（settings.section 座位）。
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ContinueAction } from './ContinueAction.tsx'
import { InstructionsSection } from './InstructionsSection.tsx'
import { InstructionsController } from './instructions.ts'
import { en, zh, type ContinueKey } from './locales.ts'

export type { ContinueKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 输入框「继续」下拉与「常用指令」设置页的文案。 */
    continue: ContinueKey
  }
}

/** 本插件拥有的词典命名空间。 */
const NS = 'continue'

/** 打开目录所需的 `ctx.remote.session` 结构面（避免引入整条 dsh-api 类型链）。 */
interface OpenDirectoryRemote {
  session: {
    openWorkspacePath: (request: { path: string }) => Promise<
      | { ok: true }
      | { ok: false; error: { message: string } }
    >
  }
}

/** 读取当前会话工作区目录所需的 `ctx.sessions` 结构面。 */
interface SessionsFace {
  list: {
    getSnapshot: () => {
      byId: Record<string, { cwd?: string } | undefined>
    }
  }
}

// 样式注入与 DSH 自身工厂期的 CSS 一致：bundle 实例化时安装一个幂等的
// <style> 标签，携带针对运行时 --dsw-* 别名的紧凑控件样式。
const CSS_TAG_ID = 'dsh-plugin-continue/continue.css'
const CSS_TEXT = [
  // 继续下拉触发按钮
  '.dsh-continue-action{height:28px;padding:0 8px;border:none;border-radius:8px;',
  'background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;',
  'font-weight:500;line-height:20px;white-space:nowrap;cursor:pointer;',
  'display:inline-flex;align-items:center;gap:2px}',
  '.dsh-continue-action:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);',
  'color:var(--dsw-alias-label-primary)}',
  '.dsh-continue-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);',
  'outline-offset:2px}',
  '.dsh-continue-action:disabled{opacity:.5;cursor:default}',
  '.dsh-continue-chevron{display:inline-flex;color:inherit;opacity:.7}',
  // 拆分按钮：左半文字点一下直接发送，右半箭头展开常用指令菜单
  '.dsh-continue-split{display:inline-flex;align-items:stretch}',
  '.dsh-continue-label{border-radius:8px 0 0 8px;padding:0 6px 0 8px}',
  '.dsh-continue-caret{border-radius:0 8px 8px 0;padding:0 4px;',
  'border-left:1px solid var(--dsw-alias-border-l2)}',
  // 打开目录按钮
  '.dsh-continue-icon-action{display:inline-flex;align-items:center;justify-content:center;',
  'width:28px;height:28px;padding:0;border:none;border-radius:8px;background:transparent;',
  'color:var(--dsw-alias-label-secondary);cursor:pointer}',
  '.dsh-continue-icon-action:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);',
  'color:var(--dsw-alias-label-primary)}',
  '.dsh-continue-icon-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);',
  'outline-offset:2px}',
  '.dsh-continue-icon-action:disabled{opacity:.5;cursor:default}',
  // 常用指令设置页
  '.dsh-instructions-section{display:flex;flex-direction:column;gap:8px;max-width:560px}',
  '.dsh-instructions-title{margin:0;font-size:16px;font-weight:600;line-height:24px;',
  'color:var(--dsw-alias-label-primary)}',
  '.dsh-instructions-intro{margin:0;font-size:13px;line-height:20px;',
  'color:var(--dsw-alias-label-secondary)}',
  '.dsh-instruction-group{display:flex;flex-direction:column;gap:8px;margin-top:8px}',
  '.dsh-instruction-group-head{margin:0;font-size:13px;font-weight:600;line-height:20px;',
  'color:var(--dsw-alias-label-primary)}',
  '.dsh-instruction-list{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}',
  '.dsh-instruction-row{display:flex;align-items:center;gap:8px;min-height:36px;padding:6px 10px;',
  'border:0.5px solid var(--dsw-alias-border-l2);border-radius:8px;',
  'background:var(--dsw-alias-bg-layer-1)}',
  '.dsh-instruction-row-builtin{background:transparent}',
  '.dsh-instruction-row-editing{background:transparent;padding-right:6px}',
  '.dsh-instruction-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
  'font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}',
  '.dsh-instruction-badge{flex:none;padding:0 6px;border:0.5px solid var(--dsw-alias-border-l2);',
  'border-radius:6px;font-size:11px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
  '.dsh-instruction-hint{flex:none;font-size:11px;line-height:16px;',
  'color:var(--dsw-alias-label-secondary)}',
  '.dsh-instruction-empty{margin:0;font-size:13px;line-height:20px;',
  'color:var(--dsw-alias-label-secondary)}',
  '.dsh-instruction-new{display:flex;align-items:center;gap:8px}',
  '.dsh-instruction-input{flex:1;min-width:0}',
].join('')

function installStyle(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css=${JSON.stringify(CSS_TAG_ID)}]`) !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-plugin-continue'
  tag.dataset.pluginCss = CSS_TAG_ID
  tag.textContent = CSS_TEXT
  document.head.appendChild(tag)
}
installStyle()

/** 所需服务：该座位的插槽注册表、locale 注册表、会话服务与 Session 远程。 */
export const inject = ['slots', 'locale', 'sessions', 'remote', 'remote.session']

/**
 * 客户端插件主体：注册 `continue` 词典，将「继续」下拉注册进输入框左侧
 * 工具栏座位，并将「常用指令」页面注册进设置面板。
 * @param ctx - 客户端根上下文。
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-plugin-continue: dictionaries')

  const remote = ctx as ClientContext & { remote: OpenDirectoryRemote }
  const sessions = (ctx as unknown as { sessions: SessionsFace }).sessions
  const instructions = new InstructionsController()

  const openDirectory = (path: string): void => {
    remote.remote.session.openWorkspacePath({ path }).then((result) => {
      if (!result.ok) console.warn(`dsh-plugin-continue: 打开目录失败: ${result.error.message}`)
    }).catch((error: unknown) => {
      console.warn('dsh-plugin-continue: 打开目录失败:', error)
    })
  }

  // 输入框左侧的「继续」下拉。
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
    name: 'conversation.input.left',
    id: 'continue',
    order: 0,
    locale: NS,
    inject: (sessionId: string) => ({
      openDirectory,
      cwd: sessions.list.getSnapshot().byId[sessionId]?.cwd,
      hooks: { instructions: instructions.store },
    }),
  }, ContinueAction))

  // 设置面板中的「常用指令」页面。
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'common-instructions',
    order: 30,
    label: () => ctx.locale.bind(NS)('nav'),
    locale: NS,
    inject: () => ({
      add: (text: string) => { instructions.add(text) },
      update: (id: string, text: string) => { instructions.update(id, text) },
      remove: (id: string) => { instructions.remove(id) },
      hooks: { instructions: instructions.store },
    }),
  }, InstructionsSection))
}
