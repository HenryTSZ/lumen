import { describe, expect, it } from 'vitest'
import { BUILTIN_FX, applyFxRates, convert, fxIsFresh, fxUpdatedAt } from '../src/renderer/engine/units'

describe('convert — 线性单位', () => {
  it('长度：公里 → 英里', () => {
    const result = convert('100km to mi')
    expect(result?.categoryName).toBe('长度')
    expect(result?.value).toBeCloseTo(62.137, 3)
    expect(result?.fromLabel).toBe('km')
    expect(result?.toLabel).toBe('mi')
  })

  it('数据存储按 1024 进制', () => {
    expect(convert('1GB=?MB')?.value).toBe(1024)
    expect(convert('1tb to gb')?.value).toBe(1024)
  })

  it('市制单位', () => {
    expect(convert('3尺是多少厘米')?.value).toBeCloseTo(100, 6)
    expect(convert('1斤 to g')?.value).toBe(500)
  })

  it('时间', () => {
    expect(convert('1 小时 到 分钟')?.value).toBe(60)
    expect(convert('2h to min')?.value).toBe(120)
  })

  it('同一类别内换算，跨类别拒绝', () => {
    expect(convert('100km to kg')).toBeNull()
    expect(convert('100km to 苹果')).toBeNull()
  })

  it('反向换算保持一致', () => {
    const forward = convert('10 mi to km')?.value ?? 0
    const backward = convert(`${forward} km to mi`)?.value ?? 0
    expect(backward).toBeCloseTo(10, 6)
  })

  it('副标题形如「100 km = 62.13711922 mi」', () => {
    expect(convert('1 m to cm')?.subtitle).toBe('1 m = 100 cm')
  })

  it('附带同类别其他常见单位，且不含源/目标自身', () => {
    const extras = convert('1km to m')?.extras ?? []
    const labels = extras.map(([label]) => label)
    expect(labels).not.toContain('km')
    expect(labels).not.toContain('m')
    expect(extras.length).toBeLessThanOrEqual(5)
  })
})

describe('convert — 仿射单位（温度）', () => {
  it('华氏 → 摄氏', () => {
    expect(convert('100°F 到 °C')?.value).toBeCloseTo(37.7778, 4)
  })

  it('摄氏 → 华氏', () => {
    expect(convert('0°C to F')?.value).toBeCloseTo(32, 6)
    expect(convert('100°C to F')?.value).toBeCloseTo(212, 6)
  })

  it('开尔文', () => {
    expect(convert('0°C to K')?.value).toBeCloseTo(273.15, 6)
    expect(convert('0 K to °C')?.value).toBeCloseTo(-273.15, 6)
  })

  it('-40° 是两种温标的交点', () => {
    expect(convert('-40°C to F')?.value).toBeCloseTo(-40, 6)
  })
})

describe('convert — 货币', () => {
  it('符号写法：$250 换 人民币', () => {
    const result = convert('$250 换 人民币')
    expect(result?.categoryName).toBe('货币')
    expect(result?.fromLabel).toBe('USD')
    expect(result?.toLabel).toBe('CNY')
    expect(result?.value).toBe(1775)
  })

  it('代码与中文名混用', () => {
    expect(convert('100 usd to cny')?.value).toBeCloseTo(710, 6)
    expect(convert('50 欧元 换 日元')?.value).toBeCloseTo((50 / 0.92) * 151, 4)
  })

  it('同币种换算为 1:1', () => {
    expect(convert('88 cny to cny')?.value).toBe(88)
  })

  it('给出汇率与来源说明', () => {
    const extras = Object.fromEntries(convert('10 usd to eur')?.extras ?? [])
    expect(extras['汇率']).toContain('1 USD')
    expect(extras['汇率日期']).toBe('内置快照')
  })

  it('未知币种返回 null', () => {
    expect(convert('100 xyz to cny')).toBeNull()
  })
})

describe('convert — 输入健壮性', () => {
  it('没有数字的输入不处理', () => {
    expect(convert('')).toBeNull()
    expect(convert('abc')).toBeNull()
    expect(convert('km to mi')).toBeNull()
  })

  it('缺少源单位或目标单位时不误判', () => {
    expect(convert('100')).toBeNull()
    expect(convert('100 到')).toBeNull()
  })

  it('纯数字序列（如 10 到 20）不是换算', () => {
    expect(convert('10 到 20')).toBeNull()
  })

  it('支持负数与小数', () => {
    expect(convert('-40°C to F')?.value).toBeCloseTo(-40, 6)
    expect(convert('0.5kg to g')?.value).toBe(500)
  })

  it('结果文本不出现浮点尾差（0.1+0.2 这类）', () => {
    expect(convert('0.1km to m')?.text).toBe('100')
  })
})

describe('汇率快照', () => {
  it('内置快照以 USD 为基准且覆盖常见币种', () => {
    expect(BUILTIN_FX.base).toBe('USD')
    expect(BUILTIN_FX.rates.USD).toBe(1)
    expect(Object.keys(BUILTIN_FX.rates).length).toBeGreaterThan(20)
    expect(fxUpdatedAt()).toBe(0)
    expect(fxIsFresh()).toBe(false)
  })

  it('刷新后新汇率立即生效', () => {
    const before = convert('100 usd to cny')?.value ?? 0
    applyFxRates({
      updatedAt: Date.now(),
      base: 'USD',
      rates: { ...BUILTIN_FX.rates, CNY: 8 }
    })
    expect(convert('100 usd to cny')?.value).toBe(800)
    expect(convert('100 usd to cny')?.value).not.toBe(before)
    expect(fxIsFresh()).toBe(true)
    // 还原，避免影响后续用例
    applyFxRates(BUILTIN_FX)
  })

  it('空表或残缺表不会被采纳', () => {
    applyFxRates({ updatedAt: Date.now(), base: 'USD', rates: { USD: 1 } })
    expect(convert('100 usd to cny')?.value).toBeCloseTo(710, 6)
  })
})
