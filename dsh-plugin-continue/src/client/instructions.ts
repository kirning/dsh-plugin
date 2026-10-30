/**
 * 常用指令（Common Instructions）的客户端状态：一个 localStorage 持久化的
 * 快照 store，再叠加一条不变的内置「继续」指令。
 *
 * 设置页与输入框左侧的下拉按钮共享同一份 store 实例，任何一处的增删改都会
 * 实时同步到另一处（二者订阅同一个 `SnapshotStore`）。内置指令不进入可写
 * 数据，因此天然「不可修改、不可删除」。
 */
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'

/** 内置「继续」指令的稳定 id。 */
export const BUILTIN_INSTRUCTION_ID = 'continue'
/** 内置「继续」指令发送的字面量短语。 */
export const BUILTIN_INSTRUCTION_TEXT = '继续'

/** 一条自定义指令。 */
export interface CustomInstruction {
  /** 稳定 id（创建时生成）。 */
  id: string
  /** 发送给模型的字面量短语。 */
  text: string
}

/** 持久化的指令状态；内置指令不在此列，永不参与增删改。 */
export interface InstructionsState {
  custom: readonly CustomInstruction[]
}

/** 对外统一的指令视图：内置在最前，随后是自定义指令。 */
export interface Instruction {
  id: string
  text: string
  builtin: boolean
}

/** localStorage 持久化键。 */
const PERSIST_KEY = 'dsh-plugin-continue/instructions'

/** 生成一个无外部依赖、足够唯一的自定义指令 id。 */
function nextId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** 规范化持久化数据：结构损坏时回退到空的自定义列表，保证内置指令始终存在。 */
function normalize(state: InstructionsState): InstructionsState {
  const ok = Array.isArray(state.custom)
    && state.custom.every(entry =>
      entry !== null
      && typeof entry === 'object'
      && typeof entry.id === 'string'
      && typeof entry.text === 'string')
  return ok ? state : { custom: [] }
}

/** 把 store 快照展开成完整指令列表（内置在最前）。 */
export function listInstructions(state: InstructionsState): readonly Instruction[] {
  return [
    { id: BUILTIN_INSTRUCTION_ID, text: BUILTIN_INSTRUCTION_TEXT, builtin: true },
    ...state.custom.map(entry => ({ id: entry.id, text: entry.text, builtin: false })),
  ]
}

/** 常用指令的读写控制器，设置页与下拉按钮共享同一实例。 */
export class InstructionsController {
  /** 供渲染器合成 `useInstructions` 选择器 hook 的快照 store。 */
  readonly store: SnapshotStore<InstructionsState>

  constructor() {
    this.store = createSnapshotStore<InstructionsState>(
      { custom: [] },
      { persist: { name: PERSIST_KEY } },
    )
    const snapshot = this.store.getSnapshot()
    const normalized = normalize(snapshot)
    if (normalized !== snapshot) this.store.set(normalized)
  }

  /** 新增一条自定义指令（空白内容被忽略）。 */
  add(text: string): void {
    const trimmed = text.trim()
    if (trimmed === '') return
    const { custom } = this.store.getSnapshot()
    this.store.set({ custom: [...custom, { id: nextId(), text: trimmed }] })
  }

  /** 修改一条自定义指令（内置指令不在此列，天然不可修改）。 */
  update(id: string, text: string): void {
    const trimmed = text.trim()
    if (trimmed === '') return
    const { custom } = this.store.getSnapshot()
    this.store.set({ custom: custom.map(entry => entry.id === id ? { id, text: trimmed } : entry) })
  }

  /** 删除一条自定义指令（内置指令不在此列，天然不可删除）。 */
  remove(id: string): void {
    const { custom } = this.store.getSnapshot()
    this.store.set({ custom: custom.filter(entry => entry.id !== id) })
  }
}
