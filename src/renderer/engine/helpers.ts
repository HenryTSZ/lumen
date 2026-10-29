import type { ResultItem } from './types'
import { pinUsage, usageBoost, usageRecord } from './usage'

/** 界面上展示的修饰键。Windows 版本统一使用 Ctrl */
export const MOD = 'Ctrl'

/** 「置顶 / 取消置顶」：置顶后该项在聚合搜索里永远排前 */
export function pinAction(getKey: () => string): ResultItem['actions'][number] {
  return {
    id: 'pin',
    name: usageRecord(getKey())?.pinned ? '取消置顶' : '置顶到最前',
    shortcut: [MOD, 'P'],
    icon: '📌',
    async run({ toast, refresh }) {
      const current = usageRecord(getKey())
      await pinUsage(getKey(), !current?.pinned)
      toast(current?.pinned ? '已取消置顶' : '已置顶')
      refresh()
    }
  }
}

/** 权重提示行，展示在详情面板里 */
export function usageHint(getKey: () => string): string {
  const boost = usageBoost(getKey())
  if (!boost) return '尚未用过此项'
  const record = usageRecord(getKey())
  return `已执行 ${record?.count ?? 0} 次${record?.pinned ? ' · 已置顶' : ''}`
}

export function copyAction(getValue: () => string): ResultItem['actions'][number] {
  return {
    id: 'copy',
    name: '复制',
    shortcut: [MOD, 'C'],
    icon: '📋',
    async run({ api, toast }) {
      await api.clipboard.write(getValue())
      toast('已复制到剪贴板')
    }
  }
}

export function pasteAction(getValue: () => string): ResultItem['actions'][number] {
  return {
    id: 'paste',
    name: '粘贴到当前窗口',
    shortcut: [MOD, 'V'],
    icon: '📥',
    async run({ api, close, toast }) {
      close()
      await api.clipboard.write(getValue())
      await api.launcher.paste()
      toast('已粘贴')
    }
  }
}

export function revealAction(getPath: () => string): ResultItem['actions'][number] {
  return {
    id: 'reveal',
    name: '在资源管理器中显示',
    shortcut: [MOD, 'R'],
    icon: '🗂️',
    async run({ api, close }) {
      close()
      await api.files.reveal(getPath())
    }
  }
}
