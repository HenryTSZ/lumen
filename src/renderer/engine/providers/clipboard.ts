import type { ClipItem } from '@shared/types'
import { api } from '../../api'
import { copyAction, pasteAction } from '../helpers'
import { relativeTime, truncate } from '../utils'
import { dataIcon, emoji, textIcon, type Provider, type ResultItem, type SearchContext } from '../types'

/** 已取过的缩略图缓存（256px，列表图标与详情预览都用） */
const thumbCache = new Map<string, string>()
/** 详情用高清图（1024px），只为当前结果里的头几张图加载，避免内存爆掉 */
const fullCache = new Map<string, string>()
const FULL_LIMIT = 4

function iconFor(item: ClipItem) {
  if (item.type === 'image') {
    const thumb = thumbCache.get(item.id)
    return thumb ? dataIcon(thumb) : emoji('🖼️')
  }
  if (item.type === 'file') return emoji('📁')
  if (item.type === 'rtf') return emoji('📰')
  return emoji('📋')
}

export function clearThumbCache(): void {
  thumbCache.clear()
  fullCache.clear()
}

function typeLabel(item: ClipItem): string {
  return { text: '文本', image: '图片', file: '文件', rtf: '富文本' }[item.type]
}

function sizeLabel(item: ClipItem): string {
  if (item.type !== 'image') return `${item.text.length} 字符`
  const dims = item.width && item.height ? `${item.width}×${item.height} · ` : ''
  return `${dims}${formatBytes(item.bytes ?? 0)}`
}

function formatBytes(bytes: number): string {
  if (!bytes) return '未知大小'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function build(item: ClipItem, ctx: SearchContext): ResultItem {
  const isImage = item.type === 'image'
  const copy = async (paste: boolean) => {
    if (paste) {
      ctx.close()
      await api.clipboard.copy(item.id)
      await api.launcher.paste()
    } else {
      await api.clipboard.copy(item.id)
    }
  }

  const result: ResultItem = {
    id: `clip:${item.id}`,
    providerId: 'clipboard',
    title: truncate(item.preview || item.text || typeLabel(item), 90) || '（空）',
    subtitle: `${item.pinned ? '📌 ' : ''}${relativeTime(item.createdAt)} · ${typeLabel(item)} · ${sizeLabel(item)}`,
    icon: iconFor(item),
    keywords: [item.text],
    usageKey: `clip:${item.id}`,
    detail: {
      hero: iconFor(item),
      image: isImage ? fullCache.get(item.id) ?? thumbCache.get(item.id) : undefined,
      fields: [
        { label: '类型', value: typeLabel(item) },
        { label: '复制时间', value: relativeTime(item.createdAt) },
        { label: isImage ? '文件大小' : '长度', value: sizeLabel(item) },
        ...(isImage ? [{ label: '原图路径', value: item.text }] : [])
      ],
      markdown: isImage ? undefined : `\`\`\`\n${truncate(item.text, 4000)}\n\`\`\``,
      footer: isImage ? '回车复制图片并粘贴 · Ctrl+S 另存为 PNG · Ctrl+Shift+C 复制路径' : undefined
    },
    actions: [
      {
        id: 'paste',
        name: isImage ? '复制图片并粘贴到当前窗口' : '复制并粘贴到当前窗口',
        primary: true,
        shortcut: ['↵'],
        icon: '📥',
        async run() {
          await copy(true)
        }
      },
      copyAction(() => (isImage ? item.text : item.text)),
      ...(isImage
        ? [
            {
              id: 'save',
              name: '另存为 PNG 文件',
              shortcut: ['Ctrl', 'S'],
              icon: '💾',
              async run({ toast }: { toast: (m: string) => void }) {
                const file = await api.clipboard.saveImage(item.id)
                toast(file ? `已保存到 ${file}` : '已取消保存')
              }
            },
            {
              id: 'reveal',
              name: '在文件夹中显示',
              icon: '📂',
              async run({ close }: { close: () => void }) {
                close()
                await api.files.reveal(item.text)
              }
            }
          ]
        : [pasteAction(() => item.text)]),
      {
        id: 'pin',
        name: item.pinned ? '取消置顶' : '置顶',
        shortcut: ['Ctrl', 'P'],
        icon: '📌',
        async run({ toast, refresh }: { toast: (m: string) => void; refresh: () => void }) {
          await api.clipboard.togglePin(item.id)
          toast(item.pinned ? '已取消置顶' : '已置顶')
          refresh()
        }
      },
      {
        id: 'remove',
        name: '删除这条记录',
        shortcut: ['Ctrl', 'Backspace'],
        icon: '🗑️',
        async run({ toast, refresh }: { toast: (m: string) => void; refresh: () => void }) {
          await api.clipboard.remove(item.id)
          thumbCache.delete(item.id)
          toast('已删除')
          refresh()
        }
      }
    ]
  }
  return result
}

export const clipboardProvider: Provider = {
  id: 'clipboard',
  name: '剪贴板历史',
  description: '翻出之前复制过的任意内容，图片直接看缩略图',
  icon: emoji('📋'),
  aliases: ['c', 'clip', 'clipboard', '剪贴板'],
  participatesInRoot: false,
  rank: 20,
  entry: true,

  async search(ctx) {
    const items = await api.clipboard.list()
    if (!items.length) {
      return [
        {
          id: 'clip:empty',
          providerId: 'clipboard',
          title: '剪贴板历史还是空的',
          subtitle: '复制任意内容后会自动出现在这里',
          icon: textIcon('∅'),
          actions: []
        }
      ]
    }

    const query = ctx.args.trim().toLowerCase()
    const pool = query ? items.filter((item) => item.text.toLowerCase().includes(query)) : items
    const pinned = pool.filter((i) => i.pinned)
    const rest = pool.filter((i) => !i.pinned)

    // 图片条目：先出列表，缩略图到了再刷新图标；前几张额外取高清图给详情面板
    const ordered = [...pinned, ...rest]
    const images = ordered.filter((i) => i.type === 'image')
    if (images.length) {
      void Promise.all(
        images.map(async (item, index) => {
          if (!thumbCache.has(item.id)) {
            const thumb = await api.clipboard.thumbnail(item.id).catch(() => '')
            if (thumb) {
              thumbCache.set(item.id, thumb)
              ctx.refresh()
            }
          }
          if (index < FULL_LIMIT && !fullCache.has(item.id)) {
            const full = await api.clipboard.imageData(item.id).catch(() => '')
            if (full) {
              fullCache.set(item.id, full)
              ctx.refresh()
            }
          }
        })
      )
    }

    return [...pinned, ...rest].slice(0, ctx.settings.resultLimit).map((item) => build(item, ctx))
  }
}

