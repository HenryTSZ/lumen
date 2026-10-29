import { readJson, writeJson } from '../store'

/**
 * 插件可用的键值存储。
 * 全部插件共用一个 JSON 文件，键名建议以插件 id 开头（如 `todo.items`）。
 */
const KEY = 'plugin-store.json'

export function storageGet(key: string): unknown {
  return readJson<Record<string, unknown>>(KEY, {})[key]
}

export function storageSet(key: string, value: unknown): void {
  const all = readJson<Record<string, unknown>>(KEY, {})
  all[key] = value
  writeJson(KEY, all)
}

export function storageRemove(key: string): void {
  const all = readJson<Record<string, unknown>>(KEY, {})
  delete all[key]
  writeJson(KEY, all)
}

export function storageKeys(): string[] {
  return Object.keys(readJson<Record<string, unknown>>(KEY, {}))
}
