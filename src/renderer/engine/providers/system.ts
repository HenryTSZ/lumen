import type { SystemAction } from '@shared/types'
import { api } from '../../api'
import { rankBy } from '../fuzzy'
import { emoji, type Provider, type ResultItem, type SearchContext } from '../types'
import { isEnglish } from '../../i18n'

interface SysCommand {
  id: SystemAction
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  icon: string
  danger?: boolean
  /** 执行结果需要回显给用户（例如公网 IP） */
  inline?: boolean
}

const COMMANDS: SysCommand[] = [
  {
    id: 'lock',
    name: '锁定屏幕',
    nameEn: 'Lock Screen',
    description: '立即锁屏，等同于 Win+L',
    descriptionEn: 'Lock immediately, same as Win+L',
    icon: '🔒'
  },
  {
    id: 'sleep',
    name: '进入睡眠',
    nameEn: 'Sleep',
    description: '低功耗待机，唤醒后回到原状态',
    descriptionEn: 'Low-power standby, resumes where you left off',
    icon: '🌙'
  },
  {
    id: 'hibernate',
    name: '休眠',
    nameEn: 'Hibernate',
    description: '把内存写入磁盘后断电，下次开机恢复现场',
    descriptionEn: 'Save memory to disk and power off; restores on next boot',
    icon: '💤'
  },
  {
    id: 'shutdown',
    name: '关机',
    nameEn: 'Shut Down',
    description: '关闭 Windows',
    descriptionEn: 'Power off Windows',
    icon: '⏻',
    danger: true
  },
  {
    id: 'restart',
    name: '重启',
    nameEn: 'Restart',
    description: '重新启动 Windows',
    descriptionEn: 'Reboot Windows',
    icon: '🔄',
    danger: true
  },
  {
    id: 'logoff',
    name: '注销账户',
    nameEn: 'Sign Out',
    description: '退出当前用户会话',
    descriptionEn: 'End the current user session',
    icon: '🚪',
    danger: true
  },
  {
    id: 'emptyTrash',
    name: '清空回收站',
    nameEn: 'Empty Recycle Bin',
    description: '释放被占用磁盘空间',
    descriptionEn: 'Free up disk space',
    icon: '🗑️',
    danger: true
  },
  {
    id: 'env',
    name: '编辑环境变量',
    nameEn: 'Edit Environment Variables',
    description: '打开系统环境变量窗口',
    descriptionEn: 'Open the environment variables window',
    icon: '⚙️'
  },
  {
    id: 'publicIp',
    name: '查询公网 IP',
    nameEn: 'Show Public IP',
    description: '调用远程接口获取当前出口 IP',
    descriptionEn: 'Fetch your current public IP address',
    icon: '🌍',
    inline: true
  }
]

function build(command: SysCommand, ctx: SearchContext): ResultItem {
  const name = isEnglish() ? command.nameEn : command.name
  const description = isEnglish() ? command.descriptionEn : command.description
  return {
    id: `sys:${command.id}`,
    providerId: 'system',
    title: name,
    subtitle: description,
    icon: emoji(command.icon),
    keywords: [command.name, command.nameEn, command.id],
    usageKey: `sys:${command.id}`,
    actions: [
      {
        id: 'run',
        name: isEnglish() ? (command.inline ? 'Query' : 'Run') : command.inline ? '查询' : '执行',
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
