import { api } from '../../api'
import { copyAction, pasteAction } from '../helpers'
import { truncate } from '../utils'
import { emoji, type Provider, type ResultItem, type SearchContext } from '../types'

const PRESETS: Array<{ id: string; name: string; prompt: (input: string) => string; icon: string }> = [
  {
    id: 'translate',
    name: '翻译成地道的中文',
    prompt: (input) => `请把下面内容翻译成地道、简洁的中文，保留代码、专有名词和格式：\n\n${input}`,
    icon: '🈶'
  },
  {
    id: 'polish',
    name: '润色这段文案',
    prompt: (input) => `请润色下面这段文案，让它更清晰专业，保持原意：\n\n${input}`,
    icon: '✨'
  },
  {
    id: 'explain',
    name: '解释这段代码',
    prompt: (input) => `请解释下面这段代码做了什么，并指出潜在问题：\n\n${input}`,
    icon: '🧑‍💻'
  },
  {
    id: 'regex',
    name: '写一个正则表达式',
    prompt: (input) => `请根据下面的需求给出正则表达式，并附上 Python 与 JavaScript 两版示例：\n\n${input}`,
    icon: '🔤'
  }
]

async function ask(ctx: SearchContext, prompt: string, hint?: string): Promise<void> {
  ctx.push({
    title: 'AI 回答',
    description: hint,
    icon: emoji('✨'),
    loading: true,
    items: [
      {
        id: 'ai:loading',
        providerId: 'ai',
        title: '思考中…',
        subtitle: truncate(prompt, 60),
        icon: emoji('⏳'),
        actions: []
      }
    ]
  })

  const answer = await api.ai.chat(prompt)
  ctx.replace({
    title: 'AI 回答',
    icon: emoji('✨'),
    items: [
      {
        id: 'ai:answer',
        providerId: 'ai',
        title: truncate(answer.split('\n')[0], 80) || '回答',
        subtitle: truncate(prompt, 70),
        icon: emoji('✨'),
        detail: { hero: emoji('✨'), markdown: answer },
        actions: [copyAction(() => answer), pasteAction(() => answer)]
      }
    ]
  })
}

function buildResult(ctx: SearchContext, title: string, prompt: string, icon: string, id: string): ResultItem {
  return {
    id,
    providerId: 'ai',
    title,
    subtitle: truncate(prompt.replace(/\s+/g, ' '), 72),
    icon: emoji(icon),
    actions: [
      {
        id: 'ask',
        name: '询问 AI',
        primary: true,
        shortcut: ['↵'],
        async run() {
          await ask(ctx, prompt, title)
        }
      }
    ]
  }
}

export const aiProvider: Provider = {
  id: 'ai',
  name: 'AI 助手',
  description: '用自然语言提问，答案直接显示在启动器里',
  icon: emoji('✨'),
  aliases: ['ai', 'ask', 'gpt', '问', '助手'],
  participatesInRoot: false,
  rank: 40,
  entry: true,

  search(ctx) {
    if (!ctx.settings.ai.enabled && !ctx.settings.ai.apiKey) {
      return [
        {
          id: 'ai:disabled',
          providerId: 'ai',
          title: 'AI 功能尚未启用',
          subtitle: '在「设置」里填写 API Key 后即可使用',
          icon: emoji('🔌'),
          actions: []
        }
      ]
    }

    const input = ctx.args.trim() || ctx.query.trim()
    if (!input) return []

    const direct = buildResult(ctx, `询问 AI：“${truncate(input, 40)}”`, input, '✨', `ai:direct:${input}`)
    const presets = PRESETS.map((preset) =>
      buildResult(ctx, `${preset.name}：“${truncate(input, 30)}”`, preset.prompt(input), preset.icon, `ai:${preset.id}:${input}`)
    )
    return [direct, ...presets]
  }
}
