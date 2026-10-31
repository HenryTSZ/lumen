import { isEnglish } from '../i18n'
import type { Provider } from './types'

/**
 * 扩展名称与描述的英文对照。
 * Provider 源码里的 name/description 是中文默认值，
 * 英文语境下渲染时用这张表替换，避免逐个 provider 改造。
 */
const EN_LABELS: Record<string, [name: string, description: string]> = {
  apps: ['Applications', 'Launch installed apps'],
  calculator: ['Calculator', 'Evaluate expressions & convert units'],
  clipboard: ['Clipboard History', 'Search and reuse clipboard history'],
  windows: ['Window Switcher', 'Switch windows and snap layouts'],
  commands: ['My Commands', 'Custom commands from commands.json'],
  'windows-settings': ['Windows Settings', 'Jump straight to system settings and admin tools'],
  quicklinks: ['Quicklinks', 'In-site quick search'],
  snippets: ['Snippets', 'Paste frequently used text'],
  emoji: ['Emoji', 'Find and copy emoji'],
  bookmarks: ['Bookmarks', 'Search browser bookmarks'],
  ports: ['Ports', 'Which process is using this port'],
  processes: ['Processes', 'Find and kill processes'],
  wifi: ['Wi-Fi', 'Saved networks and signal strength'],
  plugins: ['Plugin Store', 'Install and manage plugins'],
  files: ['Files', 'Search files on disk'],
  web: ['Web Search', 'Search the web'],
  system: ['System', 'Lock, sleep, shutdown and more'],
  ai: ['AI Assistant', 'Ask anything, answers inline'],
  settings: ['Settings', 'Configure Lumen']
}

export function providerLabel(provider: Provider): { name: string; description: string } {
  if (!isEnglish()) return { name: provider.name, description: provider.description }
  const en = EN_LABELS[provider.id]
  return en ? { name: en[0], description: en[1] } : { name: provider.name, description: provider.description }
}

/** Root 分组的名称：分组名来自 provider.name，英文语境替换 */
export function providerName(providerId: string, fallback: string): string {
  if (!isEnglish()) return fallback
  return EN_LABELS[providerId]?.[0] ?? fallback
}
