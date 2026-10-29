import type { PortEntry } from '@shared/types'
import { api } from '../../api'
import { emoji, type Provider, type ResultItem } from '../types'
import { copyAction } from '../helpers'

function build(entry: PortEntry): ResultItem {
  const port = entry.local.split(/:(?=[^:]*$)/)[1] ?? entry.local
  const listening = entry.state === 'LISTENING'
  return {
    id: `port:${entry.protocol}:${entry.local}:${entry.pid}`,
    providerId: 'ports',
    title: `:${port} · ${entry.process}`,
    subtitle: `${entry.protocol} ${entry.local}${listening ? ' · 监听中' : ` · ${entry.state}`} · PID ${entry.pid}`,
    icon: emoji(listening ? '🟢' : '🔵'),
    keywords: [port, entry.process, entry.local, entry.remote],
    usageKey: `port:${entry.protocol}:${port}`,
    detail: {
      hero: emoji('🔌'),
      fields: [
        { label: '端口', value: port },
        { label: '协议', value: entry.protocol },
        { label: '本地地址', value: entry.local },
        { label: '远端地址', value: entry.remote },
        { label: '状态', value: entry.state },
        { label: '进程', value: `${entry.process} (PID ${entry.pid})` }
      ],
      footer: '回车结束该进程 · Ctrl+C 复制地址'
    },
    actions: [
      {
        id: 'kill',
        name: `结束 ${entry.process} (PID ${entry.pid})`,
        primary: true,
        icon: '⛔',
        async run({ toast, refresh }: { toast: (m: string) => void; refresh: () => void }) {
          const ok = await api.processes.kill(entry.pid)
          toast(ok ? `已结束 ${entry.process} (PID ${entry.pid})` : '结束进程失败，可能需要管理员权限')
          refresh()
        }
      },
      copyAction(() => entry.local),
      copyAction(() => String(entry.pid))
    ]
  }
}

export const portsProvider: Provider = {
  id: 'ports',
  name: '端口占用',
  description: '查询本机端口被哪个进程占用，一键结束（netstat -ano）',
  icon: emoji('🔌'),
  aliases: ['port', 'ports', '端口', '占用', 'netstat'],
  participatesInRoot: false,
  rank: 35,
  entry: true,

  async search(ctx) {
    const raw = ctx.args.trim()
    let list: PortEntry[] = []
    try {
      list = await api.ports.list()
    } catch (error) {
      return [
        {
          id: 'ports:error',
          providerId: 'ports',
          title: '端口查询失败',
          subtitle: String(error),
          icon: emoji('⚠️'),
          actions: []
        }
      ]
    }

    if (raw) {
      const q = raw.toLowerCase()
      list = list.filter(
        (p) =>
          p.local.toLowerCase().includes(q) ||
          p.process.toLowerCase().includes(q) ||
          String(p.pid) === q
      )
    }

    return list.slice(0, ctx.settings.resultLimit).map((entry) => build(entry))
  }
}
