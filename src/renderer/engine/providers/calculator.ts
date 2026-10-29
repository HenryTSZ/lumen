import { evaluate, looksLikeExpression } from '../calc'
import { convert, UNIT_CATEGORY_NAMES } from '../units'
import { copyAction, pasteAction } from '../helpers'
import { groupDigits } from '../utils'
import { emoji, type Provider } from '../types'

export const calculatorProvider: Provider = {
  id: 'calculator',
  name: '计算器',
  description: '输入表达式求值，或做单位 / 货币换算',
  icon: emoji('🧮'),
  aliases: ['=', 'calc', '计算', 'calculator', '换算', 'unit'],
  participatesInRoot: true,
  rank: 1,
  entry: true,

  detect(query) {
    const trimmed = query.trim()
    if (trimmed.length < 2) return false
    if (convert(trimmed)) return true
    if (!/[+\-*/^%()]/.test(trimmed)) return false
    return looksLikeExpression(trimmed)
  },

  search({ args }) {
    const input = String(args.trim().replace(/^=\s*/, '') || '')
    if (!input) return []

    /* 单位 / 货币换算优先 */
    const conversion = convert(input)
    if (conversion) {
      const isMoney = conversion.categoryName === '货币'
      return [
        {
          id: `unit:${input}`,
          providerId: 'calculator',
          title: `${conversion.text} ${conversion.toLabel}`,
          subtitle: conversion.subtitle,
          icon: emoji(isMoney ? '💱' : '🔁'),
          keywords: [input, conversion.categoryName],
          score: 950,
          detail: {
            hero: emoji(isMoney ? '💱' : '🔁'),
            fields: [
              { label: '类别', value: conversion.categoryName },
              { label: '源单位', value: conversion.fromLabel },
              { label: '目标单位', value: conversion.toLabel },
              ...conversion.extras.map(([label, value]) => ({ label, value }))
            ],
            footer: `支持 ${UNIT_CATEGORY_NAMES} 与货币`
          },
          actions: [
            copyAction(() => conversion.text),
            pasteAction(() => conversion.text),
            {
              id: 'copy-full',
              name: '复制完整换算式',
              shortcut: ['Ctrl', 'Shift', 'C'],
              icon: '🔁',
              run({ api, toast }) {
                void api.clipboard.write(conversion.subtitle).then(() => toast('已复制换算式'))
              }
            }
          ]
        }
      ]
    }

    const computed = evaluate(input)
    if (!computed) return []

    return [
      {
        id: `calc:${input}`,
        providerId: 'calculator',
        title: computed.text,
        subtitle: `${input} =`,
        icon: emoji('🧮'),
        score: 920,
        detail: {
          hero: emoji('🧮'),
          fields: [
            { label: '表达式', value: input },
            { label: '结果', value: computed.text },
            { label: '千分位', value: groupDigits(computed.text) },
            ...computed.extras.slice(0, 3).map(([label, value]) => ({ label, value }))
          ]
        },
        actions: [
          copyAction(() => computed.text),
          pasteAction(() => computed.text),
          {
            id: 'copy-expression',
            name: '复制完整算式',
            shortcut: ['Ctrl', 'Shift', 'C'],
            icon: '🧮',
            run({ api, toast }) {
              void api.clipboard.write(`${input} = ${computed.text}`).then(() => toast('已复制算式'))
            }
          }
        ]
      }
    ]
  }
}
