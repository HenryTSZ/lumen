import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { join } from 'node:path'
import type { MarketPlugin, PluginInfo } from '@shared/types'
import { store, userFilePath } from '../store'

/**
 * 插件系统。
 *
 * 一个插件 = userData/plugins/<id>/ 目录：
 *   plugin.json —— 元信息（id / 名称 / 触发词 / 入口文件）
 *   index.js    —— 插件源码，CommonJS 风格，导出 search 等方法
 *
 * 源码在渲染进程里以受控方式执行（见 renderer/engine/pluginRuntime.ts），
 * 通过 ctx.api 访问系统能力，拿不到任何 Node 权限。
 */
const PLUGIN_DIR = 'plugins'

export function pluginDir(): string {
  return userFilePath(PLUGIN_DIR)
}

/** 内置插件 / 市场索引所在目录（打包后位于 resources） */
function builtinDir(): string {
  if (app.isPackaged) return join(process.resourcesPath, PLUGIN_DIR)
  return join(app.getAppPath(), 'resources', PLUGIN_DIR)
}

function readJsonFile<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch {
    return null
  }
}

function ensureDir(): string {
  const dir = pluginDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** 本机已安装插件（含禁用状态） */
export function installedPlugins(): PluginInfo[] {
  const dir = ensureDir()
  const disabled = new Set(store.get('disabledPlugins'))
  const list: PluginInfo[] = []
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue
    const info = readJsonFile<PluginInfo>(join(dir, name.name, 'plugin.json'))
    if (!info || !info.id) continue
    list.push({ ...info, installed: true, disabled: disabled.has(info.id) })
  }
  return list.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
}

/** 内置市场索引；设置里配了 URL 时会尝试拉取远程索引并合并 */
export async function marketPlugins(): Promise<MarketPlugin[]> {
  const builtin = readJsonFile<{ plugins: MarketPlugin[] }>(join(builtinDir(), 'market.json'))
  const local: MarketPlugin[] = builtin?.plugins ?? []

  const url = store.get('pluginsIndexUrl').trim()
  if (!url) return local

  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } })
    if (!response.ok) return local
    const json = (await response.json()) as { plugins?: MarketPlugin[] }
    const remote = json.plugins ?? []
    // 远程条目覆盖同名内置条目
    const map = new Map(local.map((p) => [p.id, p]))
    for (const item of remote) map.set(item.id, { ...item, source: 'remote' })
    return [...map.values()]
  } catch {
    return local
  }
}

/** 读取插件源码，供渲染层执行 */
export function pluginCode(id: string): string {
  const file = join(ensureDir(), safeId(id), 'plugin.json')
  const info = readJsonFile<PluginInfo>(file)
  if (!info) return ''
  try {
    return readFileSync(join(ensureDir(), safeId(id), info.main || 'index.js'), 'utf8')
  } catch {
    return ''
  }
}

function safeId(id: string): string {
  // 只允许字母数字和 - _ . ，避免插件 id 被当成路径穿越
  return id.replace(/[^a-zA-Z0-9._-]/g, '')
}

async function installBuiltin(id: string, entry: MarketPlugin): Promise<void> {
  const from = join(builtinDir(), safeId(id))
  const to = join(ensureDir(), safeId(id))
  if (!existsSync(join(from, 'plugin.json'))) throw new Error('内置插件缺失：' + id)
  await cp(from, to, { recursive: true, force: true })
  if (entry) mergeMeta(to, entry)
}

/** 远程插件：下载 JS 源码 + 写出 plugin.json */
async function installRemote(id: string, entry: MarketPlugin): Promise<void> {
  if (!entry.downloadUrl) throw new Error('该插件没有下载地址')
  if (!store.get('allowRemotePlugins')) throw new Error('设置里已关闭远程插件安装')
  const response = await fetch(entry.downloadUrl)
  if (!response.ok) throw new Error(`下载失败（${response.status}）`)
  const code = await response.text()
  const dir = join(ensureDir(), safeId(id))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.js'), code, 'utf8')
  writeFileSync(
    join(dir, 'plugin.json'),
    JSON.stringify(
      {
        id: entry.id,
        name: entry.name,
        version: entry.version,
        author: entry.author,
        description: entry.description,
        icon: entry.icon,
        aliases: entry.aliases ?? [entry.id],
        participatesInRoot: entry.participatesInRoot ?? false,
        rank: entry.rank ?? 60,
        main: 'index.js',
        installed: true
      } satisfies PluginInfo,
      null,
      2
    ),
    'utf8'
  )
}

function mergeMeta(dir: string, entry: MarketPlugin): void {
  const file = join(dir, 'plugin.json')
  const info = readJsonFile<PluginInfo>(file)
  if (!info) return
  writeFileSync(
    file,
    JSON.stringify(
      {
        ...info,
        version: entry.version ?? info.version,
        author: entry.author ?? info.author,
        description: entry.description ?? info.description,
        icon: entry.icon ?? info.icon,
        aliases: info.aliases?.length ? info.aliases : entry.aliases ?? [entry.id],
        rank: info.rank ?? entry.rank ?? 60
      } satisfies PluginInfo,
      null,
      2
    ),
    'utf8'
  )
}

export async function installPlugin(id: string): Promise<PluginInfo[]> {
  const market = await marketPlugins()
  const entry = market.find((p) => p.id === id)
  if (!entry) throw new Error('市场里找不到该插件')
  if (entry.source === 'remote') await installRemote(id, entry)
  else await installBuiltin(id, entry)
  setDisabled(id, false)
  return installedPlugins()
}

export function uninstallPlugin(id: string): PluginInfo[] {
  const dir = join(ensureDir(), safeId(id))
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  setDisabled(id, false)
  return installedPlugins()
}

export function setDisabled(id: string, disabled: boolean): PluginInfo[] {
  const current = new Set(store.get('disabledPlugins'))
  if (disabled) current.add(id)
  else current.delete(id)
  store.patch({ disabledPlugins: [...current] })
  return installedPlugins()
}
