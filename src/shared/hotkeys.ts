import type { HotkeyBinding } from './types'

/**
 * 快捷键 accelerator 的纯工具函数。
 * 放在 shared：主进程注册、渲染层表单校验都用同一份规则。
 */

const MODIFIER_MAP: Record<string, string> = {
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  opt: 'Alt',
  shift: 'Shift',
  cmd: 'Super',
  command: 'Super',
  super: 'Super',
  win: 'Super',
  meta: 'Super'
}

export const ACCELERATOR_SPECIAL_KEYS: string[] = [
  'Escape',
  'Space',
  'Tab',
  'Enter',
  'CapsLock',
  'Up',
  'Down',
  'Left',
  'Right',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Insert',
  'Delete',
  'Backspace',
  'Plus',
  'Comma',
  'Period'
]

const SPECIAL_KEYS: Record<string, string> = {
  esc: 'Escape',
  escape: 'Escape',
  space: 'Space',
  tab: 'Tab',
  enter: 'Enter',
  return: 'Enter',
  capslock: 'CapsLock',
  caps: 'CapsLock',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  insert: 'Insert',
  ins: 'Insert',
  delete: 'Delete',
  del: 'Delete',
  backspace: 'Backspace',
  plus: 'Plus',
  ',': 'Comma',
  comma: 'Comma',
  '.': 'Period',
  period: 'Period'
}

/**
 * 把用户手写的组合键规范成 Electron accelerator 语法：
 *   "ctrl + alt + k" → "Ctrl+Alt+K"
 *   "win+shift+d"    → "Super+Shift+D"
 * 无法识别的部分原样保留；纯输入（只有修饰键）返回空串。
 */
export function normalizeAccelerator(input: string): string {
  const parts = input
    .replace(/\s+/g, '')
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
  if (!parts.length) return ''

  const modifiers: string[] = []
  let key = ''
  for (const raw of parts) {
    const lower = raw.toLowerCase()
    if (MODIFIER_MAP[lower]) {
      modifiers.push(MODIFIER_MAP[lower])
      continue
    }
    if (SPECIAL_KEYS[lower]) {
      key = SPECIAL_KEYS[lower]
      continue
    }
    if (/^f([1-9]|1[0-9]|2[0-4])$/i.test(lower)) {
      key = `F${lower.slice(1)}`
      continue
    }
    if (/^[0-9a-z]$/i.test(lower)) {
      key = lower.toUpperCase()
      continue
    }
    if (/^[0-9]+$/.test(lower)) {
      key = lower
      continue
    }
    key = raw
  }

  if (!key) return ''
  // 修饰键去重并保持固定顺序
  const ordered = ['Ctrl', 'Alt', 'Shift', 'Super'].filter((mod) => modifiers.includes(mod))
  return [...ordered, key].join('+')
}

/** 校验 accelerator 语法是否合法（非空 + 末段是可识别主键） */
export function isValidAccelerator(accelerator: string): boolean {
  if (!accelerator) return false
  const parts = accelerator.split('+')
  const key = parts[parts.length - 1]
  return (
    /^[A-Z0-9]$/.test(key) ||
    /^F([1-9]|1[0-9]|2[0-4])$/.test(key) ||
    ACCELERATOR_SPECIAL_KEYS.includes(key)
  )
}

/**
 * 找出会互相冲突的快捷键：
 *   - 绑定之间重复的 accelerator
 *   - 与主唤起键相同的绑定
 * 返回冲突 accelerator 列表（去重）。
 */
export function findHotkeyConflicts(launcherKey: string, bindings: HotkeyBinding[]): string[] {
  const seen = new Map<string, number>()
  const conflicts = new Set<string>()
  for (const binding of bindings) {
    seen.set(binding.accelerator, (seen.get(binding.accelerator) ?? 0) + 1)
  }
  for (const [key, count] of seen) {
    if (count > 1) conflicts.add(key)
  }
  if (launcherKey && seen.has(launcherKey)) conflicts.add(launcherKey)
  return [...conflicts]
}
