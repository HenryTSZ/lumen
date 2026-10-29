import { truncate } from '../utils'
import { api } from '../../api'
import type { Quicklink } from '@shared/types'
import { copyAction, pinAction, usageHint, MOD } from '../helpers'
import { rankBy } from '../fuzzy'
import { emoji, type ActionSpec, type FormSpec, type Provider, type ResultItem, type SearchContext } from '../types'

const PROVIDER_ID = 'quicklinks'

/** 把用户输入填进 URL 模板。{query} 会被 URL 编码，{Query} 保留原文 */
export function buildQuicklinkUrl(link: Quicklink, input: string): string {
  const raw = input.trim()
  const encoded = encodeURIComponent(raw)
  return link.url.replace(/\{query\}/gi, (token) => (token === '{query}' ? encoded : raw))
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/* ------------------------------ 表单管理 ------------------------------ */

const PRESET_ICONS = ['🔗', '🌐', '🐙', '📦', '📺', '🛒', '🗺️', '💡', '📘', '🎬', '🎵', '📰']

function editForm(ctx: SearchContext, current: Quicklink[] | null, existing?: Quicklink): FormSpec {
  return {
    note: 'URL 里用 {query} 占位（自动 URL 编码）。例如 https://github.com/search?q={query}',
    submitLabel: existing ? '保存修改' : '创建',
    fields: [
      { key: 'name', label: '名称', defaultValue: existing?.name ?? '', placeholder: 'GitHub' },
      { key: 'keyword', label: '触发词', defaultValue: existing?.keyword ?? '', placeholder: 'gh' },
      { key: 'url', label: '搜索地址', defaultValue: existing?.url ?? '', placeholder: 'https://example.com/search?q={query}' },
      { key: 'icon', label: '图标', defaultValue: existing?.icon ?? '🔗', options: PRESET_ICONS }
    ],
    async submit(values) {
      const name = values.name.trim()
      const keyword = values.keyword.trim().toLowerCase()
      const url = values.url.trim()
      if (!name || !keyword || !url) throw new Error('名称、触发词和地址都不能为空')
      if (!/^https?:\/\//i.test(url)) throw new Error('地址必须以 http:// 或 https:// 开头')
      const list = current ?? (await api.quicklinks.list())
      if (existing) {
        const next = list.map((entry) =>
          entry.id === existing.id ? { ...entry, name, keyword, url, icon: values.icon } : entry
        )
        await api.quicklinks.save(next)
        return `已更新「${name}」`
      }
      // id 留空，交给主进程补全 uid
      await api.quicklinks.save([...list, { id: '', name, keyword, url, icon: values.icon || '🔗' }])
      return `已创建「${name}」（用 ${keyword} 触发）`
    }
  }
}

function manageActions(ctx: SearchContext, list: Quicklink[], existing?: Quicklink): ActionSpec[] {
  if (!existing) {
    const spec = editForm(ctx, list)
    return [
      {
        id: 'create',
        name: '新建快捷搜索',
        shortcut: [MOD, 'N'],
        icon: '➕',
        async run() {
          ctx.push({
            title: '新建快捷搜索',
            icon: emoji('🔗'),
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
        const spec = editForm(ctx, list, existing)
        ctx.push({
          title: `编辑「${existing.name}」`,
          icon: emoji(existing.icon ?? '🔗'),
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
        await api.quicklinks.save(list.filter((item) => item.id !== existing.id))
        toast(`已删除「${existing.name}」`)
        ctx.refresh()
      }
    },
    copyAction(() => existing.url)
  ]
}

/* ------------------------------ 结果构建 ------------------------------ */

function item(ctx: SearchContext, link: Quicklink, list: Quicklink[], searchTerm?: string): ResultItem {
  const hasQuery = Boolean(searchTerm?.trim())
  const url = buildQuicklinkUrl(link, searchTerm ?? '')
  const actions: ActionSpec[] = [
    {
      id: 'open',
      name: hasQuery ? `在 ${link.name} 中搜索「${searchTerm?.trim()}」` : `打开 ${link.name}`,
      primary: true,
      shortcut: ['↵'],
      icon: link.icon ?? '🔗',
      async run({ close }) {
        close()
        await api.shell.openExternal(url)
      }
    },
    copyAction(() => url),
    ...manageActions(ctx, list, link),
    pinAction(() => `ql:${link.id}`)
  ]

  return {
    id: `ql:${link.id}`,
    providerId: PROVIDER_ID,
    title: hasQuery ? `在 ${link.name} 中搜索「${searchTerm?.trim()}」` : link.name,
    subtitle: hasQuery ? truncate(url, 78) : `${link.keyword} · ${truncate(link.url, 52)}`,
    icon: emoji(link.icon ?? '🔗'),
    keywords: [link.keyword, link.name, hostOf(link.url)],
    usageKey: `ql:${link.id}`,
    detail: {
      fields: [
        { label: '名称', value: link.name },
        { label: '触发词', value: link.keyword },
        { label: hasQuery ? '目标地址' : '地址模板', value: url },
        { label: '使用频率', value: usageHint(() => `ql:${link.id}`) }
      ],
      footer: 'Ctrl+E 编辑 · Ctrl+Backspace 删除 · Ctrl+P 置顶'
    },
    actions
  }
}

/* ------------------------------ Provider ------------------------------ */

export const quicklinksProvider: Provider = {
  id: PROVIDER_ID,
  name: '快捷搜索',
  description: '用一个触发词在任意站内搜索，URL 模板可自由新增',
  icon: emoji('🔗'),
  aliases: ['ql', 'quicklink', '快链', '快捷搜索', '站内'],
  participatesInRoot: false,
  rank: 31,
  entry: true,

  async search(ctx) {
    const list = await api.quicklinks.list()
    const raw = ctx.args.trim()
    if (!list.length) {
      return [
        {
          id: 'ql:empty',
          providerId: PROVIDER_ID,
          title: '还没有快捷搜索',
          subtitle: '按 Ctrl+N 新增一条，比如 GitHub 站内搜索',
          icon: emoji('🔗'),
          actions: manageActions(ctx, list)
        }
      ]
    }

    /* 「gh react」这种写法：首词命中触发词，剩余部分才是真正的搜索词 */
    const spaceIdx = raw.indexOf(' ')
    const head = spaceIdx > 0 ? raw.slice(0, spaceIdx).toLowerCase() : ''
    const rest = spaceIdx > 0 ? raw.slice(spaceIdx + 1).trim() : ''
    const targeted = head ? list.find((link) => link.keyword.toLowerCase() === head) : undefined

    if (targeted && rest) {
      const others = list.filter((link) => link.id !== targeted.id).slice(0, 4)
      return [
        { ...item(ctx, targeted, list, rest), score: 1000 },
        ...others.map((link) => ({ ...item(ctx, link, list, rest), score: 300 }))
      ]
    }

    const term = raw
    if (!term) {
      return list.map((link, index) => ({ ...item(ctx, link, list), score: 600 - index }))
    }

    return rankBy(list, term, (link) => [link.name, link.keyword])
      .slice(0, ctx.settings.resultLimit)
      .map((hit) => ({ ...item(ctx, hit.item, list, term), score: hit.score, ranges: hit.ranges }))
  }
}
