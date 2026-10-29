import type { ReactNode } from 'react'

interface Props {
  text: string
}

const INLINE_RE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  INLINE_RE.lastIndex = 0

  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    const token = match[0]
    if (token.startsWith('`')) {
      nodes.push(<code key={match.index}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={match.index}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<em key={match.index}>{token.slice(1, -1)}</em>)
    }
    lastIndex = match.index + token.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

interface Block {
  type: 'p' | 'h' | 'code' | 'li'
  lines: string[]
}

function parse(text: string): Block[] {
  const blocks: Block[] = []
  let current: Block | null = null
  let inCode = false
  let codeLines: string[] = []

  const flush = () => {
    if (current) blocks.push(current)
    current = null
  }

  for (const line of text.split(/\r?\n/)) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        blocks.push({ type: 'code', lines: codeLines })
        codeLines = []
        inCode = false
      } else {
        flush()
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }
    if (/^#{1,6}\s/.test(line)) {
      flush()
      blocks.push({ type: 'h', lines: [line.replace(/^#{1,6}\s/, '')] })
      continue
    }
    if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      if (current?.type !== 'li') {
        flush()
        current = { type: 'li', lines: [] }
      }
      current.lines.push(line.replace(/^\s*([-*+]|\d+\.)\s/, ''))
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    if (current?.type !== 'p') {
      flush()
      current = { type: 'p', lines: [] }
    }
    current.lines.push(line)
  }

  if (inCode && codeLines.length) blocks.push({ type: 'code', lines: codeLines })
  flush()
  return blocks
}

/** 轻量 Markdown 渲染：覆盖标题、代码块、列表、粗体斜体与行内代码 */
export function Markdown({ text }: Props) {
  const blocks = parse(text)

  return (
    <div className="markdown">
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          return (
            <pre key={index} className="md-code">
              {block.lines.join('\n')}
            </pre>
          )
        }
        if (block.type === 'h') {
          return (
            <div key={index} className="md-h">
              {inline(block.lines[0])}
            </div>
          )
        }
        if (block.type === 'li') {
          return (
            <ul key={index} className="md-list">
              {block.lines.map((line, i) => (
                <li key={i}>{inline(line)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={index} className="md-p">
            {inline(block.lines.join('\n'))}
          </p>
        )
      })}
    </div>
  )
}
