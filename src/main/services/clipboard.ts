import { clipboard, dialog, nativeImage } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ClipItem } from '@shared/types'
import { readJson, store, userFilePath, writeJson } from '../store'

const KEY = 'clipboard.json'
const IMAGE_DIR = 'clipimages'

/**
 * 剪贴板历史服务。
 * 轮询间隔 600ms —— 比轮询更快的方式是 Windows 剪贴板消息钩子（需要 native 模块），
 * 这里为了零 native 依赖选择了轮询，开销可以忽略。
 */
export class ClipboardService {
  private items: ClipItem[] = []
  private timer: NodeJS.Timeout | null = null
  private lastText = ''
  private selfWritten = ''
  private selfAt = 0

  constructor() {
    this.items = readJson<ClipItem[]>(KEY, [])
  }

  get enabled(): boolean {
    return store.get('clipHistory')
  }

  start(): void {
    if (this.timer) return
    try {
      this.lastText = clipboard.readText()
    } catch {
      this.lastText = ''
    }
    this.timer = setInterval(() => this.tick(), 600)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private tick(): void {
    if (!this.enabled) return
    try {
      const image = clipboard.availableFormats().includes('image/png') ? clipboard.readImage() : null
      if (image && !image.isEmpty()) {
        const png = image.toPNG().toString('base64')
        if (png.length < 64) return
        if (png === this.lastText) return
        this.lastText = png
        const size = image.getSize()
        const file = this.saveImage(png)
        this.push({
          id: randomUUID(),
          text: file,
          preview: `[图片 ${size.width}×${size.height}]`,
          createdAt: Date.now(),
          type: 'image',
          width: size.width,
          height: size.height,
          bytes: file ? statSyncSafe(file) : Math.round((png.length * 3) / 4)
        })
        return
      }
    } catch {
      /* 某些格式会导致读取异常，忽略即可 */
    }

    let text = ''
    try {
      text = clipboard.readText().trim()
    } catch {
      return
    }
    if (!text || text === this.lastText) return
    // 忽略自己刚写进去的内容，避免「复制 → 粘贴」后又把自己记进历史
    if (text === this.selfWritten && Date.now() - this.selfAt < 3000) return
    this.lastText = text

    const list = clipboard.availableFormats()
    const type: ClipItem['type'] = list.includes('public.file-url') || list.includes('FileNameW')
      ? 'file'
      : list.includes('text/rtf')
        ? 'rtf'
        : 'text'

    this.push({
      id: randomUUID(),
      text,
      preview: text.replace(/\s+/g, ' ').slice(0, 140),
      createdAt: Date.now(),
      type
    })
  }

  private saveImage(base64: string): string {
    try {
      mkdirSync(userFilePath(IMAGE_DIR), { recursive: true })
      const name = `${Date.now()}.png`
      writeFileSync(join(userFilePath(IMAGE_DIR), name), Buffer.from(base64, 'base64'))
      return userFilePath(join(IMAGE_DIR, name))
    } catch {
      return ''
    }
  }

  private push(item: ClipItem): void {
    if (!item.text) return
    const deduped = this.items.filter((i) => i.text !== item.text)
    this.items = [item, ...deduped].slice(0, store.get('clipLimit'))
    writeJson(KEY, this.items)
  }

  list(): ClipItem[] {
    return this.items
  }

  remove(id: string): ClipItem[] {
    this.items = this.items.filter((i) => i.id !== id)
    writeJson(KEY, this.items)
    return this.items
  }

  togglePin(id: string): ClipItem[] {
    this.items = this.items.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i))
    writeJson(KEY, this.items)
    return this.items
  }

  clear(): void {
    this.items = []
    writeJson(KEY, this.items)
  }

  write(text: string): void {
    clipboard.writeText(text)
    this.selfWritten = text.trim()
    this.lastText = this.selfWritten
    this.selfAt = Date.now()
  }

  copy(id: string): void {
    const item = this.items.find((i) => i.id === id)
    if (!item) return
    if (item.type === 'image' && item.text) {
      clipboard.writeImage(nativeImage.createFromPath(item.text))
    } else {
      clipboard.writeText(item.text)
    }
  }

  /* --------------------------- 图片支持 --------------------------- */

  private imageOf(id: string): string {
    const item = this.items.find((i) => i.id === id)
    if (!item || item.type !== 'image' || !item.text) return ''
    if (!existsSync(item.text)) return ''
    if (!nativeImage.createFromPath(item.text).isEmpty()) return item.text
    return ''
  }

  /** 列表缩略图：长边压到 256，兼顾清晰度与内存 */
  thumbnail(id: string): string {
    const file = this.imageOf(id)
    if (!file) return ''
    try {
      const img = nativeImage.createFromPath(file)
      const { width, height } = img.getSize()
      const scale = 256 / Math.max(width, height, 1)
      const resized = scale < 1 ? img.resize({ width: Math.round(width * scale), height: Math.round(height * scale) }) : img
      return resized.toDataURL()
    } catch {
      return ''
    }
  }

  /** 详情面板大图：长边压到 1024 */
  imageData(id: string): string {
    const file = this.imageOf(id)
    if (!file) return ''
    try {
      const img = nativeImage.createFromPath(file)
      const { width, height } = img.getSize()
      const scale = 1024 / Math.max(width, height, 1)
      const resized = scale < 1 ? img.resize({ width: Math.round(width * scale), height: Math.round(height * scale) }) : img
      return resized.toDataURL()
    } catch {
      return ''
    }
  }

  /** 另存为 PNG，返回保存路径（用户取消则返回空串） */
  async saveImageAs(id: string): Promise<string> {
    const file = this.imageOf(id)
    if (!file) return ''
    const result = await dialog.showSaveDialog({
      title: '保存剪贴板图片',
      defaultPath: `lumen-clip-${Date.now()}.png`,
      filters: [{ name: 'PNG 图片', extensions: ['png'] }]
    })
    if (result.canceled || !result.filePath) return ''
    try {
      writeFileSync(result.filePath, nativeImage.createFromPath(file).toPNG())
      return result.filePath
    } catch {
      return ''
    }
  }
}

function statSyncSafe(file: string): number {
  try {
    return statSync(file).size
  } catch {
    return 0
  }
}

export const clipboardService = new ClipboardService()
