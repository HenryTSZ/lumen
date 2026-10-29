import type { SnapAction, WindowEntry } from '@shared/types'
import { api } from '../../api'
import { rankBy } from '../fuzzy'
import { initialFor } from '../utils'
import { emoji, textIcon, type Provider, type ResultItem, type SearchContext } from '../types'

/** 分屏/摆放动作的展示信息 */
const SNAP_META: Array<{ action: SnapAction; name: string; icon: string }> = [
  { action: 'left', name: '移到左半屏', icon: '⬅️' },
  { action: 'right', name: '移到右半屏', icon: '➡️' },
  { action: 'maximize', name: '最大化', icon: '⬆️' },
  { action: 'center', name: '居中', icon: '🎯' },
  { action: 'nextDisplay', name: '移到下一块屏幕', icon: '🖥️' },
  { action: 'minimize', name: '最小化', icon: '⬇️' }
]

function snapAction(pid: number, meta: (typeof SNAP_META)[number]): ResultItem['actions'][number] {
  return {
    id: `snap:${meta.action}`,
    name: meta.name,
    icon: meta.icon,
    async run({ toast }: { toast: (m: string) => void }) {
      await api.windows.snap(pid, meta.action)
      toast(`${meta.name}完成`)
    }
  }
}

function build(entry: WindowEntry, ctx: SearchContext): ResultItem {
  return {
    id: `win:${entry.pid}`,
    providerId: 'windows',
    title: entry.title,
    subtitle: `${entry.process} · PID ${entry.pid}`,
    icon: textIcon(initialFor(entry.process || entry.title)),
    keywords: [entry.process, entry.path],
    usageKey: `win:${entry.process}`,
    detail: {
      hero: emoji('🪟'),
      fields: [
        { label: '窗口标题', value: entry.title },
        { label: '进程', value: entry.process },
        { label: 'PID', value: String(entry.pid) },
        { label: '可执行文件', value: entry.path || '—' }
      ]
    },
    actions: [
      {
        id: 'focus',
        name: '切换到该窗口',
        primary: true,
        shortcut: ['↵'],
        icon: '🪟',
        async run({ close }) {
          close()
          await api.windows.focus(entry.pid)
        }
      },
      ...SNAP_META.map((meta) => snapAction(entry.pid, meta)),
      {
        id: 'close',
        name: '结束进程',
        icon: '❌',
        async run({ toast, refresh }: { toast: (m: string) => void; refresh: () => void }) {
          await api.windows.close(entry.pid)
          toast(`已结束 ${entry.process}`)
          refresh()
        }
      }
    ]
  }
}

export const windowSwitcherProvider: Provider = {
  id: 'windows',
  name: '窗口切换',
  description: '在已打开的窗口之间快速跳转（Alt-Tab 的可搜索版本）',
  icon: emoji('🪟'),
  aliases: ['w', 'win', 'windows', '窗口'],
  participatesInRoot: false,
  rank: 20,
  entry: true,

  async search(ctx) {
    const list = await api.windows.list()
    const query = ctx.args.trim()
    const pool = query
      ? rankBy(list, query, (w) => [w.title, w.process]).map(({ item, score }) => ({ item, score }))
      : list.map((item) => ({ item, score: 500 }))
    return pool.slice(0, ctx.settings.resultLimit).map(({ item, score }) => ({ ...build(item, ctx), score }))
  }
}
