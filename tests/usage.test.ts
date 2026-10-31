import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/*
 * 主进程的落盘依赖 electron 的 userData 路径，
 * 这里换成临时目录，让测试可以在没有 Electron 的机器上跑。
 */
vi.mock('electron', async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumen-usage-'))
  ;(globalThis as unknown as { __LUMEN_TEST_DIR: string }).__LUMEN_TEST_DIR = dir
  return { app: { getPath: () => dir } }
})

const { UsageService } = await import('../src/main/services/usage')
const { store } = await import('../src/main/store')
const dir = (globalThis as unknown as { __LUMEN_TEST_DIR: string }).__LUMEN_TEST_DIR

describe('UsageService — 使用频率统计', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('初始为空', () => {
    expect(new UsageService().all()).toEqual({})
  })

  it('记录次数累加并记录最后使用时间', () => {
    const usage = new UsageService()
    usage.record('apps:code')
    usage.record('apps:code')
    usage.record('apps:code')
    const record = usage.all()['apps:code']
    expect(record.count).toBe(3)
    expect(record.lastUsed).toBeGreaterThan(0)
  })

  it('不同 key 互不干扰', () => {
    const usage = new UsageService()
    usage.record('a')
    usage.record('b')
    usage.record('b')
    expect(usage.all().a.count).toBe(1)
    expect(usage.all().b.count).toBe(2)
  })

  it('空 key 直接忽略', () => {
    const usage = new UsageService()
    usage.record('')
    expect(usage.all()).toEqual({})
  })

  it('置顶保留已有计数，取消置顶后计数仍在', () => {
    const usage = new UsageService()
    usage.record('cmd:lock')
    usage.pin('cmd:lock', true)
    expect(usage.all()['cmd:lock']).toMatchObject({ count: 1, pinned: true })
    usage.pin('cmd:lock', false)
    expect(usage.all()['cmd:lock']).toMatchObject({ count: 1, pinned: false })
  })

  it('reset 清空全部统计', () => {
    const usage = new UsageService()
    usage.record('a')
    usage.reset()
    expect(usage.all()).toEqual({})
  })

  it('写入做了防抖：800ms 内的连续记录只落盘一次', () => {
    const usage = new UsageService()
    usage.record('a')
    usage.record('a')
    usage.record('a')
    vi.advanceTimersByTime(799)
    expect(() => readFileSync(join(store.dir, 'usage.json'), 'utf8')).toThrow()
    vi.advanceTimersByTime(2)
    const persisted = JSON.parse(readFileSync(join(store.dir, 'usage.json'), 'utf8')) as Record<string, { count: number }>
    expect(persisted.a.count).toBe(3)
  })

  it('flush 后立即落盘，重新实例化可以读回', () => {
    const first = new UsageService()
    first.record('apps:edge')
    first.flush()
    const second = new UsageService()
    expect(second.all()['apps:edge'].count).toBe(1)
  })

  it('落盘目录就是 userData 目录', () => {
    expect(dir).toBeTruthy()
    expect(store.dir.startsWith(dir)).toBe(true)
  })
})
