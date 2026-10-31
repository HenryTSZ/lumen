import { describe, expect, it } from 'vitest'
import { EMOJI_DATA, EMOJI_GROUPS, HOT_EMOJI, emojiRows } from '../src/renderer/data/emoji'

describe('emoji 数据集', () => {
  it('原始数据用 \n 分行、\t 分列', () => {
    expect(EMOJI_DATA).toContain('\n')
    expect(EMOJI_DATA).toContain('\t')
    expect(EMOJI_DATA.endsWith('\n')).toBe(false)
  })

  it('每一行都能解析出 4 列：字符 / 中文名 / 关键词 / 分组下标', () => {
    const rows = emojiRows()
    expect(rows.length).toBeGreaterThan(1000)
    for (const row of rows) {
      expect(row).toHaveLength(4)
      expect(row[0].length).toBeGreaterThan(0)
      expect(row[1].length).toBeGreaterThan(0)
      expect(row[3]).toMatch(/^\d+$/)
    }
  })

  it('分组下标始终落在分组表范围内', () => {
    const rows = emojiRows()
    for (const row of rows) {
      const index = Number(row[3])
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(EMOJI_GROUPS.length)
    }
  })

  it('至少覆盖全部 9 个分组', () => {
    const groups = new Set(emojiRows().map((row) => Number(row[3])))
    expect(groups.size).toBe(EMOJI_GROUPS.length)
  })

  it('解析结果被缓存，重复调用返回同一份引用（启动性能）', () => {
    expect(emojiRows()).toBe(emojiRows())
  })

  it('字符不重复', () => {
    const rows = emojiRows()
    expect(new Set(rows.map((row) => row[0])).size).toBe(rows.length)
  })

  it('关键词里保留英文以便英文搜索', () => {
    const target = emojiRows().find((row) => row[0] === '😀')
    expect(target?.[1]).toBe('嘿嘿')
    expect(target?.[2]).toMatch(/[a-z]/)
  })

  it('高频 emoji 全部存在于数据集中（防止脚本更新后失联）', () => {
    const set = new Set(emojiRows().map((row) => row[0]))
    const missing = HOT_EMOJI.filter((emoji) => !set.has(emoji))
    expect(missing).toEqual([])
  })
})
