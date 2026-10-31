/**
 * 表达式求值器（Shunting-yard + RPN）。
 * 支持：+ - * / ^ % 括号、科学函数、常量 pi/e/φ、阶乘 !、千分位分隔符写法。
 * 不引入 mathjs 一类的重依赖，保证启动器冷启动体积和速度。
 */

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  π: Math.PI,
  e: Math.E,
  phi: (1 + Math.sqrt(5)) / 2,
  τ: Math.PI * 2,
  tau: Math.PI * 2
}

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  sqrt: (x) => Math.sqrt(x),
  cbrt: (x) => Math.cbrt(x),
  abs: (x) => Math.abs(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  log2: (x) => Math.log2(x),
  exp: (x) => Math.exp(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  round: (x) => Math.round(x),
  sign: (x) => Math.sign(x),
  factorial: (x) => {
    if (x < 0 || x !== Math.floor(x)) return NaN
    let result = 1
    for (let i = 2; i <= x; i++) result *= i
    return result
  },
  pow: (a, b) => a ** b,
  max: (...args) => Math.max(...args),
  min: (...args) => Math.min(...args),
  gcd: (a, b) => {
    let x = Math.abs(a)
    let y = Math.abs(b)
    while (y) {
      const t = y
      y = x % y
      x = t
    }
    return x
  }
}

export interface CalcResult {
  value: number
  /** 展示用的格式化结果 */
  text: string
  /** 附带信息：十六进制、二进制等 */
  extras: Array<[string, string]>
}

/** 判断一段输入是否「看起来像数学表达式」 */
export function looksLikeExpression(input: string): boolean {
  const trimmed = input.trim()
  if (trimmed.length < 2) return false
  if (!/[0-9]/.test(trimmed)) return false
  return /^[0-9+\-*/^%().,\s_a-zα-ωΑ-Ωπτ]+$/i.test(trimmed)
}

export function evaluate(expression: string): CalcResult | null {
  try {
    const tokens = tokenize(expression)
    if (!tokens.length) return null
    const value = evaluateRpn(toRpn(tokens))
    if (!Number.isFinite(value)) return null
    return {
      value,
      text: formatNumber(value),
      extras: buildExtras(value)
    }
  } catch {
    return null
  }
}

type Token =
  | { type: 'number'; value: number }
  | { type: 'op'; value: string }
  | { type: 'func'; value: string }
  | { type: 'const'; value: number }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' }

const OPERATORS: Record<string, { precedence: number; right?: boolean; unary?: boolean }> = {
  '+': { precedence: 2, unary: true },
  '-': { precedence: 2, unary: true },
  '*': { precedence: 3, unary: false },
  '/': { precedence: 3, unary: false },
  '%': { precedence: 3, unary: false },
  '^': { precedence: 5, right: true, unary: false },
  '!': { precedence: 6, unary: false }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const src = input.replace(/,/g, (m) => (/\d,\d{3}\b/.test(input) ? '' : m)).replace(/[，、]/g, '')

  while (i < src.length) {
    const ch = src[i]

    if (/\s/.test(ch)) {
      i++
      continue
    }

    if (/[0-9.]/.test(ch)) {
      let num = ''
      while (i < src.length && /[0-9._]/.test(src[i])) {
        if (src[i] !== '_') num += src[i]
        i++
      }
      tokens.push({ type: 'number', value: Number(num) })
      continue
    }

    if (/[a-zA-Zα-ωΑ-Ωπτ]/.test(ch)) {
      let word = ''
      while (i < src.length && /[a-zA-Zα-ωΑ-Ωπτ]/.test(src[i])) {
        word += src[i]
        i++
      }
      const lower = word.toLowerCase()
      if (lower in CONSTANTS) {
        tokens.push({ type: 'const', value: CONSTANTS[lower] })
      } else if (lower in FUNCTIONS && src[i] === '(') {
        tokens.push({ type: 'func', value: lower })
      } else if (lower === 'mod' || lower === 'divide') {
        tokens.push({ type: 'op', value: lower === 'mod' ? '%' : '/' })
      } else {
        throw new Error(`未知标识符 ${word}`)
      }
      continue
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch })
      i++
      continue
    }

    if (ch === ',') {
      tokens.push({ type: 'comma' })
      i++
      continue
    }

    if (ch in OPERATORS) {
      const prev = tokens[tokens.length - 1]
      const unaryContext =
        !prev || prev.type === 'op' || (prev.type === 'paren' && prev.value === '(') || prev.type === 'comma'
      if ((ch === '+' || ch === '-') && unaryContext) {
        tokens.push({ type: 'number', value: 0 })
      }
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }

    // 允许 × ÷ 这类常见写法
    if (ch === '×' || ch === 'x') {
      tokens.push({ type: 'op', value: '*' })
      i++
      continue
    }
    if (ch === '÷') {
      tokens.push({ type: 'op', value: '/' })
      i++
      continue
    }

    throw new Error(`无法识别的字符 ${ch}`)
  }

  return tokens
}

function toRpn(tokens: Token[]): Token[] {
  const output: Token[] = []
  const stack: Token[] = []

  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'const') {
      output.push(token)
    } else if (token.type === 'func') {
      stack.push(token)
    } else if (token.type === 'comma') {
      while (stack.length && stack[stack.length - 1].type !== 'paren') {
        output.push(stack.pop()!)
      }
    } else if (token.type === 'op') {
      const info = OPERATORS[token.value]
      while (stack.length) {
        const top = stack[stack.length - 1]
        if (top.type !== 'op') break
        const topInfo = OPERATORS[top.value]
        if (
          (!info.right && info.precedence <= topInfo.precedence) ||
          (info.right && info.precedence < topInfo.precedence)
        ) {
          output.push(stack.pop()!)
        } else {
          break
        }
      }
      stack.push(token)
    } else if (token.type === 'paren' && token.value === '(') {
      stack.push(token)
    } else if (token.type === 'paren' && token.value === ')') {
      while (stack.length && stack[stack.length - 1].type !== 'paren') {
        output.push(stack.pop()!)
      }
      stack.pop()
      if (stack.length && stack[stack.length - 1].type === 'func') {
        output.push(stack.pop()!)
      }
    }
  }

  while (stack.length) {
    const top = stack.pop()!
    if (top.type === 'paren') throw new Error('括号不匹配')
    output.push(top)
  }

  return output
}

/** 函数的参数个数，未列出的按一元处理 */
const ARITY: Record<string, number> = { max: 2, min: 2, gcd: 2, pow: 2 }

function evaluateRpn(tokens: Token[]): number {
  const stack: number[] = []

  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'const') {
      stack.push(token.value)
      continue
    }
    if (token.type === 'op') {
      if (token.value === '!') {
        const a = stack.pop()
        if (a === undefined) throw new Error('缺少操作数')
        stack.push(FUNCTIONS.factorial(a))
        continue
      }
      const b = stack.pop()
      const a = stack.pop()
      if (a === undefined || b === undefined) throw new Error('缺少操作数')
      switch (token.value) {
        case '+':
          stack.push(a + b)
          break
        case '-':
          stack.push(a - b)
          break
        case '*':
          stack.push(a * b)
          break
        case '/':
          if (b === 0) throw new Error('除数为 0')
          stack.push(a / b)
          break
        case '%':
          if (b === 0) throw new Error('模为 0')
          stack.push(a % b)
          break
        case '^':
          stack.push(a ** b)
          break
        default:
          throw new Error('未知运算符')
      }
      continue
    }
    if (token.type === 'func') {
      const fn = FUNCTIONS[token.value]
      if (!fn) throw new Error('未知函数')
      const arity = ARITY[token.value] ?? 1
      const args: number[] = []
      const available = stack.length
      for (let i = 0; i < arity; i++) {
        const value = stack.pop()
        if (value === undefined) throw new Error('参数不足')
        args.unshift(value)
      }
      // 变参函数（max/min）允许接收更多参数
      if (token.value === 'max' || token.value === 'min') {
        for (let i = available - arity; i > 0; i--) {
          const value = stack.pop()
          if (value !== undefined) args.unshift(value)
        }
      }
      stack.push(fn(...args))
    }
  }

  if (stack.length !== 1) throw new Error('表达式不完整')
  return stack[0]
}

function formatNumber(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value)
  const abs = Math.abs(value)
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) return value.toExponential(6)
  return String(Number(value.toFixed(10)))
}

function buildExtras(value: number): Array<[string, string]> {
  const extras: Array<[string, string]> = []
  if (Number.isInteger(value) && Math.abs(value) < 2 ** 32) {
    // 负数不能直接 toString(16)，否则会出现 "0x-3" 这种写法
    const sign = value < 0 ? '-' : ''
    const abs = Math.abs(value)
    extras.push(['十六进制', `${sign}0x${abs.toString(16).toUpperCase()}`])
    extras.push(['二进制', `${sign}0b${abs.toString(2)}`])
    extras.push(['八进制', `${sign}0o${abs.toString(8)}`])
  }
  if (Math.abs(value) >= 1000) {
    extras.push(['千分位', value.toLocaleString('en-US')])
    if (value > 0) extras.push(['税率 13%', String(Number((value * 1.13).toFixed(2)))])
  }
  return extras
}
