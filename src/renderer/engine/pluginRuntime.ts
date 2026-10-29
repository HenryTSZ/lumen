import type { PluginInfo } from '@shared/types'
import { api } from '../api'
import type { IconSpec, Provider, ResultItem, SearchContext } from './types'
import { PROVIDERS, registerProvider, resetProviders } from './registry'

/**
 * 插件运行时。
 *
 * 插件源码是 CommonJS 风格的一坨 JS：
 *   module.exports = { async search(ctx) { return [...] } }
 *
 * 这里用 new Function 在渲染进程里执行它。刻意不给 require / process / fs ——
 * 插件只能拿到 ctx.api 暴露出来的能力，拿不到任何 Node 权限。
 */
export interface PluginModule {
  icon?: string
  detect?: (query: string) => boolean
  search: (ctx: SearchContext) => Promise<Array<Record<string, unknown>>> | Array<Record<string, unknown>>
}

function normalizeIcon(value: unknown): IconSpec {
  if (typeof value === 'object' && value && 'kind' in (value as IconSpec)) return value as IconSpec
  const text = typeof value === 'string' && value ? value : '🧩'
  // 单个字符（emoji / 汉字）用 emoji 图标，多个字符退化成文字图标
  return [...text].length <= 2 ? { kind: 'emoji', value: text } : { kind: 'text', value: text.slice(0, 2) }
}

function evaluate(code: string): PluginModule {
  const mod: { exports: PluginModule } = { exports: {} as PluginModule }
  const factory = new Function(
    'module',
    'exports',
    'console',
    '"use strict";\n' + code
  ) as (m: unknown, e: unknown, c: Console) => void
  factory(mod, mod.exports, console)
  const exported = (mod.exports ?? {}) as PluginModule
  if (typeof exported.search !== 'function') throw new Error('插件没有导出 search 方法')
  return exported
}

function wrap(info: PluginInfo, mod: PluginModule): Provider {
  return {
    id: `plugin:${info.id}`,
    name: info.name,
    description: `${info.description}（插件 · ${info.author}）`,
    icon: normalizeIcon(mod.icon ?? info.icon),
    aliases: (info.aliases ?? []).map((a) => a.toLowerCase()),
    participatesInRoot: Boolean(info.participatesInRoot),
    detect: mod.detect,
    rank: info.rank ?? 60,
    entry: true,
    search: async (ctx) => {
      const raw = await mod.search(ctx)
      return (raw ?? []).map((item) => normalizeResult(item, info))
    }
  }
}

/** 插件返回的裸对象 → 引擎内部 ResultItem，缺的字段补默认值 */
function normalizeResult(raw: Record<string, unknown>, info: PluginInfo): ResultItem {
  const item = raw as unknown as Partial<ResultItem>
  const id = String(item.id ?? `${info.id}:${Math.random().toString(36).slice(2)}`)
  return {
    ...item,
    id,
    providerId: `plugin:${info.id}`,
    title: String(item.title ?? ''),
    subtitle: item.subtitle != null ? String(item.subtitle) : undefined,
    icon: normalizeIcon(item.icon ?? info.icon),
    keywords: item.keywords,
    detail: item.detail,
    usageKey: `plugin:${info.id}:${id}`,
    actions: Array.isArray(item.actions) ? item.actions : []
  } as ResultItem
}

/** 已加载的插件 id → 模块，避免重复求值 */
const loaded = new Map<string, PluginModule>()

/**
 * 启动时调用：读取已安装插件，编译并注册未被禁用的。
 * 预览模式（浏览器）下 api.plugins 是 mock，同样能跑通。
 */
export async function loadPlugins(): Promise<PluginInfo[]> {
  let list: PluginInfo[] = []
  try {
    list = await api.plugins.installed()
  } catch {
    return []
  }
  resetProviders()
  loaded.clear()

  for (const info of list) {
    if (info.disabled) continue
    try {
      const code = await api.plugins.code(info.id)
      if (!code) continue
      const mod = evaluate(code)
      loaded.set(info.id, mod)
      registerProvider(wrap(info, mod))
    } catch (error) {
      console.error(`[plugin:${info.id}] 加载失败`, error)
    }
  }
  return list
}

/** 安装/卸载后增量刷新单个插件 */
export async function reloadPlugin(info: PluginInfo, removed = false): Promise<void> {
  if (removed || info.disabled) {
    loaded.delete(info.id)
    unregisterOne(info.id)
    return
  }
  try {
    const code = await api.plugins.code(info.id)
    if (!code) return
    const mod = evaluate(code)
    loaded.set(info.id, mod)
    registerProvider(wrap(info, mod))
  } catch (error) {
    console.error(`[plugin:${info.id}] 加载失败`, error)
  }
}

function unregisterOne(id: string): void {
  const idx = PROVIDERS.findIndex((p) => p.id === `plugin:${id}`)
  if (idx >= 0) PROVIDERS.splice(idx, 1)
}

export function isPluginProviderId(id: string): boolean {
  return id.startsWith('plugin:')
}
