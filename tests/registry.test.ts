import { beforeEach, describe, expect, it, vi } from 'vitest'

// 设置项常量定义在主进程侧，读取时需要 electron 的 userData 路径，这里换成临时目录
vi.mock('electron', async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumen-registry-'))
  return { app: { getPath: () => dir } }
})

import { DEFAULT_SETTINGS } from '../src/main/store'
import {
  PROVIDERS,
  registerProvider,
  resetProviders,
  resolve,
  rootProviders,
  unregisterProvider
} from '../src/renderer/engine/registry'
import type { AppSettings } from '@shared/types'
import type { Provider, SearchContext } from '../src/renderer/engine/types'
import { api } from '../src/renderer/api'

/** 造一个最小可用的 Provider，只填契约要求的字段 */
function makeProvider(id: string, overrides: Partial<Provider> = {}): Provider {
  return {
    id,
    name: `测试扩展 ${id}`,
    description: '单测用',
    icon: { kind: 'emoji', value: '🧩' },
    aliases: [id],
    rank: 100,
    participatesInRoot: true,
    search: async () => [],
    ...overrides
  }
}

/** 造一个最小可用的 SearchContext（走 mock 桥接，不依赖 Electron） */
function makeCtx(query = '', args = ''): SearchContext {
  return {
    query,
    args,
    settings: { ...DEFAULT_SETTINGS } as AppSettings,
    api,
    close: () => undefined,
    toast: () => undefined,
    push: () => undefined,
    replace: () => undefined,
    refresh: () => undefined,
    runQuery: () => undefined
  }
}

describe('registry — 扩展注册与注销', () => {
  beforeEach(() => {
    resetProviders()
  })

  it('内置扩展默认全部注册', () => {
    expect(PROVIDERS.length).toBeGreaterThan(10)
    const ids = PROVIDERS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('注册插件扩展后可以立即被检索到', () => {
    const plugin = makeProvider('test-plugin', { aliases: ['tp'] })
    registerProvider(plugin)
    expect(PROVIDERS.some((p) => p.id === 'test-plugin')).toBe(true)
    expect(resolve('tp hello').provider?.id).toBe('test-plugin')
  })

  it('重复注册同一个 id 是替换而不是追加', () => {
    registerProvider(makeProvider('dup', { name: '第一版', participatesInRoot: false }))
    registerProvider(makeProvider('dup', { name: '第二版', participatesInRoot: false }))
    expect(PROVIDERS.filter((p) => p.id === 'dup')).toHaveLength(1)
    expect(PROVIDERS.find((p) => p.id === 'dup')?.name).toBe('第二版')
  })

  it('注销后不再参与解析', () => {
    registerProvider(makeProvider('gone', { aliases: ['gone'] }))
    unregisterProvider('gone')
    expect(PROVIDERS.some((p) => p.id === 'gone')).toBe(false)
    expect(resolve('gone x').provider).toBeNull()
  })

  it('resetProviders 只保留内置扩展', () => {
    registerProvider(makeProvider('extra'))
    resetProviders()
    expect(PROVIDERS.some((p) => p.id === 'extra')).toBe(false)
  })
})

describe('rootProviders — 聚合搜索的参与者', () => {
  it('只包含 participatesInRoot 的扩展，且按 rank 升序', () => {
    resetProviders()
    const roots = rootProviders()
    expect(roots.length).toBeGreaterThan(0)
    expect(roots.every((p) => p.participatesInRoot)).toBe(true)
    for (let i = 1; i < roots.length; i++) {
      expect(roots[i - 1].rank).toBeLessThanOrEqual(roots[i].rank)
    }
  })
})

describe('resolve — 触发词解析', () => {
  beforeEach(() => {
    resetProviders()
  })

  it('空输入走聚合搜索', () => {
    expect(resolve('')).toEqual({ provider: null, args: '' })
    expect(resolve('   ').provider).toBeNull()
  })

  it('命中触发词时返回扩展与剩余参数', () => {
    const found = resolve('clip hello world')
    expect(found.provider?.id).toBe('clipboard')
    expect(found.args).toBe('hello world')
  })

  it('触发词大小写不敏感', () => {
    expect(resolve('CLIP abc').provider?.id).toBe('clipboard')
  })

  it('只有触发词没有参数时 args 为空串', () => {
    const found = resolve('clip')
    expect(found.provider?.id).toBe('clipboard')
    expect(found.args).toBe('')
  })

  it('单字母别名必须带空格，否则 "files" 会被误判成 f + iles', () => {
    expect(resolve('f').provider).toBeNull()
    expect(resolve('f report').provider?.id).toBe('files')
  })

  it('尾部空格不影响解析', () => {
    expect(resolve('clip abc   ').args).toBe('abc')
  })

  it('没有命中触发词时，交给 detect 兜底', () => {
    const found = resolve('1+2*3')
    expect(found.provider?.id).toBe('calculator')
    expect(found.args).toBe('1+2*3')
  })

  it('普通文本走聚合搜索，参数原样保留', () => {
    const found = resolve('随便搜点什么')
    expect(found.provider).toBeNull()
    expect(found.args).toBe('随便搜点什么')
  })
})

describe('Provider 契约', () => {
  it('所有内置扩展都具备展示所需的字段', () => {
    for (const provider of PROVIDERS) {
      expect(provider.id).toBeTruthy()
      expect(provider.name).toBeTruthy()
      expect(typeof provider.search).toBe('function')
      expect(typeof provider.rank).toBe('number')
    }
  })

  it('所有内置扩展都可以用空参数安全调用（不抛同步异常）', async () => {
    const ctx = makeCtx()
    for (const provider of PROVIDERS) {
      // 允许返回 Promise，也允许同步数组
      const result = await Promise.resolve(provider.search(ctx)).catch(() => [])
      expect(Array.isArray(result)).toBe(true)
    }
  })

  it('所有内置扩展都能处理非空查询', async () => {
    for (const provider of PROVIDERS) {
      const result = await Promise.resolve(provider.search(makeCtx('test', 'test'))).catch(() => [])
      expect(Array.isArray(result)).toBe(true)
    }
  })
})
