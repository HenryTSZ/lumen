import { beforeEach, describe, expect, it } from 'vitest'
import { isEnglish, locale, setLocale, t, tAction } from '../src/renderer/i18n'
import { localeFromSettings } from '../src/renderer/i18n'
import type { AppSettings } from '../src/shared/types'
import { windowsSettingsProvider } from '../src/renderer/engine/providers/windowsSettings'
import { systemProvider } from '../src/renderer/engine/providers/system'
import type { SearchContext } from '../src/renderer/engine/types'
import { api } from '../src/renderer/api'

function makeCtx(query = '', args = query): SearchContext {
  return {
    query,
    args,
    settings: { resultLimit: 20 } as AppSettings,
    api,
    close: () => undefined,
    toast: () => undefined,
    push: () => undefined,
    replace: () => undefined,
    refresh: () => undefined,
    runQuery: () => undefined
  }
}

beforeEach(() => {
  setLocale('zh')
})

describe('i18n 基础', () => {
  it('默认中文，setLocale 切换即时生效', () => {
    expect(locale()).toBe('zh')
    expect(isEnglish()).toBe(false)
    expect(t('你好', 'Hello')).toBe('你好')
    setLocale('en')
    expect(locale()).toBe('en')
    expect(isEnglish()).toBe(true)
    expect(t('你好', 'Hello')).toBe('Hello')
  })

  it('未知语言值按中文处理', () => {
    setLocale('fr' as 'en')
    expect(locale()).toBe('zh')
    setLocale(undefined)
    expect(locale()).toBe('zh')
  })

  it('从设置读取语言', () => {
    expect(localeFromSettings({ language: 'en' } as AppSettings)).toBe('en')
    expect(localeFromSettings({ language: 'zh' } as AppSettings)).toBe('zh')
    expect(localeFromSettings(null)).toBe('zh')
  })

  it('标准动作名在英文语境自动翻译，未知动作原样返回', () => {
    expect(tAction('执行')).toBe('执行')
    setLocale('en')
    expect(tAction('执行')).toBe('Run')
    expect(tAction('打开')).toBe('Open')
    expect(tAction('粘贴到当前窗口')).toBe('Paste to Active Window')
    expect(tAction('某个插件专属动作')).toBe('某个插件专属动作')
  })
})

describe('Windows 设置搜索的双语表现', () => {
  it('中文语境显示中文标题与分组', async () => {
    const [first] = await windowsSettingsProvider.search(makeCtx('bluetooth'))
    expect(first.title).toBe('蓝牙和设备')
    expect(first.subtitle).toContain('蓝牙与设备')
  })

  it('英文语境显示英文标题与分组，中英文查询都能命中', async () => {
    setLocale('en')
    const [en] = await windowsSettingsProvider.search(makeCtx('bluetooth'))
    expect(en.title).toBe('Bluetooth & Devices')
    expect(en.subtitle).toContain('Bluetooth & Devices')

    const [zhQuery] = await windowsSettingsProvider.search(makeCtx('蓝牙'))
    expect(zhQuery.title).toBe('Bluetooth & Devices')
  })
})

describe('系统命令的双语表现', () => {
  it('中文语境显示中文', async () => {
    const results = await systemProvider.search(makeCtx('lock'))
    expect(results[0].title).toBe('锁定屏幕')
  })

  it('英文语境显示英文，中英文查询都能命中', async () => {
    setLocale('en')
    const results = await systemProvider.search(makeCtx('lock'))
    expect(results[0].title).toBe('Lock Screen')
    const zhResults = await systemProvider.search(makeCtx('关机'))
    expect(zhResults[0].title).toBe('Shut Down')
  })
})
