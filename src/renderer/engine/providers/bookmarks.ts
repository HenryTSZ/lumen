import { api } from '../../api'
import type { Bookmark } from '@shared/types'
import { copyAction, MOD } from '../helpers'
import { rankBy } from '../fuzzy'
import { truncate } from '../utils'
import { emoji, type ActionSpec, type Provider, type ResultItem } from '../types'

const PROVIDER_ID = 'bookmarks'

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function actions(entry: Bookmark): ActionSpec[] {
  return [
    {
      id: 'open',
      name: '在浏览器中打开',
      primary: true,
      shortcut: ['↵'],
      icon: '🌐',
      async run({ close }) {
        close()
        await api.shell.openExternal(entry.url)
      }
    },
    copyAction(() => entry.url),
    {
      id: 'copy-title-md',
      name: '复制为 Markdown 链接',
      shortcut: [MOD, 'M'],
      icon: '🔗',
      async run({ api: bridge, toast }) {
        await bridge.clipboard.write(`[${entry.title}](${entry.url})`)
        toast('已复制 Markdown 链接')
      }
    }
  ]
}

function build(entry: Bookmark): ResultItem {
  return {
    id: `bm:${entry.id}`,
    providerId: PROVIDER_ID,
    title: entry.title,
    subtitle: `${entry.path} · ${truncate(entry.url, 60)}`,
    icon: emoji('🔖'),
    keywords: [entry.title, hostOf(entry.url), entry.path, entry.source],
    usageKey: `bm:${entry.url}`,
    detail: {
      fields: [
        { label: '标题', value: entry.title },
        { label: '来源', value: entry.source },
        { label: '位置', value: entry.path },
        { label: '地址', value: entry.url }
      ],
      footer: '回车打开 · Ctrl+C 复制地址 · Ctrl+M 复制 Markdown'
    },
    actions: actions(entry)
  }
}

export const bookmarksProvider: Provider = {
  id: PROVIDER_ID,
  name: '浏览器书签',
  description: '搜索 Chrome / Edge / Brave 的收藏夹（读取本地 Bookmarks 文件）',
  icon: emoji('🔖'),
  aliases: ['bm', 'bookmark', '书签', '收藏夹'],
  participatesInRoot: false,
  rank: 34,
  entry: true,

  async search(ctx) {
    const raw = ctx.args.trim()
    let list: Bookmark[] = []
    try {
      list = await api.browser.bookmarks()
    } catch (error) {
      return [
        {
          id: 'bm:error',
          providerId: PROVIDER_ID,
          title: '读取书签失败',
          subtitle: String(error),
          icon: emoji('⚠️'),
          actions: []
        }
      ]
    }

    if (!list.length) {
      return [
        {
          id: 'bm:empty',
          providerId: PROVIDER_ID,
          title: '没有找到书签',
          subtitle: '目前支持 Chrome / Edge / Brave / Chromium 的多账户书签，历史记录暂不支持（SQLite 格式）',
          icon: emoji('🔖'),
          actions: []
        }
      ]
    }

    if (!raw) {
      return list.slice(0, ctx.settings.resultLimit).map((entry, i) => ({ ...build(entry), score: 600 - i }))
    }

    return rankBy(list, raw, (entry) => [entry.title, entry.url, entry.path])
      .slice(0, ctx.settings.resultLimit)
      .map((hit) => ({ ...build(hit.item), score: hit.score, ranges: hit.ranges }))
  }
}
