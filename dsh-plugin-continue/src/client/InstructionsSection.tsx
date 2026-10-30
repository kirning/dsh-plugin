/**
 * 「常用指令」设置页：在设置面板中管理自定义指令（新增 / 编辑 / 删除）。
 *
 * 内置的「继续」指令以只读行展示（无编辑、无删除入口）；自定义指令逐条列出，
 * 每条支持内联编辑与删除；底部是新增指令的输入行。所有写入都走注入的
 * 控制器动作，与输入框左侧的下拉共享同一份持久化状态。
 */
import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  Button, IconEditOutlineRegular, IconPlusOutlineRegular, IconTrashOutlineRegular, Input,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { listInstructions, type InstructionsState, type Instruction } from './instructions.ts'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'

/** 注册侧注入面：共享指令快照 + 三个写动作。 */
export interface InstructionsSectionInjected {
  hooks: {
    /** 渲染器据此合成 `useInstructions` 选择器 hook。 */
    instructions: SnapshotStore<InstructionsState>
  }
  /** 新增一条指令。 */
  add: (text: string) => void
  /** 修改一条指令。 */
  update: (id: string, text: string) => void
  /** 删除一条指令。 */
  remove: (id: string) => void
}

/** 设置页组件的完整 props：运行时共享（含 `close`）+ 词典 + 注入面。 */
export type InstructionsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'continue'>
  & InjectFace<InstructionsSectionInjected>

/** `continue` 命名空间词典的翻译函数类型。 */
type ContinueT = PropsLocale<'continue'>['t']

/** 一条自定义指令的行内视图：展示态或编辑态。 */
function CustomRow({ instruction, t, onUpdate, onRemove }: {
  instruction: Instruction
  t: ContinueT
  onUpdate: (id: string, text: string) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(instruction.text)

  const save = () => {
    const trimmed = draft.trim()
    if (trimmed === '') return
    onUpdate(instruction.id, trimmed)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="dsh-instruction-row dsh-instruction-row-editing">
        <Input
          className="dsh-instruction-input"
          value={draft}
          autoFocus
          spellCheck={false}
          aria-label={t('editAria')}
          onChange={event => { setDraft(event.target.value) }}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') save()
            else if (event.key === 'Escape') setEditing(false)
          }}
        />
        <Button size="sm" variant="primary" disabled={draft.trim() === ''} onClick={save}>
          {t('save')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setEditing(false) }}>
          {t('cancel')}
        </Button>
      </li>
    )
  }

  return (
    <li className="dsh-instruction-row">
      <span className="dsh-instruction-text" title={instruction.text}>{instruction.text}</span>
      <Button
        size="sm"
        variant="ghost"
        icon={<IconEditOutlineRegular size={16} />}
        aria-label={t('editAria')}
        onClick={() => {
          setDraft(instruction.text)
          setEditing(true)
        }}
      />
      <Button
        size="sm"
        variant="ghost"
        icon={<IconTrashOutlineRegular size={16} />}
        aria-label={t('deleteAria')}
        onClick={() => { onRemove(instruction.id) }}
      />
    </li>
  )
}

/**
 * 渲染「常用指令」设置页。
 * @param props - 组合后的 slot props。
 * @returns 设置页内容列。
 */
export function InstructionsSection(props: InstructionsSectionProps) {
  const { useInstructions, add, update, remove, t } = props
  const state = useInstructions(snapshot => snapshot)
  const instructions = listInstructions(state)
  const builtin = instructions.filter(item => item.builtin)
  const custom = instructions.filter(item => !item.builtin)

  const [draft, setDraft] = useState('')

  const submitNew = () => {
    const trimmed = draft.trim()
    if (trimmed === '') return
    add(trimmed)
    setDraft('')
  }

  return (
    <div className="dsh-instructions-section">
      <h2 className="dsh-instructions-title">{t('sectionTitle')}</h2>
      <p className="dsh-instructions-intro">{t('sectionIntro')}</p>

      <section className="dsh-instruction-group">
        <h3 className="dsh-instruction-group-head">{t('builtinGroup')}</h3>
        <ul className="dsh-instruction-list">
          {builtin.map(item => (
            <li key={item.id} className="dsh-instruction-row dsh-instruction-row-builtin">
              <span className="dsh-instruction-text" title={item.text}>{item.text}</span>
              <span className="dsh-instruction-badge">{t('builtinBadge')}</span>
              <span className="dsh-instruction-hint">{t('builtinHint')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dsh-instruction-group">
        <h3 className="dsh-instruction-group-head">{t('customGroup')}</h3>
        {custom.length === 0
          ? <p className="dsh-instruction-empty">{t('customEmpty')}</p>
          : (
            <ul className="dsh-instruction-list">
              {custom.map(item => (
                <CustomRow
                  key={item.id}
                  instruction={item}
                  t={t}
                  onUpdate={update}
                  onRemove={remove}
                />
              ))}
            </ul>
          )}
        <form
          className="dsh-instruction-new"
          onSubmit={(event) => {
            event.preventDefault()
            submitNew()
          }}
        >
          <Input
            className="dsh-instruction-input"
            value={draft}
            spellCheck={false}
            placeholder={t('addPlaceholder')}
            aria-label={t('addPlaceholder')}
            onChange={event => { setDraft(event.target.value) }}
          />
          <Button
            size="sm"
            variant="primary"
            icon={<IconPlusOutlineRegular size={16} />}
            disabled={draft.trim() === ''}
            onClick={() => { submitNew() }}
          >
            {t('add')}
          </Button>
        </form>
      </section>
    </div>
  )
}
