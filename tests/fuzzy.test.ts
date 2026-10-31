import { describe, expect, it } from 'vitest'
import { match, rankBy } from '../src/renderer/engine/fuzzy'
import type { MatchResult } from '../src/renderer/engine/fuzzy'

/** 打分档位：完全一致 > 前缀 > 子串 > 拼音 > 子序列 */
describe('match — 打分档位', () => {
  it('空查询返回最低分，保证所有结果都能进列表', () => {
    expect(match('', '任意目标')).toEqual({ score: 1, ranges: [] })
  })

  it('完全一致得 1000 分，并高亮整段', () => {
    const result = match('chrome', 'Chrome')
    expect(result?.score).toBe(1000)
    expect(result?.ranges).toEqual([[0, 5]])
  })

  it('前缀命中得 900 分档（按目标长度微调）', () => {
    const result = match('wps', 'WPS Office')
    expect(result?.score).toBe(890)
    expect(result?.score).toBeGreaterThan(700)
    expect(result?.ranges).toEqual([[0, 2]])
  })

  it('连续子串命中得 700 分档，且位置越靠前分越高', () => {
    const early = match('edge', 'Edge Browser')
    const late = match('edge', 'Microsoft Edge')
    expect(early?.score).toBeGreaterThan(late?.score ?? 0)
    expect(late?.score).toBe(656)
    expect(late?.ranges).toEqual([[10, 13]])
  })

  it('拼音命中得 560 分档：首字母缩写与全拼都可以', () => {
    expect(match('wx', '微信')?.score).toBeGreaterThanOrEqual(520)
    expect(match('wx', '微信')?.score).toBeLessThanOrEqual(560)
    expect(match('weixin', '微信')?.ranges).toEqual([[0, 1]])
  })

  it('子序列散点命中得 320 分档，散点越多分越低', () => {
    const result = match('npd', 'Notepad')
    expect(result?.score).toBeLessThan(320)
    expect(result?.score).toBeGreaterThanOrEqual(300)
    expect(result?.ranges).toEqual([
      [0, 0],
      [4, 4],
      [6, 6]
    ])
  })

  it('完全无关的输入返回 null（不进结果列表）', () => {
    expect(match('zzzzz', 'Chrome')).toBeNull()
    expect(match('张三', 'Google Chrome')).toBeNull()
  })

  it('大小写不敏感', () => {
    const upper = match('CHROME', 'chrome')
    expect(upper?.score).toBe(1000)
  })
})

describe('rankBy — 批量匹配与排序', () => {
  const items = [
    { name: 'Visual Studio Code', alias: 'code' },
    { name: '微信', alias: 'wechat' },
    { name: 'Notepad', alias: '记事本' }
  ]

  it('按分数倒序返回，并带上高亮区间', () => {
    const ranked = rankBy(items, 'code', (item) => [item.name, item.alias])
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0].item.name).toBe('Visual Studio Code')
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score)
    }
  })

  it('命中标题比命中副标题更值钱（同项取最高，跨项标题优先）', () => {
    const ranked = rankBy([{ name: '记事本', alias: 'wechat' }, { name: '微信', alias: 'note' }], '微信', (item) => [
      item.name,
      item.alias
    ])
    expect(ranked[0].item.name).toBe('微信')
  })

  it('过滤掉所有不匹配项；空查询保留全部', () => {
    expect(rankBy(items, 'zzzz', (item) => [item.name])).toHaveLength(0)
    expect(rankBy(items, '', (item) => [item.name])).toHaveLength(items.length)
  })

  it('副标题命中时不给高亮区间，避免误标标题', () => {
    const ranked = rankBy([{ name: 'Alpha', alias: 'beta' }], 'beta', (item) => [item.name, item.alias])
    expect(ranked[0].ranges).toEqual([])
  })

  it('忽略 undefined 字段而不是崩溃', () => {
    const ranked = rankBy([{ name: 'Chrome', alias: undefined }], 'chr', (item) => [item.name, item.alias])
    expect(ranked).toHaveLength(1)
  })
})

describe('match — 返回的区间可用于高亮渲染', () => {
  it('区间始终落在目标字符串内且递增', () => {
    const targets = ['Visual Studio Code', '微信', 'Notepad', 'Microsoft Edge']
    const queries = ['vscode', 'wx', 'npd', 'edge', 'code']
    for (const target of targets) {
      for (const query of queries) {
        const result: MatchResult | null = match(query, target)
        if (!result) continue
        let lastEnd = -2
        for (const [start, end] of result.ranges) {
          expect(start).toBeGreaterThanOrEqual(0)
          expect(end).toBeLessThan(target.length)
          expect(start).toBeGreaterThan(lastEnd)
          lastEnd = end
        }
      }
    }
  })
})
