import type { SystemAction } from '@shared/types'
import { api } from '../../api'
import { rankBy } from '../fuzzy'
import { emoji, type Provider, type ResultItem, type SearchContext } from '../types'

interface SysCommand {
  id: SystemAction
  name: string
  description: string
  icon: string
  danger?: boolean
  /** 执行结果需要回显给用户（例如公网 IP） */
  inline?: boolean
}

const COMMANDS: SysCommand[] = [
  { id: 'lock', name: '锁定屏幕', description: '立即锁屏，等同于 Win+L', icon: '🔒' },
  { id: 'sleep', name: '进入睡眠', description: '低功耗待机，唤醒后回到原状态', icon: '🌙' },
  { id: 'hibernate', name: '休眠', description: '把内存写入磁盘后断电，下次开机恢复现场', icon: '💤' },
  { id: 'shutdown', name: '关机', description: '关闭 Windows', icon: '⏻', danger: true },
  { id: 'restart', name: '重启', description: '重新启动 Windows', icon: '🔄', danger: true },
  { id: 'logoff', name: '注销账户', description: '退出当前用户会话', icon: '🚪', danger: true },
  { id: 'emptyTrash', name: '清空回收站', description: '释放被占用磁盘空间', icon: '🗑️', danger: true },
  { id: 'env', name: '编辑环境变量', description: '打开系统环境变量窗口', icon: '⚙️' },
  { id: 'publicIp', name: '查询公网 IP', description: '调用远程接口获取当前出口 IP', icon: '🌍', inline: true }
]

function build(command: SysCommand, ctx: SearchContext): ResultItem {
  return {
    id: `sys:${command.id}`,
    providerId: 'system',
    title: command.name,
    subtitle: command.description,
    icon: emoji(command.icon),
    keywords: [command.name, command.id],
    usageKey: `sys:${command.id}`,
    actions: [
      {
        id: 'run',
        name: command.inline ? '查询' : '执行',
        primary: true,
        shortcut: ['↵'],
        icon: command.icon,
        async run({ close, toast }) {
          close()
          const output = await api.system.run(command.id)
          if (command.inline || output) toast(output || '已执行')
        }
      }
    ]
  }
}

export const systemProvider: Provider = {
  id: 'system',
  name: '系统',
  description: '锁屏、睡眠、关机、重启、清空回收站等系统级操作',
  icon: emoji('⚙️'),
  aliases: ['sys', 'system', '系统', '关机', '锁屏'],
  participatesInRoot: false,
  rank: 30,
  entry: true,

  async search(ctx) {
    const query = ctx.args.trim()
    const pool = query
      ? rankBy(COMMANDS, query, (c) => [c.name, c.description, c.id]).map(({ item, score }) => ({ item, score }))
      : COMMANDS.map((item) => ({ item, score: 500 }))
    return pool.slice(0, ctx.settings.resultLimit).map(({ item, score }) => ({ ...build(item, ctx), score }))
  }
}
