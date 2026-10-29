import { api } from '../../api'
import type { Snippet } from '@shared/types'
import { copyAction, pinAction, usageHint, MOD } from '../helpers'
import { rankBy } from '../fuzzy'
import { truncate } from '../utils'
import { emoji, type ActionSpec, type FormSpec, type Provider, type ResultItem, type SearchContext } from '../types'

const PROVIDER_ID = 'snippets'

/**
 * 占位符一览：
 *   {clipboard} 当前剪贴板     {date} 2026-10-28
 *   {time} 14:30              {datetime} 2026-10-28 14:30
 *   {weekday} 星期三           {arg} 触发词后面的输入
 *   {cursor} 粘贴后希望光标停的位置（会被移除）
 */
const PLACEHOLDER_HINT =
  '{clipboard} 剪贴板 · {date} 日期 · {time} 时间 · {datetime} 日期时间 · {weekday} 星期 · {arg} 输入内容'

const pad = (value: number) => String(value).padStart(2, '0')

function localParts(now = new Date()) {
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    weekday: '星期' + '日一二三四五六'[now.getDay()]
  }
}

/** 展开所有占位符。clipboardText 由调用方读取后传入，避免在纯渲染层摸系统剪贴板 */
export function expandSnippet(text: string, arg = '', clipboardText = ''): string {
  const { date, time, weekday } = localParts()
  return text
    .replace(/\{clipboard\}/gi, clipboardText)
    .replace(/\{datetime\}/gi, `${date} ${time}`)
    .replace(/\{date\}/gi, date)
    .replace(/\{time\}/gi, time)
    .replace(/\{weekday\}/gi, weekday)
    .replace(/\{(arg|query)\}/gi, arg)
    .replace(/\{cursor\}/gi, '')
}

function usesClipboard(text: string): boolean {
  return /\{clipboard\}/i.test(text)
}

/* ------------------------------ 表单管理 ------------------------------ */

const PRESET_ICONS = ['✏️', '📋', '✉️', '📝', '🔍', '☕', '📌', '💬', '🧪', '📅']

function editForm(list: Snippet[], existing?: Snippet): FormSpec {
  return {
    note: PLACEHOLDER_HINT,
    submitLabel: existing ? '保存修改' : '创建',
    fields: [
      { key: 'name', label: '名称', defaultValue: existing?.name ?? '', placeholder: '邮件落款' },
      { key: 'keyword', label: '触发词', defaultValue: existing?.keyword ?? '', placeholder: 'sign' },
      {
        key: 'text',
        label: '片段内容',
        type: 'textarea',
        defaultValue: existing?.text ?? '',
        placeholder: '支持占位符，例如：发送于 {datetime}'
      },
      { key: 'icon', label: '图标', defaultValue: existing?.icon ?? '✏️', options: PRESET_ICONS }
    ],
    async submit(values) {
      const name = values.name.trim()
      const keyword = values.keyword.trim().toLowerCase()
      const text = values.text
      if (!name || !keyword || !text.trim()) throw new Error('名称、触发词和内容都不能为空')
      if (existing) {
        await api.snippets.save(
          list.map((entry) => (entry.id === existing.id ? { ...entry, name, keyword, text, icon: values.icon } : entry))
        )
        return `已更新「${name}」`
      }
      await api.snippets.save([...list, { id: '', name, keyword, text, icon: values.icon || '✏️' }])
      return `已创建「${name}」（用 ${keyword} 触发）`
    }
  }
}

function manageActions(ctx: SearchContext, list: Snippet[], existing?: Snippet): ActionSpec[] {
  if (!existing) {
    return [
      {
        id: 'create',
        name: '新建片段',
        shortcut: [MOD, 'N'],
        icon: '➕',
        async run() {
          const spec = editForm(list)
          ctx.push({
            title: '新建文本片段',
            icon: emoji('✏️'),
            items: [],
            form: {
              ...spec,
              submit: async (values) => {
                const message = await spec.submit(values)
                ctx.refresh()
                return message
              }
            }
          })
        }
      }
    ]
  }

  return [
    {
      id: 'edit',
      name: '编辑',
      shortcut: [MOD, 'E'],
      icon: '✏️',
      async run() {
        const spec = editForm(list, existing)
        ctx.push({
          title: `编辑「${existing.name}」`,
          icon: emoji(existing.icon ?? '✏️'),
          items: [],
          form: {
            ...spec,
            submit: async (values) => {
              const message = await spec.submit(values)
              ctx.refresh()
              return message
            }
          }
        })
      }
    },
    {
      id: 'delete',
      name: '删除',
      shortcut: [MOD, 'Backspace'],
      icon: '🗑️',
      async run({ toast }) {
        await api.snippets.save(list.filter((entry) => entry.id !== existing.id))
        toast(`已删除「${existing.name}」`)
        ctx.refresh()
      }
    }
  ]
}

/* ------------------------------ 结果构建 ------------------------------ */

function buildItem(ctx: SearchContext, snippet: Snippet, list: Snippet[], arg: string): ResultItem {
  const expanded = () => expandSnippet(snippet.text, arg)
  const preview = arg ? truncate(expanded().replace(/\n/g, ' ⏎ '), 96) : truncate(snippet.text.replace(/\n/g, ' ⏎ '), 96)

  const actions: ActionSpec[] = [
    {
      id: 'paste',
      name: '粘贴到当前窗口',
      primary: true,
      shortcut: ['↵'],
      icon: snippet.icon ?? '✏️',
      async run({ api: bridge, close, toast }) {
        const clipText = usesClipboard(snippet.text) ? await bridge.clipboard.readText() : ''
        const text = expandSnippet(snippet.text, arg, clipText)
        close()
        await bridge.clipboard.write(text)
        await bridge.launcher.paste()
        toast('已粘贴')
      }
    },
    {
      id: 'copy',
      name: '仅复制到剪贴板',
      shortcut: [MOD, 'C'],
      icon: '📋',
      async run({ api: bridge, toast }) {
        const clipText = usesClipboard(snippet.text) ? await bridge.clipboard.readText() : ''
        await bridge.clipboard.write(expandSnippet(snippet.text, arg, clipText))
        toast('已复制到剪贴板')
      }
    },
    ...manageActions(ctx, list, snippet),
    pinAction(() => `snip:${snippet.id}`)
  ]

  return {
    id: `snip:${snippet.id}`,
    providerId: PROVIDER_ID,
    title: snippet.name,
    subtitle: `${snippet.keyword} · ${preview}`,
    icon: emoji(snippet.icon ?? '✏️'),
    keywords: [snippet.keyword, snippet.name, snippet.text],
    usageKey: `snip:${snippet.id}`,
    detail: {
      fields: [
        { label: '名称', value: snippet.name },
        { label: '触发词', value: snippet.keyword },
        { label: '展开结果', value: arg ? expanded() : '（输入内容后可见占位符展开效果）' },
        { label: '使用频率', value: usageHint(() => `snip:${snippet.id}`) }
      ],
      markdown: `\`\`\`\n${arg ? expanded() : snippet.text}\n\`\`\``,
      footer: PLACEHOLDER_HINT
    },
    actions
  }
}

/* ------------------------------ Provider ------------------------------ */

export const snippetsProvider: Provider = {
  id: PROVIDER_ID,
  name: '文本片段',
  description: '带占位符的常用文本，回车即粘贴到当前窗口',
  icon: emoji('✏️'),
  aliases: ['snip', 'snippet', '片段', '文本片段', '模板'],
  participatesInRoot: false,
  rank: 32,
  entry: true,

  async search(ctx) {
    const list = await api.snippets.list()
    const raw = ctx.args.trim()
    if (!list.length) {
      return [
        {
          id: 'snip:empty',
          providerId: PROVIDER_ID,
          title: '还没有文本片段',
          subtitle: '按 Ctrl+N 新增一条，比如常用邮箱、邮件落款',
          icon: emoji('✏️'),
          actions: manageActions(ctx, list)
        }
      ]
    }

    /* 「std 内容」：首词命中触发词，剩余部分作为 {arg} */
    const spaceIdx = raw.indexOf(' ')
    const head = spaceIdx > 0 ? raw.slice(0, spaceIdx).toLowerCase() : ''
    const rest = spaceIdx > 0 ? raw.slice(spaceIdx + 1).trim() : ''
    const targeted = head ? list.find((entry) => entry.keyword.toLowerCase() === head) : undefined

    if (targeted && rest) {
      const others = list.filter((entry) => entry.id !== targeted.id).slice(0, 3)
      return [
        { ...buildItem(ctx, targeted, list, rest), score: 1000 },
        ...others.map((entry) => ({ ...buildItem(ctx, entry, list, rest), score: 300 }))
      ]
    }

    if (!raw) {
      return list.map((entry, index) => ({ ...buildItem(ctx, entry, list, ''), score: 600 - index }))
    }

    return rankBy(list, raw, (entry) => [entry.name, entry.keyword, entry.text])
      .slice(0, ctx.settings.resultLimit)
      .map((hit) => ({ ...buildItem(ctx, hit.item, list, ''), score: hit.score, ranges: hit.ranges }))
  }
}
