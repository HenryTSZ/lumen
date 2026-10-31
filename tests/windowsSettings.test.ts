import { describe, expect, it, vi } from 'vitest'
import { WIN_SETTINGS, WIN_SETTING_GROUPS, winSettingGroup } from '../src/renderer/data/windowsSettings'
import { windowsSettingsProvider } from '../src/renderer/engine/providers/windowsSettings'
import type { AppSettings } from '@shared/types'
import type { SearchContext } from '../src/renderer/engine/types'
import { api } from '../src/renderer/api'

function makeCtx(query = '', args = query): SearchContext {
  return {
    query,
    args,
    settings: { resultLimit: 60 } as AppSettings,
    api,
    close: () => undefined,
    toast: () => undefined,
    push: () => undefined,
    replace: () => undefined,
    refresh: () => undefined,
    runQuery: () => undefined
  }
}

describe('Windows 设置清单', () => {
  it('条目数量足够覆盖常见设置', () => {
    expect(WIN_SETTINGS.length).toBeGreaterThan(80)
  })

  it('target 唯一，不会有两个入口抢同一个 id', () => {
    const targets = WIN_SETTINGS.map((entry) => entry.target)
    expect(new Set(targets).size).toBe(targets.length)
  })

  it('分组下标都有效', () => {
    for (const entry of WIN_SETTINGS) {
      expect(entry.group).toBeGreaterThanOrEqual(0)
      expect(entry.group).toBeLessThan(WIN_SETTING_GROUPS.length)
      expect(winSettingGroup(entry.group)).toBeTruthy()
    }
  })

  it('越界下标退回第一个分组，不会崩', () => {
    expect(winSettingGroup(999)).toBe(WIN_SETTING_GROUPS[0])
  })

  it('ms-settings URI 格式合法：小写、无空格、带冒号', () => {
    for (const entry of WIN_SETTINGS) {
      if (!entry.target.startsWith('ms-settings:')) continue
      expect(entry.target).toMatch(/^ms-settings:[a-z0-9-]+$/)
    }
  })

  it('每条都有中英标题与关键词，方便双语搜索', () => {
    for (const entry of WIN_SETTINGS) {
      expect(entry.title.length).toBeGreaterThan(0)
      expect(entry.titleEn.length).toBeGreaterThan(0)
      expect(entry.keys.length).toBeGreaterThan(0)
    }
  })

  it('覆盖了几个高频入口', () => {
    const targets = new Set(WIN_SETTINGS.map((entry) => entry.target))
    for (const must of [
      'ms-settings:bluetooth',
      'ms-settings:defaultapps',
      'ms-settings:powersleep',
      'ms-settings:windowsupdate',
      'devmgmt.msc',
      'appwiz.cpl'
    ]) {
      expect(targets.has(must)).toBe(true)
    }
  })
})

describe('windowsSettings provider', () => {
  it('中文直搜：蓝牙 / 默认应用 / 设备管理器', async () => {
    const cases: Array<[string, string]> = [
      ['蓝牙', 'ms-settings:bluetooth'],
      ['默认应用', 'ms-settings:defaultapps'],
      ['设备管理器', 'devmgmt.msc'],
      ['电源', 'ms-settings:powersleep']
    ]
    for (const [query, expected] of cases) {
      const results = await windowsSettingsProvider.search(makeCtx(query))
      expect(results.length).toBeGreaterThan(0)
      // 同类入口可能并列（如「电源」同时命中电源选项/电源与电池），只要求期望项进前列
      expect(results.some((r) => r.id === `winset:${expected}`)).toBe(true)
    }
  })

  it('英文直搜：bluetooth / printer / update', async () => {
    const cases: Array<[string, string]> = [
      ['bluetooth', 'ms-settings:bluetooth'],
      ['printer', 'ms-settings:printers'],
      ['windows update', 'ms-settings:windowsupdate']
    ]
    for (const [query, expected] of cases) {
      const results = await windowsSettingsProvider.search(makeCtx(query))
      expect(results[0].id).toBe(`winset:${expected}`)
    }
  })

  it('空查询按分组顺序平铺，并受 resultLimit 约束', async () => {
    const results = await windowsSettingsProvider.search(makeCtx(''))
    expect(results.length).toBe(60)
    const groups = results.map((r) => WIN_SETTINGS.find((e) => `winset:${e.target}` === r.id)!.group)
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i]).toBeGreaterThanOrEqual(groups[i - 1])
    }
  })

  it('结果带分组副标题、图标与详情', async () => {
    const [first] = await windowsSettingsProvider.search(makeCtx('蓝牙'))
    expect(first.subtitle).toContain('蓝牙与设备')
    expect(first.subtitle).toContain('ms-settings:bluetooth')
    expect(first.icon.kind).toBe('emoji')
    expect(first.detail?.fields?.some((f) => f.label === 'English')).toBe(true)
    expect(first.usageKey).toBe('winset:ms-settings:bluetooth')
  })

  it('主操作会调用 system.open 打开目标', async () => {
    const spy = vi.spyOn(api.system, 'open')
    const [first] = await windowsSettingsProvider.search(makeCtx('蓝牙'))
    const open = first.actions.find((action) => action.id === 'open')
    expect(open?.primary).toBe(true)
    await open?.run({
      item: first,
      settings: { resultLimit: 60 } as AppSettings,
      close: () => undefined,
      toast: () => undefined,
      refresh: () => undefined,
      runQuery: () => undefined,
      api
    })
    expect(spy).toHaveBeenCalledWith('ms-settings:bluetooth')
    spy.mockRestore()
  })

  it('无关查询不会返回一堆噪音', async () => {
    const results = await windowsSettingsProvider.search(makeCtx('zzzzzzqqqq'))
    expect(results).toHaveLength(0)
  })
})
