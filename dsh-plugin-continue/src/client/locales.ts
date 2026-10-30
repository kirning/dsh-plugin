/** `continue` 命名空间词典（「继续」下拉按钮与「常用指令」设置页的文案）。 */

/** 简体中文词典（键集合的权威来源）。 */
export const zh = {
  // 下拉按钮
  'label': '继续',
  'title': '选择常用指令并发送',
  'dropdown.aria': '打开常用指令',
  'sendNow.title': '直接发送：{text}',
  'sendNow.aria': '直接发送：{text}',
  // 打开目录（既有能力）
  'openDirectory.title': '打开工作区目录',
  'openDirectory.aria': '在资源管理器中打开工作区目录',
  // 设置页
  'nav': '常用指令',
  'sectionTitle': '常用指令',
  'sectionIntro': '自定义常用指令，在输入框左侧的「继续」下拉中选择并发送。',
  'builtinGroup': '默认指令',
  'builtinBadge': '内置',
  'builtinHint': '默认指令不可修改或删除',
  'customGroup': '自定义指令',
  'customEmpty': '还没有自定义指令，在下方新建一条。',
  'add': '添加',
  'addPlaceholder': '输入指令短语',
  'editAria': '编辑指令',
  'deleteAria': '删除指令',
  'save': '保存',
  'cancel': '取消',
} satisfies Record<string, string>

/** continue 命名空间的键联合类型。 */
export type ContinueKey = keyof typeof zh

/** 英文词典，已按 zh 键集合做完整性校验。 */
export const en = {
  // Dropdown button
  'label': 'Continue',
  'title': 'Choose a common instruction to send',
  'dropdown.aria': 'Open common instructions',
  'sendNow.title': 'Send now: {text}',
  'sendNow.aria': 'Send now: {text}',
  // Open directory (existing capability)
  'openDirectory.title': 'Open workspace directory',
  'openDirectory.aria': 'Open workspace directory in file explorer',
  // Settings section
  'nav': 'Common instructions',
  'sectionTitle': 'Common instructions',
  'sectionIntro': 'Customize common instructions and pick one from the "Continue" dropdown on the left of the composer.',
  'builtinGroup': 'Default instruction',
  'builtinBadge': 'Built-in',
  'builtinHint': 'The default instruction cannot be edited or removed',
  'customGroup': 'Custom instructions',
  'customEmpty': 'No custom instructions yet. Create one below.',
  'add': 'Add',
  'addPlaceholder': 'Type an instruction phrase',
  'editAria': 'Edit instruction',
  'deleteAria': 'Delete instruction',
  'save': 'Save',
  'cancel': 'Cancel',
} satisfies Record<ContinueKey, string>
