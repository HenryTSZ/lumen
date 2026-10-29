/** 颜色转换 —— Lumen 插件示例 */
module.exports = {
  icon: '🎨',

  async search(ctx) {
    const raw = ctx.args.trim()
    const input = raw || (await ctx.api.clipboard.readText()).trim()
    if (!input) {
      return [
        { id: 'color:tip', title: '输入一个颜色值', subtitle: '支持 #f60 / #ff6600 / rgb(255,102,0)', icon: '🎨', actions: [] }
      ]
    }

    const rgb = parse(input)
    if (!rgb) {
      return [{ id: 'color:bad', title: '没能识别这个颜色', subtitle: input.slice(0, 40), icon: '❌', actions: [] }]
    }

    const hex = '#' + [rgb[0], rgb[1], rgb[2]].map((v) => v.toString(16).padStart(2, '0')).join('')
    const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2])
    const copy = async (value) => {
      await ctx.api.clipboard.write(value)
      ctx.toast('已复制')
    }

    return [
      {
        id: 'color:hex',
        title: hex.toUpperCase(),
        subtitle: 'HEX',
        icon: '🎨',
        detail: { markdown: `\`\`\`\nHEX  ${hex.toUpperCase()}\nRGB  rgb(${rgb.join(', ')})\nHSL  hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)\n\`\`\`` },
        actions: [{ id: 'copy', name: '复制 HEX', icon: '📋', run: () => copy(hex.toUpperCase()) }]
      },
      {
        id: 'color:rgb',
        title: `rgb(${rgb.join(', ')})`,
        subtitle: 'RGB',
        icon: '🟥',
        actions: [{ id: 'copy', name: '复制 RGB', icon: '📋', run: () => copy(`rgb(${rgb.join(', ')})`) }]
      },
      {
        id: 'color:hsl',
        title: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
        subtitle: 'HSL',
        icon: '🌈',
        actions: [{ id: 'copy', name: '复制 HSL', icon: '📋', run: () => copy(`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`) }]
      },
      {
        id: 'color:contrast',
        title: luminance(rgb) > 0.5 ? '建议搭配深色文字' : '建议搭配浅色文字',
        subtitle: `相对亮度 ${luminance(rgb).toFixed(2)}`,
        icon: '◐',
        actions: []
      }
    ]
  }
}

function parse(text) {
  const s = text.trim().toLowerCase()
  let m = s.match(/^#?([0-9a-f]{3})$/)
  if (m) return [m[1][0] + m[1][0], m[1][1] + m[1][1], m[1][2] + m[1][2]].map((h) => parseInt(h, 16))
  m = s.match(/^#?([0-9a-f]{6})$/)
  if (m) return [m[1].slice(0, 2), m[1].slice(2, 4), m[1].slice(4, 6)].map((h) => parseInt(h, 16))
  m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  return null
}

function rgbToHsl(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (!d) return [0, 0, Math.round(l * 100)]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [Math.round(((h * 60) + 360) % 360), Math.round(s * 100), Math.round(l * 100)]
}

function luminance([r, g, b]) {
  const f = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
