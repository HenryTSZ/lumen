import type { FileEntry } from '@shared/types'
import { api } from '../../api'
import { MOD, copyAction, pinAction, revealAction } from '../helpers'
import { formatBytes, initialFor, relativeTime, truncate } from '../utils'
import { emoji, textIcon, type Provider, type ResultItem, type SearchContext } from '../types'

const EXT_ICON: Record<string, string> = {
  doc: '📘',
  docx: '📘',
  xls: '📗',
  xlsx: '📗',
  ppt: '📙',
  pptx: '📙',
  pdf: '📕',
  md: '📝',
  txt: '📄',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
  gif: '🖼️',
  svg: '🖼️',
  zip: '🗜️',
  rar: '🗜️',
  '7z': '🗜️',
  mp3: '🎵',
  wav: '🎵',
  flac: '🎵',
  mp4: '🎬',
  mkv: '🎬',
  mov: '🎬',
  exe: '⚙️',
  lnk: '🔗',
  json: '{ }',
  ts: 'TS',
  tsx: 'TS',
  js: 'JS',
  jsx: 'JS',
  py: 'PY',
  go: 'GO',
  rs: 'RS',
  css: 'CSS',
  html: 'HTML',
  cs: 'C#',
  java: 'JV',
  iso: '💿'
}

function iconFor(entry: FileEntry) {
  if (entry.isDir) return emoji('📁')
  const mapped = EXT_ICON[entry.ext]
  if (!mapped) return textIcon(initialFor(entry.name))
  return mapped.length > 2 ? textIcon(mapped) : emoji(mapped)
}

function parentOf(path: string): string {
  const idx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))
  return idx > 0 ? path.slice(0, idx) : path
}

function build(entry: FileEntry, _ctx: SearchContext, score?: number): ResultItem {
  const parent = parentOf(entry.path)
  const usageKey = `files:${entry.path}`

  return {
    id: `file:${entry.path}`,
    providerId: 'files',
    title: entry.name,
    subtitle: truncate(parent, 76),
    icon: iconFor(entry),
    keywords: [entry.name, entry.path],
    usageKey,
    score,
    detail: {
      hero: iconFor(entry),
      fields: [
        { label: '名称', value: entry.name },
        { label: '路径', value: entry.path },
        { label: '类型', value: entry.isDir ? '文件夹' : entry.ext ? `${entry.ext.toUpperCase()} 文件` : '文件' },
        { label: '修改时间', value: entry.mtime ? relativeTime(entry.mtime) : '—' }
      ]
    },
    actions: [
      {
        id: 'open',
        name: entry.isDir ? '打开文件夹' : '打开',
        primary: true,
        shortcut: ['↵'],
        async run({ close }) {
          close()
          await api.files.open(entry.path)
        }
      },
      {
        id: 'code',
        name: '用 VS Code 打开',
        shortcut: ['Ctrl', 'E'],
        icon: '💻',
        async run({ close, toast }) {
          close()
          await api.shell.run(`code "${entry.path}"`)
          toast('已调用 VS Code')
        }
      },
      revealAction(() => entry.path),
      pinAction(() => usageKey),
      {
        id: 'terminal',
        name: '在此目录打开终端',
        shortcut: ['Ctrl', 'T'],
        icon: '🖥️',
        async run({ close }) {
          close()
          await api.shell.run(`wt.exe -d "${entry.isDir ? entry.path : parent}"`)
        }
      },
      copyAction(() => entry.path)
    ]
  }
}

export const filesProvider: Provider = {
  id: 'files',
  name: '文件',
  description: '按文件名快速查找本机文件与文件夹',
  icon: emoji('📂'),
  aliases: ['f', 'file', 'files', '文件', '搜索文件'],
  participatesInRoot: true,
  rank: 30,
  entry: true,

  async search(ctx) {
    const query = ctx.args.trim() || ctx.query.trim()
    if (query.length < 2) return []

    const status = await api.files.status()
    const results = await api.files.query(query, 40)

    if (results.length === 0) {
      if (status.state === 'indexing') {
        return [
          {
            id: 'files:indexing',
            providerId: 'files',
            title: '文件索引正在建立中…',
            subtitle: '首次使用需要几十秒建立索引，之后搜索为毫秒级',
            icon: emoji('⏳'),
            actions: [
              {
                id: 'reload',
                name: '刷新',
                primary: true,
                run({ refresh }) {
                  refresh()
                }
              }
            ]
          }
        ]
      }
      return []
    }

    return results
      .slice(0, ctx.settings.resultLimit)
      .map((entry, index) => build(entry, ctx, 600 - index * 4))
  }
}

export { MOD, formatBytes }
