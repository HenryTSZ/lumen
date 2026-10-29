import type { ProcessEntry } from '@shared/types'
import { api } from '../../api'
import { rankBy } from '../fuzzy'
import { initialFor } from '../utils'
import { emoji, textIcon, type Provider, type ResultItem } from '../types'

function build(entry: ProcessEntry): ResultItem {
  return {
    id: `proc:${entry.pid}`,
    providerId: 'processes',
    title: `${entry.name} (${entry.pid})`,
    subtitle: `${entry.memMB.toFixed(1)} MB${entry.title ? ` · ${entry.title}` : ''}`,
    icon: textIcon(initialFor(entry.name)),
    keywords: [entry.name, entry.title],
    usageKey: `proc:${entry.name}`,
    detail: {
      hero: emoji('⚙️'),
      fields: [
        { label: '进程', value: entry.name },
        { label: 'PID', value: String(entry.pid) },
        { label: '内存', value: `${entry.memMB.toFixed(1)} MB` },
        { label: '窗口标题', value: entry.title || '—' }
      ],
      footer: '回车强制结束该进程'
    },
    actions: [
      {
        id: 'kill',
        name: `结束 ${entry.name} (PID ${entry.pid})`,
        primary: true,
        icon: '⛔',
        async run({ toast, refresh }: { toast: (m: string) => void; refresh: () => void }) {
          const ok = await api.processes.kill(entry.pid)
          toast(ok ? `已结束 ${entry.name} (PID ${entry.pid})` : '结束进程失败，可能需要管理员权限')
          refresh()
        }
      }
    ]
  }
}

export const processesProvider: Provider = {
  id: 'processes',
  name: '进程管理',
  description: '按内存排序列出进程，输入名字过滤，回车强制结束',
  icon: emoji('⚙️'),
  aliases: ['kill', 'proc', '进程', '杀进程', '任务'],
  participatesInRoot: false,
  rank: 36,
  entry: true,

  async search(ctx) {
    const query = ctx.args.trim()
    let list: Awaited<ReturnType<typeof api.processes.list>>
    try {
      list = await api.processes.list()
    } catch (error) {
      return [
        {
          id: 'proc:error',
          providerId: 'processes',
          title: '进程列表获取失败',
          subtitle: String(error),
          icon: emoji('⚠️'),
          actions: []
        }
      ]
    }
    const pool = query
      ? rankBy(list, query, (p) => [p.name, p.title]).map(({ item }) => item)
      : list
    return pool.slice(0, ctx.settings.resultLimit).map(build)
  }
}
