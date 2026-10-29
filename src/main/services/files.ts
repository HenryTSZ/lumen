import { homedir } from 'node:os'
import { promises as fsp } from 'node:fs'
import { basename, extname, join, win32 } from 'node:path'
import { execFile } from 'node:child_process'
import type { AppSettings, FileEntry, IndexStatus } from '@shared/types'
import { readJson, writeJson } from '../store'

const INDEX_FILE = 'file-index.json'
const MAX_ENTRIES = 120_000
const MAX_DEPTH = 6
const STAT_LIMIT = 3

interface RawEntry extends FileEntry {}

/**
 * 文件搜索服务。
 *
 * 两种模式：
 *  - Everything（推荐）：配置了 es.exe 后直接调用，毫秒级返回全盘结果，零索引成本
 *  - 内置索引：递归遍历用户根目录，结果缓存在 userData/file-index.json
 */
export class FileService {
  private entries: RawEntry[] = []
  private status: IndexStatus = { state: 'idle', count: 0, everything: false }
  private indexing = false

  get indexStatus(): IndexStatus {
    return this.status
  }

  private defaultRoots(): string[] {
    const home = homedir()
    return [
      home,
      join(home, 'Desktop'),
      join(home, 'Documents'),
      join(home, 'Downloads'),
      join(home, 'Pictures'),
      join(home, 'Favorites')
    ]
  }

  private everythingAvailable(settings: AppSettings): boolean {
    return Boolean(settings.everythingPath && this.status.everything)
  }

  /** 启动时调用：检测 Everything，加载磁盘缓存，必要时后台重建索引 */
  async bootstrap(settings: AppSettings): Promise<void> {
    if (settings.everythingPath) {
      const ok = await this.tryEverything(settings.everythingPath, 'test')
        .then(() => true)
        .catch(() => false)
      this.status = { ...this.status, everything: ok }
      if (ok) {
        this.status = { ...this.status, state: 'ready', count: -1 }
        return
      }
    }

    const cached = readJson<RawEntry[]>(INDEX_FILE, [])
    this.entries = cached
    this.status = { state: cached.length ? 'ready' : 'indexing', count: cached.length, everything: false }
    if (cached.length === 0) {
      void this.reindex(settings)
    } else {
      // 延迟 3 秒后台刷新，不影响用户唤起速度
      setTimeout(() => void this.reindex(settings), 3000)
    }
  }

  async reindex(settings: AppSettings): Promise<void> {
    if (this.indexing) return
    if (this.everythingAvailable(settings)) return
    this.indexing = true
    this.status = { ...this.status, state: 'indexing', error: undefined }

    const ignore = new Set(settings.ignoreDirs.map((d) => d.toLowerCase()))
    const roots = settings.searchRoots.length ? settings.searchRoots : this.defaultRoots()
    const collected: RawEntry[] = []
    let dirs = 0

    const walk = async (dir: string, depth: number): Promise<void> => {
      if (collected.length >= MAX_ENTRIES) return
      if (++dirs % STAT_LIMIT === 0) await new Promise((r) => setImmediate(r))

      let items
      try {
        items = await fsp.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }

      for (const item of items) {
        if (collected.length >= MAX_ENTRIES) return
        const name = item.name
        if (name.startsWith('.') || name.startsWith('~')) continue
        const full = join(dir, name)
        if (item.isDirectory()) {
          if (depth >= MAX_DEPTH) continue
          if (ignore.has(name.toLowerCase())) continue
          collected.push({ path: full, name, ext: '', size: 0, mtime: 0, isDir: true })
          await walk(full, depth + 1)
        } else {
          collected.push({
            path: full,
            name,
            ext: extname(name).toLowerCase().replace('.', ''),
            size: 0,
            mtime: 0,
            isDir: false
          })
        }
      }
    }

    try {
      for (const root of roots) {
        await walk(root, 0)
      }
      this.entries = collected
      this.status = { state: 'ready', count: collected.length, everything: false }
      writeJson(INDEX_FILE, collected)
    } catch (error) {
      this.status = { ...this.status, state: 'ready', error: String(error) }
    } finally {
      this.indexing = false
    }
  }

  private tryEverything(esPath: string, query: string, limit = 40): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        esPath,
        ['-n', String(limit), '-sort', 'date-modified', query],
        { encoding: 'utf8', timeout: 8000, maxBuffer: 16 * 1024 * 1024, windowsHide: true },
        (err, stdout) => (err && !stdout ? reject(err) : resolve(String(stdout ?? '')))
      )
    })
  }

  async query(settings: AppSettings, query: string, limit = 40): Promise<FileEntry[]> {
    const q = query.trim().toLowerCase()
    if (!q) return []

    if (this.everythingAvailable(settings)) {
      try {
        const out = await this.tryEverything(settings.everythingPath, q, limit)
        return out
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, limit)
          .map((full) => {
            const name = win32.basename(full) || basename(full)
            return {
              path: full,
              name,
              ext: extname(name).toLowerCase().replace('.', ''),
              size: 0,
              mtime: 0,
              isDir: false
            } satisfies FileEntry
          })
      } catch {
        // Everything 调用失败时回落到内置索引
      }
    }

    return searchEntries(this.entries, q, limit)
  }

  /** 补充缺失的 size/mtime 元信息（懒加载，避免索引时大量 stat 拖慢） */
  async decorate(entry: FileEntry): Promise<FileEntry> {
    try {
      const stat = await fsp.stat(entry.path)
      return { ...entry, size: stat.size, mtime: stat.mtimeMs, isDir: stat.isDirectory() }
    } catch {
      return entry
    }
  }
}

/**
 * 轻量打分搜索：
 * 文件名前缀命中权重最高，其次包含命中，最后才看路径其余部分。
 */
export function searchEntries(entries: FileEntry[], query: string, limit: number): FileEntry[] {
  const q = query.toLowerCase()
  const results: Array<{ entry: FileEntry; score: number }> = []

  for (const entry of entries) {
    const lowerName = entry.name.toLowerCase()
    if (!lowerName) continue

    let score = 0
    if (lowerName === q) score = 1000
    else if (lowerName.startsWith(q)) score = 700 - lowerName.length
    else {
      const idx = lowerName.indexOf(q)
      if (idx >= 0) score = 500 - idx * 2 - Math.min(lowerName.length, 40)
    }

    if (score === 0) {
      const lowerPath = entry.path.toLowerCase()
      const pathIdx = lowerPath.indexOf(q)
      if (pathIdx >= 0) score = 200 - Math.min(pathIdx, 150)
    }
    if (score === 0) continue

    if (entry.isDir) score += 30
    if (['exe', 'lnk', 'md', 'txt', 'pdf', 'docx', 'xlsx', 'pptx'].includes(entry.ext)) score += 15
    results.push({ entry, score })
  }

  results.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
  return results.slice(0, limit).map((r) => r.entry)
}

export const files = new FileService()
