import { describe, expect, it } from 'vitest'
import { findHotkeyConflicts, isValidAccelerator, normalizeAccelerator } from '../src/shared/hotkeys'
import type { HotkeyBinding } from '../src/shared/types'

describe('normalizeAccelerator — 组合键规范化', () => {
  it('把随手写的组合键规范成 Electron 语法', () => {
    expect(normalizeAccelerator('ctrl + alt + k')).toBe('Ctrl+Alt+K')
    expect(normalizeAccelerator('Ctrl+Alt+K')).toBe('Ctrl+Alt+K')
    expect(normalizeAccelerator('win+shift+d')).toBe('Shift+Super+D')
    expect(normalizeAccelerator('cmd + 1')).toBe('Super+1')
    expect(normalizeAccelerator('option + g')).toBe('Alt+G')
  })

  it('功能键与特殊键', () => {
    expect(normalizeAccelerator('f5')).toBe('F5')
    expect(normalizeAccelerator('ctrl+f12')).toBe('Ctrl+F12')
    expect(normalizeAccelerator('alt+space')).toBe('Alt+Space')
    expect(normalizeAccelerator('shift+enter')).toBe('Shift+Enter')
    expect(normalizeAccelerator('ctrl+,')).toBe('Ctrl+Comma')
  })

  it('修饰键去重并保持固定顺序', () => {
    expect(normalizeAccelerator('alt+ctrl+shift+x')).toBe('Ctrl+Alt+Shift+X')
    expect(normalizeAccelerator('ctrl+ctrl+b')).toBe('Ctrl+B')
    expect(normalizeAccelerator('shift+alt+ctrl+a')).toBe('Ctrl+Alt+Shift+A')
  })

  it('只有修饰键或空输入返回空串', () => {
    expect(normalizeAccelerator('')).toBe('')
    expect(normalizeAccelerator('   ')).toBe('')
    expect(normalizeAccelerator('ctrl+alt')).toBe('')
    expect(normalizeAccelerator('ctrl')).toBe('')
  })

  it('字母统一大写，数字保留', () => {
    expect(normalizeAccelerator('a')).toBe('A')
    expect(normalizeAccelerator('ctrl+9')).toBe('Ctrl+9')
  })
})

describe('isValidAccelerator — 语法校验', () => {
  it('接受合法组合', () => {
    expect(isValidAccelerator('Ctrl+Alt+K')).toBe(true)
    expect(isValidAccelerator('Super+D')).toBe(true)
    expect(isValidAccelerator('F13')).toBe(true)
    expect(isValidAccelerator('Ctrl+Space')).toBe(true)
    expect(isValidAccelerator('5')).toBe(true)
  })

  it('拒绝非法组合', () => {
    expect(isValidAccelerator('')).toBe(false)
    expect(isValidAccelerator('Ctrl+Alt')).toBe(false)
    expect(isValidAccelerator('Ctrl+F99')).toBe(false)
  })
})

describe('findHotkeyConflicts — 冲突检测', () => {
  const make = (id: string, accelerator: string): HotkeyBinding => ({
    id,
    label: id,
    query: 'anything',
    accelerator
  })

  it('绑定之间重复会被发现', () => {
    const conflicts = findHotkeyConflicts('Alt+Space', [make('a', 'Ctrl+Alt+K'), make('b', 'Ctrl+Alt+K')])
    expect(conflicts).toEqual(['Ctrl+Alt+K'])
  })

  it('与主唤起键相同的绑定会被发现', () => {
    const conflicts = findHotkeyConflicts('Alt+Space', [make('a', 'Alt+Space'), make('b', 'Ctrl+Alt+K')])
    expect(conflicts).toEqual(['Alt+Space'])
  })

  it('没有冲突时返回空数组', () => {
    expect(findHotkeyConflicts('Alt+Space', [make('a', 'Ctrl+Alt+K'), make('b', 'Ctrl+Alt+J')])).toEqual([])
  })

  it('空列表安全', () => {
    expect(findHotkeyConflicts('Alt+Space', [])).toEqual([])
    expect(findHotkeyConflicts('', [])).toEqual([])
  })
})
