import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { Quicklink, Snippet } from '@shared/types'
import { readJson, store, writeJson } from '../store'

export interface Identified {
  id: string
}

/**
 * 通用「小型 JSON 列表」存储，落盘到 <userData>/<name>.json。
 * 首次启动写入一份示例数据，让用户一上手就知道能玩什么。
 */
export class JsonList<T extends Identified> {
  private items: T[] = []
  private loaded = false

  constructor(
    private readonly file: string,
    private readonly samples: () => T[]
  ) {}

  load(): T[] {
    const path = `${store.dir}/${this.file}`
    try {
      if (!existsSync(path)) {
        this.items = this.samples()
        writeFileSync(path, JSON.stringify(this.items, null, 2), 'utf8')
        this.loaded = true
        return this.items
      }
      const raw = JSON.parse(readFileSync(path, 'utf8')) as T[]
      this.items = Array.isArray(raw) ? raw.map((item) => ({ ...item, id: item.id || randomUUID() })) : []
    } catch (error) {
      console.error(`[${this.file}] 解析失败，回落到上次缓存`, error)
      this.items = readJson<T[]>(this.file, [])
    }
    this.loaded = true
    return this.items
  }

  list(): T[] {
    return this.loaded ? this.items : this.load()
  }

  save(list: T[]): T[] {
    this.items = list.map((item) => ({ ...item, id: item.id || randomUUID() }))
    this.loaded = true
    writeJson(this.file, this.items)
    return this.items
  }
}

/* ------------------------------------------------------------------ */
/* 示例数据                                                             */
/* ------------------------------------------------------------------ */

const QUICKLINK_SAMPLES = (): Quicklink[] => [
  { id: 'ql-github', name: 'GitHub', keyword: 'gh', url: 'https://github.com/search?q={query}&type=repositories', icon: '🐙' },
  { id: 'ql-so', name: 'Stack Overflow', keyword: 'so', url: 'https://stackoverflow.com/search?q={query}', icon: '🅾️' },
  { id: 'ql-npm', name: 'npm', keyword: 'npm', url: 'https://www.npmjs.com/search?q={query}', icon: '📦' },
  { id: 'ql-mdn', name: 'MDN 文档', keyword: 'mdn', url: 'https://developer.mozilla.org/zh-CN/search?q={query}', icon: '📘' },
  { id: 'ql-bili', name: '哔哩哔哩', keyword: 'bili', url: 'https://search.bilibili.com/all?keyword={query}', icon: '📺' },
  { id: 'ql-zhihu', name: '知乎', keyword: 'zh', url: 'https://www.zhihu.com/search?type=content&q={query}', icon: '💡' },
  { id: 'ql-youtube', name: 'YouTube', keyword: 'yt', url: 'https://www.youtube.com/results?search_query={query}', icon: '▶️' },
  { id: 'ql-taobao', name: '淘宝', keyword: 'tb', url: 'https://s.taobao.com/search?q={query}', icon: '🛒' },
  { id: 'ql-maps', name: 'Google 地图', keyword: 'map', url: 'https://www.google.com/maps/search/{query}', icon: '🗺️' }
]

const SNIPPET_SAMPLES = (): Snippet[] => [
  {
    id: 'sn-mail',
    name: '我的邮箱',
    keyword: 'mail',
    text: 'your.name@example.com',
    icon: '✉️'
  },
  {
    id: 'sn-date',
    name: '今天日期',
    keyword: 'today',
    text: '{date}',
    icon: '📅'
  },
  {
    id: 'sn-sign',
    name: '邮件落款',
    keyword: 'sign',
    text: '\n--\n张三 · 产品部\n发送于 {datetime}',
    icon: '🖊️'
  },
  {
    id: 'sn-review',
    name: 'Code Review 模板',
    keyword: 'cr',
    text: '## 变更说明\n{clipboard}\n\n## 自测\n- [ ] 主流程\n- [ ] 边界 case\n\n## 影响面\n',
    icon: '🔍'
  },
  {
    id: 'sn-standup',
    name: '每日站会',
    keyword: 'std',
    text: '【昨日】\n- \n【今日】\n- \n【阻塞】\n- 无',
    icon: '☕'
  },
  {
    id: 'sn-todo',
    name: 'TODO 注释',
    keyword: 'todo',
    text: '// TODO({date}): {arg}',
    icon: '📌'
  }
]

export const quicklinks = new JsonList<Quicklink>('quicklinks.json', QUICKLINK_SAMPLES)
export const snippets = new JsonList<Snippet>('snippets.json', SNIPPET_SAMPLES)
