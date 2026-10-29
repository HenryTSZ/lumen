import { EMOJI_GROUPS, emojiRows, HOT_EMOJI } from '../../data/emoji'
import { copyAction, pinAction, usageHint } from '../helpers'
import { rankBy } from '../fuzzy'
import { truncate } from '../utils'
import { emoji, type ActionSpec, type Provider, type ResultItem } from '../types'

const PROVIDER_ID = 'emoji'

interface Entry {
  char: string
  name: string
  keywords: string
  group: string
}

let index: Entry[] | null = null

/** 首次进入才把 1898 条数据展开成索引，避免拖慢启动 */
function entries(): Entry[] {
  if (index) return index
  index = emojiRows().map(([char, name, keywords, group]) => ({
    char,
    name,
    keywords,
    group: EMOJI_GROUPS[Number(group)] ?? '其他'
  }))
  return index
}

function pasteActions(item: Entry): ActionSpec[] {
  return [
    {
      id: 'paste',
      name: '粘贴 Emoji',
      primary: true,
      shortcut: ['↵'],
      async run({ api, close, toast }) {
        close()
        await api.clipboard.write(item.char)
        await api.launcher.paste()
        toast(`已粘贴 ${item.char}`)
      }
    },
    copyAction(() => item.char),
    {
      id: 'copy-name',
      name: '复制名称',
      shortcut: ['Ctrl', 'Shift', 'C'],
      async run({ api, toast }) {
        await api.clipboard.write(item.name)
        toast(`已复制「${item.name}」`)
      }
    },
    pinAction(() => `emoji:${item.char}`)
  ]
}

function build(item: Entry): ResultItem {
  return {
    id: `emoji:${item.char}`,
    providerId: PROVIDER_ID,
    title: `${item.char}  ${item.name}`,
    subtitle: `${item.group} · ${item.keywords}`,
    icon: emoji(item.char),
    keywords: [item.name, item.keywords, item.group],
    usageKey: `emoji:${item.char}`,
    detail: {
      hero: emoji(item.char),
      fields: [
        { label: '名称', value: item.name },
        { label: '分类', value: item.group },
        { label: '关键词', value: item.keywords },
        { label: '使用频率', value: usageHint(() => `emoji:${item.char}`) }
      ],
      footer: '回车粘贴 · Ctrl+C 复制字符 · Ctrl+Shift+C 复制名称'
    },
    actions: pasteActions(item)
  }
}

export const emojiProvider: Provider = {
  id: PROVIDER_ID,
  name: 'Emoji',
  description: '1898 个 Emoji，中英文都能搜，回车即粘贴',
  icon: emoji('😀'),
  aliases: ['emoji', 'emo', 'emote', '表情', 'emoji搜索'],
  participatesInRoot: false,
  rank: 33,
  entry: true,

  search(ctx) {
    const query = ctx.args.trim()
    const pool = entries()

    if (!query) {
      const hot = HOT_EMOJI.map((char) => pool.find((entry) => entry.char === char)).filter(Boolean) as Entry[]
      const order = new Map(hot.map((entry, i) => [entry.char, 900 - i]))
      const rest = pool.filter((entry) => !order.has(entry.char)).slice(0, 40)
      return [
        ...hot.map((entry) => ({ ...build(entry), score: order.get(entry.char) ?? 500 })),
        ...rest.map((entry) => ({ ...build(entry), score: 300 }))
      ].slice(0, ctx.settings.resultLimit)
    }

    return rankBy(pool, query, (entry) => [entry.name, entry.keywords, entry.group, entry.char])
      .slice(0, ctx.settings.resultLimit)
      .map((hit) => ({ ...build(hit.item), score: hit.score, ranges: hit.ranges }))
  }
}

export function emojiCount(): number {
  return entries().length
}

export function emojiSummary(): string {
  return `${emojiCount()} 个 Emoji，按 ${truncate(EMOJI_GROUPS.join('/'), 60)} 分类`
}
