/** 随机生成器 —— Lumen 插件示例 */
module.exports = {
  icon: '🎲',

  async search(ctx) {
    const arg = ctx.args.trim().toLowerCase()
    const copy = async (value) => {
      await ctx.api.clipboard.write(value)
      ctx.toast('已复制')
    }

    const uuid = () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })

    const password = (len = 16, symbols = true) => {
      const lower = 'abcdefghijkmnopqrstuvwxyz'
      const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
      const digits = '23456789'
      const marks = '!@#$%^&*_-+=?'
      const pool = lower + upper + digits + (symbols ? marks : '')
      const pick = (set) => set[Math.floor(Math.random() * set.length)]
      const chars = [pick(lower), pick(upper), pick(digits)]
      if (symbols) chars.push(pick(marks))
      while (chars.length < len) chars.push(pick(pool))
      // Fisher-Yates 打乱
      for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[chars[i], chars[j]] = [chars[j], chars[i]]
      }
      return chars.join('')
    }

    const uuids = [uuid(), uuid(), uuid()]
    const pw = password(16)

    const items = [
      {
        id: 'rand:uuid',
        title: uuids[0],
        subtitle: 'UUID v4',
        icon: '🆔',
        detail: { markdown: '```\n' + uuids.join('\n') + '\n```' },
        actions: [
          { id: 'copy', name: '复制这个 UUID', icon: '📋', run: () => copy(uuids[0]) },
          { id: 'copy3', name: '复制 3 个', icon: '📚', run: () => copy(uuids.join('\n')) }
        ]
      },
      {
        id: 'rand:password',
        title: pw,
        subtitle: '16 位强密码（含大小写/数字/符号）',
        icon: '🔑',
        actions: [{ id: 'copy', name: '复制密码', icon: '📋', run: () => copy(pw) }]
      },
      {
        id: 'rand:ts',
        title: String(Date.now()),
        subtitle: `毫秒时间戳 · ${new Date().toLocaleString('zh-CN')}`,
        icon: '⏱️',
        actions: [{ id: 'copy', name: '复制时间戳', icon: '📋', run: () => copy(String(Date.now())) }]
      }
    ]

    if (arg === 'uuid' || arg === 'guid') return [items[0]]
    if (arg === 'pw' || arg === 'password' || arg === '密码') return [items[1]]
    if (arg === 'ts' || arg === 'time' || arg === '时间戳') return [items[2]]
    return items
  }
}
