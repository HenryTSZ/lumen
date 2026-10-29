import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Bookmark } from '@shared/types'

/**
 * 读取 Chromium 系浏览器（Chrome / Edge / Brave 等）的书签。
 *
 * 它们的书签都是纯 JSON（Bookmarks 文件），无需 SQLite 解析，
 * 因此这里保持「零 native 依赖」——代价是读不到历史记录（History 是 SQLite）。
 */

interface ChromiumRoot {
  source: string
  dir: string
}

interface RawNode {
  name?: string
  url?: string
  type?: string
  children?: RawNode[]
  date_added?: string
}

const CANDIDATES: ChromiumRoot[] = [
  { source: 'Chrome', dir: 'Google/Chrome/User Data' },
  { source: 'Edge', dir: 'Microsoft/Edge/User Data' },
  { source: 'Brave', dir: 'BraveSoftware/Brave-Browser/User Data' },
  { source: 'Chromium', dir: 'Chromium/User Data' }
]

/** 同一份文件 5 秒内不重复解析，避免每次输入敲 IO */
const CACHE_TTL = 5000

interface CacheEntry {
  at: number
  mtime: number
  items: Bookmark[]
}

const cache = new Map<string, CacheEntry>()

function profiles(root: ChromiumRoot): string[] {
  const base = join(process.env.LOCALAPPDATA ?? '', ...root.dir.split('/'))
  if (!existsSync(base)) return []
  try {
    return readdirSync(base, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(base, entry.name, 'Bookmarks'))
      .filter((file) => existsSync(file))
  } catch {
    return []
  }
}

function walk(node: RawNode, path: string, source: string, out: Bookmark[]): void {
  for (const child of node.children ?? []) {
    if (child.type === 'folder') {
      walk(child, path ? `${path}/${child.name ?? ''}` : (child.name ?? ''), source, out)
      continue
    }
    if (child.type !== 'url' || !child.url) continue
    out.push({
      id: `${source}:${child.date_added ?? ''}:${child.url}`,
      title: child.name?.trim() || hostnameOf(child.url),
      url: child.url,
      path: path || '根目录',
      source
    })
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function readFile(file: string, source: string): Bookmark[] {
  let mtime = 0
  try {
    mtime = statSync(file).mtimeMs
  } catch {
    return []
  }
  const hit = cache.get(file)
  if (hit && Date.now() - hit.at < CACHE_TTL && hit.mtime === mtime) return hit.items

  let items: Bookmark[] = []
  try {
    const json = JSON.parse(readFileSync(file, 'utf8')) as { roots?: Record<string, RawNode> }
    for (const [key, root] of Object.entries(json.roots ?? {})) {
      if (!root || typeof root !== 'object') continue
      const label = key === 'bookmark_bar' ? '收藏夹栏' : key === 'other' ? '其他收藏' : key === 'synced' ? '移动设备' : key
      walk(root, label, source, items)
    }
  } catch (error) {
    console.error(`[bookmarks] ${file} 解析失败`, error)
    items = []
  }

  // 同一网址在多个 profile 里重复很常见，按 source+url 去重
  const seen = new Set<string>()
  items = items.filter((item) => {
    const key = `${item.source}|${item.url}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  cache.set(file, { at: Date.now(), mtime, items })
  return items
}

export function bookmarks(): Bookmark[] {
  if (process.platform !== 'win32') return []
  const all: Bookmark[] = []
  const seen = new Set<string>()
  for (const root of CANDIDATES) {
    for (const file of profiles(root)) {
      for (const item of readFile(file, root.source)) {
        const key = `${item.source}|${item.url}`
        if (seen.has(key)) continue
        seen.add(key)
        all.push(item)
      }
    }
  }
  return all
}

export function bookmarkSources(): string[] {
  return Array.from(new Set(bookmarks().map((item) => item.source)))
}
