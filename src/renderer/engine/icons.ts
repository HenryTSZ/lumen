/** 结果图标异步加载 + 订阅（用 useSyncExternalStore 消费） */
let version = 0
const cache = new Map<string, string>()
const pending = new Set<string>()
const listeners = new Set<() => void>()

function emit(): void {
  version++
  listeners.forEach((l) => l())
}

export const iconStore = {
  get(key: string): string | undefined {
    return cache.get(key)
  },
  /** 请求一个图标，成功后通知所有订阅者重新渲染 */
  prefetch(key: string, loader: () => Promise<string>): void {
    if (!key || cache.has(key) || pending.has(key)) return
    pending.add(key)
    loader()
      .then((value) => {
        if (value) {
          cache.set(key, value)
          emit()
        }
      })
      .catch(() => undefined)
      .finally(() => pending.delete(key))
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot(): number {
    return version
  }
}
