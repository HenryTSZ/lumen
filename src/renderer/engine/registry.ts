import type { Provider } from './types'
import { applicationsProvider } from './providers/applications'
import { filesProvider } from './providers/files'
import { calculatorProvider } from './providers/calculator'
import { webSearchProvider } from './providers/webSearch'
import { clipboardProvider } from './providers/clipboard'
import { windowSwitcherProvider } from './providers/windowSwitcher'
import { systemProvider } from './providers/system'
import { userCommandsProvider } from './providers/userCommands'
import { quicklinksProvider } from './providers/quicklinks'
import { snippetsProvider } from './providers/snippets'
import { emojiProvider } from './providers/emoji'
import { bookmarksProvider } from './providers/bookmarks'
import { portsProvider } from './providers/ports'
import { processesProvider } from './providers/processes'
import { wifiProvider } from './providers/wifi'
import { pluginStoreProvider } from './providers/pluginStore'
import { aiProvider } from './providers/ai'
import { settingsProvider } from './providers/settings'
import { windowsSettingsProvider } from './providers/windowsSettings'

/** 所有内置扩展，按默认展示顺序排列 */
export const BUILTIN_PROVIDERS: Provider[] = [
  applicationsProvider,
  calculatorProvider,
  clipboardProvider,
  windowSwitcherProvider,
  userCommandsProvider,
  windowsSettingsProvider,
  quicklinksProvider,
  snippetsProvider,
  emojiProvider,
  bookmarksProvider,
  portsProvider,
  processesProvider,
  wifiProvider,
  pluginStoreProvider,
  filesProvider,
  webSearchProvider,
  systemProvider,
  aiProvider,
  settingsProvider
]

/**
 * 运行时扩展列表 = 内置扩展 + 已安装插件。
 * 用可变数组而非常量，插件安装后可以直接注册进来。
 */
export const PROVIDERS: Provider[] = [...BUILTIN_PROVIDERS]

/** 注册一个扩展（插件安装后调用） */
export function registerProvider(provider: Provider): void {
  const idx = PROVIDERS.findIndex((p) => p.id === provider.id)
  if (idx >= 0) PROVIDERS[idx] = provider
  else PROVIDERS.push(provider)
}

/** 注销一个扩展（插件卸载/禁用后调用） */
export function unregisterProvider(id: string): void {
  const idx = PROVIDERS.findIndex((p) => p.id === id)
  if (idx >= 0) PROVIDERS.splice(idx, 1)
}

/** 清掉所有插件扩展，保留内置 */
export function resetProviders(): void {
  PROVIDERS.splice(0, PROVIDERS.length, ...BUILTIN_PROVIDERS)
}

export function providerById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

export interface Resolution {
  /** 命中的扩展，为 null 表示走聚合搜索 */
  provider: Provider | null
  /** 去掉触发词后的参数 */
  args: string
}

const LETTER_ALIASES = new Set(['f', 'w', 's', 'c'])

export function resolve(query: string): Resolution {
  const trimmed = query.replace(/\s+$/, '')
  if (!trimmed) return { provider: null, args: '' }

  const spaceIdx = trimmed.indexOf(' ')
  const head = (spaceIdx > 0 ? trimmed.slice(0, spaceIdx) : trimmed).toLowerCase()
  const hit = PROVIDERS.find((p) => p.aliases.some((a) => a.toLowerCase() === head))
  if (hit) {
    // 单字母别名要求必须带空格触发，否则 "file" 这种输入会被误判
    const isSingleLetter = LETTER_ALIASES.has(head)
    if (!isSingleLetter || spaceIdx > 0) {
      return { provider: hit, args: spaceIdx > 0 ? trimmed.slice(spaceIdx + 1) : '' }
    }
  }

  const detected = PROVIDERS.filter((p) => p.detect?.(trimmed)).sort((a, b) => a.rank - b.rank)
  if (detected.length) return { provider: detected[0], args: trimmed }

  return { provider: null, args: trimmed }
}

/** 参与聚合搜索的扩展（每次取都是最新快照，插件注册后即时生效） */
export function rootProviders(): Provider[] {
  return PROVIDERS.filter((p) => p.participatesInRoot).sort((a, b) => a.rank - b.rank)
}

export { rankBy, match } from './fuzzy'
export type { Provider, ResultItem, SearchContext, ActionContext, IconSpec } from './types'
