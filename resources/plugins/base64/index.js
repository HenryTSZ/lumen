/** Base64 编解码 —— Lumen 插件示例 */
module.exports = {
  icon: '🔐',

  async search(ctx) {
    const raw = ctx.args.trim()
    const input = raw || (await ctx.api.clipboard.readText()).trim()
    if (!input) {
      return [{ id: 'b64:tip', title: '输入要编码/解码的内容', subtitle: '例如：b64 hello', icon: '🔐', actions: [] }]
    }

    const copy = async (value) => {
      await ctx.api.clipboard.write(value)
      ctx.toast('已复制')
    }

    // 判定：符合 base64 字符集且长度是 4 的倍数 → 优先按解码展示
    const looksEncoded = /^[A-Za-z0-9+/=_-]+$/.test(input) && input.length % 4 === 0 && input.length >= 4

    const encoded = b64encode(input)
    const urlSafe = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const items = [
      {
        id: 'b64:encode',
        title: `编码：${encoded.slice(0, 60)}${encoded.length > 60 ? '…' : ''}`,
        subtitle: `Base64 · ${encoded.length} 字符`,
        icon: '🔒',
        detail: { markdown: '```\n' + encoded + '\n```' },
        actions: [{ id: 'copy', name: '复制编码结果', icon: '📋', run: () => copy(encoded) }]
      },
      {
        id: 'b64:url',
        title: `URL 安全编码：${urlSafe.slice(0, 60)}${urlSafe.length > 60 ? '…' : ''}`,
        subtitle: '适合放进 URL / 文件名',
        icon: '🔗',
        detail: { markdown: '```\n' + urlSafe + '\n```' },
        actions: [{ id: 'copy', name: '复制', icon: '📋', run: () => copy(urlSafe) }]
      }
    ]

    if (looksEncoded) {
      let decoded = ''
      try {
        decoded = b64decode(input)
      } catch {
        decoded = ''
      }
      if (decoded) {
        items.unshift({
          id: 'b64:decode',
          title: `解码：${decoded.slice(0, 60)}${decoded.length > 60 ? '…' : ''}`,
          subtitle: 'Base64 → 原文',
          icon: '🔓',
          detail: { markdown: '```\n' + decoded.slice(0, 4000) + '\n```' },
          actions: [{ id: 'copy', name: '复制解码结果', icon: '📋', run: () => copy(decoded) }]
        })
      }
    }

    return items
  }
}

function b64encode(text) {
  // 先按 UTF-8 字节处理，避免中文乱码
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function b64decode(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
