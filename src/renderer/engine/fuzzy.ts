import PinyinMatch from 'pinyin-match'

export interface MatchResult {
  score: number
  /** 命中区间，用于结果里高亮显示 */
  ranges: Array<[number, number]>
}

/**
 * 统一匹配的打分规则（分数越高越靠前）：
 *   1000 完全一致
 *   900  前缀命中
 *   700  连续子串命中（越靠前分越高）
 *   500  拼音首字母 / 拼音全拼命中
 *   300+ 非连续散点命中（子序列）
 */
export function match(query: string, target: string): MatchResult | null {
  if (!query) return { score: 1, ranges: [] }
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  if (t === q) return { score: 1000, ranges: [[0, target.length - 1]] }
  if (t.startsWith(q)) return { score: 900 - target.length, ranges: [[0, q.length - 1]] }

  const idx = t.indexOf(q)
  if (idx >= 0) {
    return { score: 700 - idx * 3 - Math.min(target.length, 60), ranges: [[idx, idx + q.length - 1]] }
  }

  // 拼音命中：支持「wps」命中「WPS Office」，也支持「weiruan」命中「微软 Edge」
  const py = PinyinMatch.match(target, query)
  if (py) {
    return { score: 560 - Math.min(py[0], 40), ranges: [[py[0], py[1]]] }
  }

  // 子序列散点命中
  const ranges = subsequence(t, q)
  if (ranges) return { score: 320 - ranges.length * 4, ranges }

  return null
}

function subsequence(target: string, query: string): Array<[number, number]> | null {
  const ranges: Array<[number, number]> = []
  let ti = 0
  for (const ch of query) {
    const found = target.indexOf(ch, ti)
    if (found < 0) return null
    if (ranges.length && ranges[ranges.length - 1][1] === found - 1) {
      ranges[ranges.length - 1][1] = found
    } else {
      ranges.push([found, found])
    }
    ti = found + 1
  }
  return ranges
}

/** 对一组候选做批量匹配并排序 */
export function rankBy<T>(
  items: T[],
  query: string,
  getFields: (item: T) => Array<string | undefined>
): Array<{ item: T; score: number; ranges: Array<[number, number]> }> {
  const scored: Array<{ item: T; score: number; ranges: Array<[number, number]> }> = []

  for (const item of items) {
    const fields = getFields(item).filter(Boolean) as string[]
    let best: MatchResult | null = null
    for (let i = 0; i < fields.length; i++) {
      const result = match(query, fields[i])
      if (!result) continue
      // 命中标题(idx 0)比命中副标题/关键词更有价值
      const weighted = { score: result.score - i * 40, ranges: i === 0 ? result.ranges : [] }
      if (!best || weighted.score > best.score) best = weighted
    }
    if (best) scored.push({ item, score: best.score, ranges: best.ranges })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored
}
