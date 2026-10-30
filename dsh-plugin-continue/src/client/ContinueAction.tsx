/**
 * 「继续」按钮插件，输入框左侧控件：一个**拆分按钮**——左侧文字是默认指令
 * （内置「继续」），点击直接写入草稿并发送；右侧箭头才展开常用指令菜单，
 * 选中任意一条（内置或自定义）同样立即发送；再右边是在系统文件管理器中
 * 打开当前会话工作区目录的图标按钮。
 */
import { useState } from 'react'
import {
  IconChevronDownOutlineRegular, Menu, type MenuEntry,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { listInstructions, type InstructionsState } from './instructions.ts'

/** 注册侧注入面：打开目录器、工作区目录，以及共享的常用指令快照。 */
export interface ContinueActionInjected {
  /** 在系统文件管理器中打开一个宿主目录。 */
  openDirectory: (path: string) => void
  /** 当前会话的工作区目录（无项目目录时为空）。 */
  cwd: string | undefined
  hooks: {
    /** 渲染器据此合成 `useInstructions` 选择器 hook。 */
    instructions: SnapshotStore<InstructionsState>
  }
}

/**
 * continue 座位组件的完整 props：运行时共享（标准套件）、locale 座位，
 * 以及插件注入的宿主目录打开器、当前工作区目录与常用指令快照。
 */
export type ContinueActionProps =
  PropsRuntime<'conversation.input.left'>
  & PropsLocale<'continue'>
  & InjectFace<ContinueActionInjected>

/** 紧凑的「打开文件夹」图形（对齐 ui-primitives 的 IconFolderOpenOutline16）。 */
function FolderOpenIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5.19629 1.57104C5.81144 1.5711 6.38623 1.8786 6.72754 2.39038L7.19922 3.09839C7.28454 3.22635 7.42824 3.30344 7.58203 3.30347H12.1699C13.5039 3.30348 14.5859 4.38548 14.5859 5.71948V6.62671C15.2694 7.02689 15.6605 7.85012 15.4385 8.68726L14.3848 12.658C14.1037 13.7164 13.1449 14.4527 12.0498 14.4529H2.91699C1.51651 14.4529 0.451662 13.2814 0.501954 11.9519V3.98706C0.501954 2.65305 1.58396 1.57104 2.91797 1.57104H5.19629ZM3.7793 7.75562C3.30994 7.75562 2.89883 8.07153 2.77832 8.52515L1.91602 11.7722C1.74167 12.4291 2.23734 13.073 2.91699 13.073H12.0498C12.5191 13.0728 12.9304 12.757 13.0508 12.3035L14.1045 8.33374C14.1819 8.04202 13.9619 7.756 13.6602 7.75562H3.7793ZM2.91797 2.9519C2.34625 2.9519 1.88281 3.41534 1.88281 3.98706V7.2937C2.33068 6.7269 3.02249 6.37476 3.7793 6.37476H13.2051V5.71948C13.2051 5.14777 12.7416 4.68434 12.1699 4.68433H7.58203C6.96675 4.6843 6.39209 4.37595 6.05078 3.86401L5.5791 3.15601C5.49379 3.02821 5.34995 2.95196 5.19629 2.9519H2.91797Z" fill="currentColor" />
    </svg>
  )
}

/**
 * 位于工具栏最左侧的紧凑输入控件：拆分按钮（左半文字直接发送默认指令，右半
 * 箭头展开常用指令菜单）＋「打开工作区目录」图标按钮（仅当会话有项目目录时显示）。
 */
export function ContinueAction(props: ContinueActionProps) {
  const { inputActions, openDirectory, cwd, t, useInstructions } = props
  const [open, setOpen] = useState(false)
  const state = useInstructions(snapshot => snapshot)
  const instructions = listInstructions(state)
  /** 左半发送的指令：列表首位即内置「继续」。 */
  const primary = instructions[0]
  const items: MenuEntry[] = instructions.map(item => ({ id: item.id, label: item.text }))

  /** 把一条指令写入草稿并立即提交。 */
  const send = (text: string) => {
    inputActions.setDraft(text)
    inputActions.submit()
  }

  const select = (id: string) => {
    const instruction = instructions.find(item => item.id === id)
    if (instruction === undefined) return
    send(instruction.text)
  }

  return (
    <>
      <span className="dsh-continue-split">
        <button
          type="button"
          className="dsh-continue-action dsh-continue-label"
          data-continue-action
          title={t('sendNow.title', { text: primary.text })}
          aria-label={t('sendNow.aria', { text: primary.text })}
          onClick={() => { send(primary.text) }}
        >
          {primary.text}
        </button>
        <Menu
          portal
          compact
          open={open}
          items={items}
          onClose={() => { setOpen(false) }}
          onSelect={(id) => {
            setOpen(false)
            select(id)
          }}
          anchor={(
            <button
              type="button"
              className="dsh-continue-action dsh-continue-caret"
              data-continue-menu
              title={t('title')}
              aria-label={t('dropdown.aria')}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => { setOpen(previous => !previous) }}
            >
              <IconChevronDownOutlineRegular size={14} className="dsh-continue-chevron" />
            </button>
          )}
        />
      </span>
      {cwd !== undefined && cwd !== '' && (
        <button
          type="button"
          className="dsh-continue-icon-action"
          data-open-directory
          title={t('openDirectory.title')}
          aria-label={t('openDirectory.aria')}
          onClick={() => { openDirectory(cwd) }}
        >
          <FolderOpenIcon />
        </button>
      )}
    </>
  )
}
