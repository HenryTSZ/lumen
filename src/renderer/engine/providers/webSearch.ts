import { api } from '../../api'
import { copyAction } from '../helpers'
import { emoji, type Provider, type ResultItem } from '../types'

interface Engine {
  id: string
  name: string
  url: (query: string) => string
  home: string
  icon: string
}

const ENGINES: Engine[] = [
  {
    id: 'google',
    name: 'Google',
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    home: 'https://www.google.com',
    icon: '🔍'
  },
  {
    id: 'bing',
    name: 'Bing',
    url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    home: 'https://www.bing.com',
    icon: '🅱️'
  },
  {
    id: 'baidu',
    name: '百度',
    url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,
    home: 'https://www.baidu.com',
    icon: '🐻'
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    home: 'https://duckduckgo.com',
    icon: '🦆'
  }
]

const QUICK_LINKS: Array<{ name: string; url: string; icon: string }> = [
  { name: 'GitHub Trending', url: 'https://github.com/trending', icon: '🐙' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', icon: '🤖' },
  { name: '知乎热榜', url: 'https://www.zhihu.com/hot', icon: '💡' },
  { name: 'B 站', url: 'https://www.bilibili.com', icon: '📺' }
]

const URL_RE = /^(https?:\/\/|[\w-]+(\.[\w-]+)+(\/|$))[^\s]*$/i

export const webSearchProvider: Provider = {
  id: 'web',
  name: '网页搜索',
  description: '用搜索引擎检索，或直接输入网址打开',
  icon: emoji('🌐'),
  aliases: ['s', 'search', 'web', '搜索', '百度', 'google'],
  participatesInRoot: true,
  rank: 40,
  entry: true,

  detect(query) {
    return URL_RE.test(query.trim()) && query.includes('.')
  },

  async search({ args, query, settings }) {
    const raw = (args.trim() || query.trim())
    if (!raw) {
      return QUICK_LINKS.map((link) => ({
        id: `link:${link.url}`,
        providerId: 'web',
        title: link.name,
        subtitle: link.url,
        icon: emoji(link.icon),
        usageKey: `web:${link.url}`,
        actions: [openAction(link.url), copyAction(() => link.url)]
      }))
    }

    const text = raw.trim()

    // 直接是网址/域名
    if (URL_RE.test(text) && text.includes('.')) {
      const url = /^https?:\/\//i.test(text) ? text : `https://${text}`
      return [
        {
          id: `url:${url}`,
          providerId: 'web',
          title: `打开 ${url.replace(/^https?:\/\//, '')}`,
          subtitle: '在默认浏览器中打开',
          icon: emoji('🔗'),
          usageKey: `web:${url}`,
          score: 900,
          actions: [openAction(url), copyAction(() => url)]
        }
      ]
    }

    const preferred = ENGINES.find((e) => e.id === settings.searchEngine) ?? ENGINES[0]
    const others = ENGINES.filter((e) => e.id !== preferred.id)

    return [preferred, ...others].map((engine, index) => ({
      id: `search:${engine.id}:${text}`,
      providerId: 'web',
      title: index === 0 ? `搜索 “${text}”` : `用${engine.name}搜索 “${text}”`,
      subtitle: engine.name,
      icon: emoji(engine.icon),
      usageKey: `web:${engine.id}`,
      score: index === 0 ? 800 - index : 600 - index,
      actions: [openAction(engine.url(text)), copyAction(() => engine.url(text))]
    }))
  }
}

function openAction(url: string) {
  return {
    id: 'open',
    name: '在浏览器中打开',
    primary: true,
    shortcut: ['↵'],
    icon: '🌐',
    async run({ close }: { close: () => void }) {
      close()
      await api.shell.openExternal(url)
    }
  }
}
