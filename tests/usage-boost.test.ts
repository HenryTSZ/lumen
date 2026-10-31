import { beforeEach, describe, expect, it, vi } from 'vitest'

const remote = vi.hoisted(() => ({
  map: {} as Record<string, { count: number; lastUsed: number; pinned?: boolean }>
}))

/** 用受控的假 IPC 替代真实桥接，避免依赖 electron 与 mock 数据 */
vi.mock('../src/renderer/api', () => ({
  api: {
    usage: {
      all: async () => remote.map,
      record: async (key: string) => {
        const prev = remote.map[key]
        remote.map[key] = { count: (prev?.count ?? 0) + 1, lastUsed: Date.now(), pinned: prev?.pinned }
      },
      pin: async (key: string, pinned: boolean) => {
        remote.map[key] = { ...(remote.map[key] ?? { count: 0, lastUsed: 0 }), pinned }
        return remote.map
      },
      reset: async () => {
        remote.map = {}
      }
    }
  },
  isPreviewMode: false,
  typedApi: {}
}))

/** 每个用例都重新加载模块，拿到干净的本地缓存 */
async function fresh() {
  vi.resetModules()
  return import('../src/renderer/engine/usage')
}

describe('usageBoost — 结果排序权重', () => {
  beforeEach(() => {
    remote.map = {}
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
  })

  it('没用过的 key 不加分', async () => {
    const { usageBoost } = await fresh()
    expect(usageBoost('never-used')).toBe(0)
    expect(usageBoost()).toBe(0)
    expect(usageBoost('')).toBe(0)
  })

  it('用过一次就有分，且用得越多分越高（对数增长）', async () => {
    const { recordUsage, usageBoost } = await fresh()
    recordUsage('a')
    const once = usageBoost('a')
    expect(once).toBeGreaterThan(0)
    for (let i = 0; i < 99; i++) recordUsage('a')
    const many = usageBoost('a')
    expect(many).toBeGreaterThan(once)
    // 对数衰减：100 次也不会无限膨胀
    expect(many).toBeLessThan(200)
  })

  it('24 小时内用过有额外加成分', async () => {
    const { recordUsage, usageBoost } = await fresh()
    recordUsage('fresh')
    const withRecency = usageBoost('fresh')
    vi.setSystemTime(Date.now() + 25 * 3600_000)
    const stale = usageBoost('fresh')
    expect(stale).toBeLessThan(withRecency)
    // 过期后只剩次数分：log2(2) * 14 = 14
    expect(stale).toBeCloseTo(14, 5)
  })

  it('置顶权重高于一切', async () => {
    const { recordUsage, pinUsage, usageBoost } = await fresh()
    for (let i = 0; i < 500; i++) recordUsage('hot')
    recordUsage('pin')
    await pinUsage('pin', true)
    expect(usageBoost('pin')).toBe(240)
    expect(usageBoost('pin')).toBeGreaterThan(usageBoost('hot'))
  })

  it('新近度随时间线性衰减', async () => {
    const { recordUsage, usageBoost } = await fresh()
    recordUsage('x')
    const t0 = usageBoost('x')
    vi.setSystemTime(Date.now() + 12 * 3600_000)
    const t12 = usageBoost('x')
    vi.setSystemTime(Date.now() + 6 * 3600_000)
    const t18 = usageBoost('x')
    expect(t12).toBeLessThan(t0)
    expect(t18).toBeLessThan(t12)
  })
})

describe('topKeys — 空查询时的常用列表', () => {
  beforeEach(() => {
    remote.map = {}
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
  })

  it('按加权分倒序，且不含零分项', async () => {
    const { recordUsage, pinUsage, topKeys } = await fresh()
    for (let i = 0; i < 50; i++) recordUsage('mid')
    for (let i = 0; i < 5; i++) recordUsage('low')
    await pinUsage('top', true)
    const keys = topKeys(10)
    expect(keys[0]).toBe('top')
    expect(keys.indexOf('mid')).toBeLessThan(keys.indexOf('low'))
    expect(keys).not.toContain('absent')
  })

  it('受 limit 限制', async () => {
    const { recordUsage, topKeys } = await fresh()
    for (let i = 0; i < 20; i++) recordUsage(`k${i}`)
    expect(topKeys(3)).toHaveLength(3)
    expect(topKeys()).toHaveLength(8)
  })

  it('没有统计时返回空数组', async () => {
    const { topKeys } = await fresh()
    expect(topKeys()).toEqual([])
  })
})

describe('recordUsage — 本地缓存与远端同步', () => {
  beforeEach(() => {
    remote.map = {}
    vi.useFakeTimers()
  })

  it('立刻更新本地缓存，远端异步同步', async () => {
    const { recordUsage, usageRecord } = await fresh()
    recordUsage('apps:code')
    // 本地缓存同步生效，UI 立刻可见
    expect(usageRecord('apps:code')?.count).toBe(1)
    // 远端走异步 IPC，等一个微任务即可
    await Promise.resolve()
    expect(remote.map['apps:code']?.count).toBe(1)
  })

  it('空 key 不记录', async () => {
    const { recordUsage, usageMap } = await fresh()
    recordUsage()
    recordUsage('')
    expect(usageMap()).toEqual({})
  })
})
