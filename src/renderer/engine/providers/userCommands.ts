import type { UserCommand } from '@shared/types'
import { api } from '../../api'
import { copyAction, pasteAction } from '../helpers'
import { rankBy } from '../fuzzy'
import { truncate } from '../utils'
import { emoji, type Provider, type ResultItem, type SearchContext } from '../types'

const TYPE_LABEL: Record<UserCommand['type'], string> = {
  open: '打开路径',
  url: '打开网址',
  shell: '执行命令',
  snippet: '文本片段'
}

const TYPE_ICON: Record<UserCommand['type'], string> = {
  open: '📄',
  url: '🌐',
  shell: '💻',
  snippet: '✏️'
}

function build(command: UserCommand, ctx: SearchContext): ResultItem {
  return {
    id: `cmd:${command.id}`,
    providerId: 'commands',
    title: command.name,
    subtitle: `${TYPE_LABEL[command.type]} · ${truncate(command.target, 64)}`,
    icon: emoji(command.icon || TYPE_ICON[command.type]),
    keywords: [command.keyword ?? '', command.name, command.target],
    usageKey: `cmd:${command.id}`,
    detail: {
      fields: [
        { label: '名称', value: command.name },
        { label: '类型', value: TYPE_LABEL[command.type] },
        { label: '触发词', value: command.keyword || '—' },
        { label: '目标', value: command.target }
      ],
      markdown: command.type === 'snippet' ? `\`\`\`\n${command.target}\n\`\`\`` : undefined
    },
    actions:
      command.type === 'snippet'
        ? [pasteAction(() => command.target), copyAction(() => command.target)]
        : [
            {
              id: 'run',
              name: '执行',
              primary: true,
              shortcut: ['↵'],
              icon: command.icon || TYPE_ICON[command.type],
              async run({ close }) {
                close()
                switch (command.type) {
                  case 'open':
                    await api.files.open(command.target)
                    break
                  case 'url':
                    await api.shell.openExternal(command.target)
                    break
                  case 'shell':
                    await api.shell.run(command.target, command.cwd)
                    break
                  default:
                    break
                }
              }
            },
            copyAction(() => command.target)
          ]
  }
}

export const userCommandsProvider: Provider = {
  id: 'commands',
  name: '我的命令',
  description: '来自 commands.json 的自定义命令，编辑文件即可扩展',
  icon: emoji('🧩'),
  aliases: ['ext', 'cmd', 'command', '自定义'],
  participatesInRoot: false,
  rank: 25,
  entry: true,

  async search(ctx) {
    const list = await api.commands.list()
    if (!list.length) {
      return [
        {
          id: 'cmd:empty',
          providerId: 'commands',
          title: '还没有自定义命令',
          subtitle: '在配置目录的 commands.json 里加一条，即可永久扩展启动器',
          icon: emoji('🧩'),
          actions: [
            {
              id: 'open',
              name: '打开配置目录',
              primary: true,
              async run({ api: bridge }) {
                await bridge.settings.openFile()
              }
            }
          ]
        }
      ]
    }

    const query = ctx.args.trim()
    const pool = query
      ? rankBy(list, query, (c) => [c.name, c.keyword, c.target]).map(({ item, score }) => ({ item, score }))
      : list.map((item) => ({ item, score: 500 }))
    return pool.slice(0, ctx.settings.resultLimit).map(({ item, score }) => ({ ...build(item, ctx), score }))
  }
}
