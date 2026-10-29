import { readJson, writeJson } from '../store'
import type { UsageMap } from '@shared/types'

const KEY = 'usage.json'

/**
 * 使用频率统计。
 * 每条结果用稳定的 key 记录被执行的次数与最后一次执行时间，
 * 渲染层据此对聚合搜索结果做动态重排 —— 这是 Raycast「越用越顺手」的核心。
 */
export class UsageService {
  private data: UsageMap = {}
  private timer: NodeJS.Timeout | null = null

  constructor() {
    this.data = readJson<UsageMap>(KEY, {})
  }

  all(): UsageMap {
    return this.data
  }

  record(key: string): void {
    if (!key) return
    const prev = this.data[key]
    this.data[key] = {
      count: (prev?.count ?? 0) + 1,
      lastUsed: Date.now(),
      pinned: prev?.pinned
    }
    this.schedule()
  }

  pin(key: string, pinned: boolean): UsageMap {
    const prev = this.data[key] ?? { count: 0, lastUsed: 0 }
    this.data[key] = { ...prev, pinned }
    this.schedule()
    return this.data
  }

  reset(): void {
    this.data = {}
    this.schedule()
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      writeJson(KEY, this.data)
      this.timer = null
    }, 800)
  }

  flush(): void {
    writeJson(KEY, this.data)
  }
}

export const usage = new UsageService()
