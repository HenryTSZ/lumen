import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AppSettings } from '@shared/types'

export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: 'Alt+Space',
  showInTray: true,
  launchAtLogin: false,
  language: 'zh',
  autoUpdate: true,
  theme: 'dark',
  resultLimit: 60,
  everythingPath: '',
  searchRoots: [],
  ignoreDirs: [
    'node_modules',
    '.git',
    '.svn',
    'AppData',
    '$Recycle.Bin',
    'Windows',
    'Program Files',
    'Program Files (x86)',
    '__pycache__',
    '.cache',
    'dist',
    'build',
    '.venv',
    'venv'
  ],
  clipHistory: true,
  clipLimit: 100,
  searchEngine: 'google',
  ai: {
    enabled: false,
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat'
  },
  pluginsIndexUrl: '',
  disabledPlugins: [],
  allowRemotePlugins: true,
  commandHotkeys: [],
  firstRun: true
}

/**
 * 极简 JSON 配置持久化，落盘到 <userData>/settings.json。
 * 不引第三方依赖，读写全部走同步 API（配置体积极小，同步更安全，避免竞态写坏文件）。
 */
class SettingsStore {
  private file: string
  private cache: AppSettings
  private flushTimer: NodeJS.Timeout | null = null

  constructor() {
    const dir = app.getPath('userData')
    this.file = join(dir, 'settings.json')
    this.cache = { ...DEFAULT_SETTINGS }
    this.load()
  }

  private load(): void {
    try {
      if (existsSync(this.file)) {
        const raw = readFileSync(this.file, 'utf8')
        const parsed = JSON.parse(raw) as Partial<AppSettings>
        this.cache = this.merge(parsed)
      }
    } catch {
      this.cache = { ...DEFAULT_SETTINGS }
    }
  }

  private merge(input: Partial<AppSettings>): AppSettings {
    return {
      ...DEFAULT_SETTINGS,
      ...input,
      ai: { ...DEFAULT_SETTINGS.ai, ...(input.ai ?? {}) }
    }
  }

  get dir(): string {
    return dirname(this.file)
  }

  getAll(): AppSettings {
    return this.cache
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.cache[key]
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): AppSettings {
    this.cache = { ...this.cache, [key]: value }
    this.scheduleFlush()
    return this.cache
  }

  patch(input: Partial<AppSettings>): AppSettings {
    this.cache = this.merge({ ...this.cache, ...input })
    this.scheduleFlush()
    return this.cache
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = setTimeout(() => this.flush(), 200)
  }

  flush(): void {
    try {
      mkdirSync(dirname(this.file), { recursive: true })
      writeFileSync(this.file, JSON.stringify(this.cache, null, 2), 'utf8')
    } catch (error) {
      console.error('[settings] 写入失败', error)
    }
  }
}

export const store = new SettingsStore()

/** 通用小型 JSON 文档存储（剪贴板历史、索引缓存等都复用它） */
export function readJson<T>(name: string, fallback: T): T {
  const file = join(store.dir, name)
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch {
    /* 文件损坏时退回默认值 */
  }
  return fallback
}

export function writeJson(name: string, data: unknown): void {
  try {
    mkdirSync(store.dir, { recursive: true })
    writeFileSync(join(store.dir, name), JSON.stringify(data), 'utf8')
  } catch (error) {
    console.error(`[storage] 写入 ${name} 失败`, error)
  }
}

export function userFilePath(file: string): string {
  return join(store.dir, file)
}
