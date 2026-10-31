import { describe, expect, it } from 'vitest'
import { evaluate, looksLikeExpression } from '../src/renderer/engine/calc'

describe('evaluate — 四则运算与优先级', () => {
  it('遵循先乘除后加减', () => {
    expect(evaluate('1 + 2 * 3')?.value).toBe(7)
    expect(evaluate('10 - 4 / 2')?.value).toBe(8)
  })

  it('括号改变优先级', () => {
    expect(evaluate('(1+2)*3')?.value).toBe(9)
    expect(evaluate('2*(3+4)')?.value).toBe(14)
  })

  it('幂运算右结合', () => {
    expect(evaluate('2^3^2')?.value).toBe(512)
    expect(evaluate('2^10')?.value).toBe(1024)
  })

  it('取模与整除前的小数', () => {
    expect(evaluate('10 % 3')?.value).toBe(1)
    expect(evaluate('7.5 * 2')?.value).toBe(15)
  })

  it('支持 × ÷ 这类日常写法', () => {
    expect(evaluate('6 × 7')?.value).toBe(42)
    expect(evaluate('9 ÷ 3')?.value).toBe(3)
  })

  it('支持一元正负号', () => {
    expect(evaluate('-5 + 2')?.value).toBe(-3)
    expect(evaluate('-(3+4)')?.value).toBe(-7)
  })

  it('千分位写法会被当作普通数字', () => {
    expect(evaluate('1,234 + 1')?.value).toBe(1235)
    expect(evaluate('1_000_000 / 2')?.value).toBe(500000)
  })
})

describe('evaluate — 函数与常量', () => {
  it('常量 pi / e / tau', () => {
    expect(evaluate('pi')?.value).toBeCloseTo(Math.PI, 10)
    expect(evaluate('e')?.value).toBeCloseTo(Math.E, 10)
    expect(evaluate('tau')?.value).toBeCloseTo(Math.PI * 2, 10)
  })

  it('一元函数', () => {
    expect(evaluate('sqrt(16)')?.value).toBe(4)
    expect(evaluate('abs(-3)')?.value).toBe(3)
    expect(evaluate('floor(3.7)')?.value).toBe(3)
    expect(evaluate('round(3.5)')?.value).toBe(4)
    expect(evaluate('log(1000)')?.value).toBeCloseTo(3, 10)
    expect(evaluate('ln(e)')?.value).toBeCloseTo(1, 10)
  })

  it('多元函数', () => {
    expect(evaluate('max(1,2,3)')?.value).toBe(3)
    expect(evaluate('min(4,2,9)')?.value).toBe(2)
    expect(evaluate('gcd(12,18)')?.value).toBe(6)
    expect(evaluate('pow(2,8)')?.value).toBe(256)
  })

  it('阶乘', () => {
    expect(evaluate('5!')?.value).toBe(120)
    expect(evaluate('0!')?.value).toBe(1)
    // 小数阶乘无定义，求值器应当直接放弃而不是返回 NaN
    expect(evaluate('3.5!')).toBeNull()
  })

  it('嵌套调用', () => {
    expect(evaluate('sqrt(max(9, 16))')?.value).toBe(4)
    expect(evaluate('round(pi * 100)')?.value).toBe(314)
  })
})

describe('evaluate — 格式化与附加信息', () => {
  it('整数直接输出，浮点去掉多余零', () => {
    expect(evaluate('2^10')?.text).toBe('1024')
    expect(evaluate('1/4')?.text).toBe('0.25')
    expect(evaluate('10/3')?.text).toBe('3.3333333333')
  })

  it('整数给出十六进制 / 二进制 / 八进制', () => {
    const extras = Object.fromEntries(evaluate('255')?.extras ?? [])
    expect(extras['十六进制']).toBe('0xFF')
    expect(extras['二进制']).toBe('0b11111111')
    expect(extras['八进制']).toBe('0o377')
  })

  it('负数进制不会出现 0x-3 这种写法', () => {
    const extras = Object.fromEntries(evaluate('-5 + 2')?.extras ?? [])
    expect(extras['十六进制']).toBe('-0x3')
    expect(extras['二进制']).toBe('-0b11')
    expect(extras['八进制']).toBe('-0o3')
    expect(extras['十六进制']).not.toContain('0x-')
  })

  it('大数给出千分位', () => {
    const extras = Object.fromEntries(evaluate('1000 * 12')?.extras ?? [])
    expect(extras['千分位']).toBe('12,000')
  })

  it('非整数不给出进制信息', () => {
    expect(evaluate('1/3')?.extras).toHaveLength(0)
  })
})

describe('evaluate — 非法输入一律返回 null，绝不抛异常', () => {
  const bad = ['1 +', '', '   ', '((1)', '1/0', 'abc', '1 + +', 'sqrt(', '1 $ 2', '你好']
  it.each(bad)('%s 返回 null', (input) => {
    expect(() => evaluate(input)).not.toThrow()
    expect(evaluate(input)).toBeNull()
  })

  it('未知标识符不会污染结果', () => {
    expect(evaluate('foo(2)')).toBeNull()
    expect(evaluate('1 + bar')).toBeNull()
  })
})

describe('looksLikeExpression — 决定要不要把输入喂给计算器', () => {
  it('含数字且只有算式字符才算表达式', () => {
    expect(looksLikeExpression('1+1')).toBe(true)
    expect(looksLikeExpression('(3.5 * 2) / 7')).toBe(true)
    expect(looksLikeExpression('2^10')).toBe(true)
    expect(looksLikeExpression('sqrt(2)')).toBe(true)
  })

  it('纯文字 / 单个数字 / 空串不算表达式', () => {
    expect(looksLikeExpression('hello')).toBe(false)
    expect(looksLikeExpression('重启')).toBe(false)
    expect(looksLikeExpression('1')).toBe(false)
    expect(looksLikeExpression('')).toBe(false)
  })
})
