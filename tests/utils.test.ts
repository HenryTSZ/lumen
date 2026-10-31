import { describe, expect, it } from 'vitest'
import {
  basename,
  dirname,
  formatBytes,
  gradientFor,
  groupDigits,
  initialFor,
  relativeTime,
  truncate
} from '../src/renderer/engine/utils'

describe('formatBytes', () => {
  it('按 1024 进制递进', () => {
    expect(formatBytes(0)).toBe('—')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1024 ** 2)).toBe('1 MB')
    expect(formatBytes(1024 ** 3)).toBe('1 GB')
  })

  it('小于 100 的单位保留一位小数', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('不会越界到数组外', () => {
    expect(formatBytes(1024 ** 10)).toContain('TB')
  })
})

describe('groupDigits', () => {
  it('整数部分三位一分组，小数部分不动', () => {
    expect(groupDigits('1234567')).toBe('1,234,567')
    expect(groupDigits('1234.5678')).toBe('1,234.5678')
    expect(groupDigits('123')).toBe('123')
  })
})

describe('路径处理', () => {
  it('Windows 反斜杠与 Unix 斜杠都能处理', () => {
    expect(dirname('C:\\Users\\me\\a.txt')).toBe('C:\\Users\\me')
    expect(basename('C:\\Users\\me\\a.txt')).toBe('a.txt')
    expect(basename('/home/me/a.txt')).toBe('a.txt')
  })

  it('根目录与无路径输入不会返回负数下标', () => {
    expect(dirname('a.txt')).toBe('')
    expect(basename('a.txt')).toBe('a.txt')
  })
})

describe('relativeTime', () => {
  const now = Date.now()
  it('刚刚 / 分钟前 / 小时前', () => {
    expect(relativeTime(now - 10_000)).toBe('刚刚')
    expect(relativeTime(now - 5 * 60_000)).toBe('5 分钟前')
    expect(relativeTime(now - 3 * 3600_000)).toBe('3 小时前')
  })

  it('很久以前退化为日期', () => {
    expect(relativeTime(now - 30 * 24 * 3600_000)).toMatch(/[0-9]/)
  })
})

describe('图标占位', () => {
  it('英文取首字母大写，中文取首字', () => {
    expect(initialFor('code')).toBe('C')
    expect(initialFor('微信')).toBe('微')
    expect(initialFor('  ')).toBe('?')
  })

  it('同一名称得到稳定配色，不同名称尽量分散', () => {
    const a = gradientFor('Visual Studio Code')
    expect(a).toHaveLength(2)
    expect(gradientFor('Visual Studio Code')).toEqual(a)
    expect(a[0]).toMatch(/^#/)
  })
})

describe('truncate', () => {
  it('超长截断并加省略号，短文本原样返回', () => {
    expect(truncate('abcdef', 3)).toBe('abc…')
    expect(truncate('abc', 10)).toBe('abc')
  })
})
