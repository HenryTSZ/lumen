/** 相对时间：刚刚 / 5 分钟前 / 昨天 14:20 */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const minute = 60_000
  if (diff < 45_000) return '刚刚'
  if (diff < 60 * minute) return `${Math.round(diff / minute)} 分钟前`
  if (diff < 24 * 60 * minute) return `${Math.round(diff / (60 * minute))} 小时前`
  if (diff < 48 * 60 * minute) return `昨天 ${new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  if (diff < 7 * 24 * 60 * minute) return `${Math.round(diff / (24 * 60 * minute))} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  // 个位也保留一位小数，但要去掉 ".0" 这种尾差，避免出现 "1.0 KB"
  const shown = value >= 100 || unit === 0 ? Math.round(value) : Number(value.toFixed(1))
  return `${shown} ${units[unit]}`
}

/** 把大数按可读性分组，如 1234567 → 1,234,567 */
export function groupDigits(input: string): string {
  const [intPart, ...rest] = input.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return [grouped, ...rest].join('.')
}

export function dirname(path: string): string {
  const idx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))
  // 没有分隔符时说明没有目录，返回空串而不是把文件名当目录
  if (idx > 0) return path.slice(0, idx)
  return idx === 0 ? path.slice(0, 1) : ''
}

export function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))
  return idx >= 0 ? path.slice(idx + 1) : path
}

/** 按名称生成稳定的渐变色，用于没有真实图标时的占位 */
const PALETTE = [
  ['#6366f1', '#8b5cf6'],
  ['#0ea5e9', '#6366f1'],
  ['#10b981', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
  ['#ec4899', '#8b5cf6'],
  ['#14b8a6', '#22d3ee'],
  ['#f43f5e', '#f59e0b'],
  ['#3b82f6', '#22d3ee']
]

export function gradientFor(seed: string): [string, string] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 100000
  return PALETTE[hash % PALETTE.length] as [string, string]
}

/** 取用于占位图标的字符：中文取首字，英文取首字母 */
export function initialFor(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const first = trimmed[0]
  return /[a-zA-Z]/.test(first) ? first.toUpperCase() : first
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
