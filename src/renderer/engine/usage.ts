import { api } from '../api'
import type { UsageMap } from '@shared/types'

/**
 * 渲染层的使用频率缓存。
 * 首次拉取后常驻内存，record 走异步 IPC（不阻塞 UI），
 * 排序时直接用本地缓存计算加权分。
 */
const DAY = 24 * 60 * 60 * 1000

let cache: UsageMap = {}
let loaded = false

export async function loadUsage(): Promise<UsageMap> {
  if (loaded) return cache
  try {
    cache = (await api.usage.all()) ?? {}
  } catch {
    cache = {}
  }
  loaded = true
  return cache
}

export function usageMap(): UsageMap {
  return cache
}

export function usageRecord(key?: string): UsageMap[string] | undefined {
  return key ? cache[key] : undefined
}

export function recordUsage(key?: string): void {
  if (!key) return
  const prev = cache[key]
  cache[key] = { count: (prev?.count ?? 0) + 1, lastUsed: Date.now(), pinned: prev?.pinned }
  void api.usage.record(key).catch(() => undefined)
}

export async function pinUsage(key: string, pinned: boolean): Promise<void> {
  cache[key] = { ...(cache[key] ?? { count: 0, lastUsed: 0 }), pinned }
  try {
    cache = await api.usage.pin(key, pinned)
  } catch {
    /* 忽略 */
  }
}

/**
 * 排序权重：
 *  - 执行次数按对数衰减，避免单项长期霸屏
 *  - 24 小时内用过额外加分，让「最近在做的事」浮上来
 *  - 手动置顶给最高权重
 */
export function usageBoost(key?: string): number {
  if (!key) return 0
  const record = cache[key]
  if (!record) return 0
  if (record.pinned) return 240
  const countScore = Math.log2(record.count + 1) * 14
  const age = Date.now() - record.lastUsed
  const recencyScore = age < DAY ? 10 * (1 - age / DAY) : 0
  return countScore + recencyScore
}

/** 空查询视图：按加权分倒序给出最常用的条目 key */
export function topKeys(limit = 8): string[] {
  return Object.keys(cache)
    .map((key) => ({ key, score: usageBoost(key) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.key)
}
