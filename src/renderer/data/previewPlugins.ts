/**
 * 自动生成，请勿手改 —— 由 scripts/gen-preview-plugins.mjs 从 resources/plugins 生成。
 * 浏览器预览模式下用它代替主进程读取本地插件目录。
 */
import type { PluginInfo } from '@shared/types'

export interface PreviewPlugin {
  /** plugin.json 原文（安装后才会有 installed 字段） */
  info: Omit<PluginInfo, 'installed'>
  code: string
}

export const PREVIEW_PLUGINS: Record<string, PreviewPlugin> = {
  "base64": {
    info: {
      "id": "base64",
      "name": "Base64 编解码",
      "version": "1.0.0",
      "author": "Lumen",
      "description": "文本 ↔ Base64 互转，支持 URL 安全变体",
      "icon": "🔐",
      "aliases": [
        "b64",
        "base64",
        "编码"
      ],
      "participatesInRoot": false,
      "rank": 61,
      "main": "index.js"
    },
    code: "/** Base64 编解码 —— Lumen 插件示例 */\nmodule.exports = {\n  icon: '🔐',\n\n  async search(ctx) {\n    const raw = ctx.args.trim()\n    const input = raw || (await ctx.api.clipboard.readText()).trim()\n    if (!input) {\n      return [{ id: 'b64:tip', title: '输入要编码/解码的内容', subtitle: '例如：b64 hello', icon: '🔐', actions: [] }]\n    }\n\n    const copy = async (value) => {\n      await ctx.api.clipboard.write(value)\n      ctx.toast('已复制')\n    }\n\n    // 判定：符合 base64 字符集且长度是 4 的倍数 → 优先按解码展示\n    const looksEncoded = /^[A-Za-z0-9+/=_-]+$/.test(input) && input.length % 4 === 0 && input.length >= 4\n\n    const encoded = b64encode(input)\n    const urlSafe = encoded.replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '')\n\n    const items = [\n      {\n        id: 'b64:encode',\n        title: `编码：${encoded.slice(0, 60)}${encoded.length > 60 ? '…' : ''}`,\n        subtitle: `Base64 · ${encoded.length} 字符`,\n        icon: '🔒',\n        detail: { markdown: '```\\n' + encoded + '\\n```' },\n        actions: [{ id: 'copy', name: '复制编码结果', icon: '📋', run: () => copy(encoded) }]\n      },\n      {\n        id: 'b64:url',\n        title: `URL 安全编码：${urlSafe.slice(0, 60)}${urlSafe.length > 60 ? '…' : ''}`,\n        subtitle: '适合放进 URL / 文件名',\n        icon: '🔗',\n        detail: { markdown: '```\\n' + urlSafe + '\\n```' },\n        actions: [{ id: 'copy', name: '复制', icon: '📋', run: () => copy(urlSafe) }]\n      }\n    ]\n\n    if (looksEncoded) {\n      let decoded = ''\n      try {\n        decoded = b64decode(input)\n      } catch {\n        decoded = ''\n      }\n      if (decoded) {\n        items.unshift({\n          id: 'b64:decode',\n          title: `解码：${decoded.slice(0, 60)}${decoded.length > 60 ? '…' : ''}`,\n          subtitle: 'Base64 → 原文',\n          icon: '🔓',\n          detail: { markdown: '```\\n' + decoded.slice(0, 4000) + '\\n```' },\n          actions: [{ id: 'copy', name: '复制解码结果', icon: '📋', run: () => copy(decoded) }]\n        })\n      }\n    }\n\n    return items\n  }\n}\n\nfunction b64encode(text) {\n  // 先按 UTF-8 字节处理，避免中文乱码\n  const bytes = new TextEncoder().encode(text)\n  let binary = ''\n  for (const b of bytes) binary += String.fromCharCode(b)\n  return btoa(binary)\n}\n\nfunction b64decode(text) {\n  const padded = text.replace(/-/g, '+').replace(/_/g, '/')\n  const binary = atob(padded)\n  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))\n  return new TextDecoder().decode(bytes)\n}\n"
  },
  "color": {
    info: {
      "id": "color",
      "name": "颜色转换",
      "version": "1.0.0",
      "author": "Lumen",
      "description": "HEX / RGB / HSL 互转，并给出对比度建议",
      "icon": "🎨",
      "aliases": [
        "color",
        "hex",
        "颜色",
        "色值"
      ],
      "participatesInRoot": false,
      "rank": 63,
      "main": "index.js"
    },
    code: "/** 颜色转换 —— Lumen 插件示例 */\nmodule.exports = {\n  icon: '🎨',\n\n  async search(ctx) {\n    const raw = ctx.args.trim()\n    const input = raw || (await ctx.api.clipboard.readText()).trim()\n    if (!input) {\n      return [\n        { id: 'color:tip', title: '输入一个颜色值', subtitle: '支持 #f60 / #ff6600 / rgb(255,102,0)', icon: '🎨', actions: [] }\n      ]\n    }\n\n    const rgb = parse(input)\n    if (!rgb) {\n      return [{ id: 'color:bad', title: '没能识别这个颜色', subtitle: input.slice(0, 40), icon: '❌', actions: [] }]\n    }\n\n    const hex = '#' + [rgb[0], rgb[1], rgb[2]].map((v) => v.toString(16).padStart(2, '0')).join('')\n    const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2])\n    const copy = async (value) => {\n      await ctx.api.clipboard.write(value)\n      ctx.toast('已复制')\n    }\n\n    return [\n      {\n        id: 'color:hex',\n        title: hex.toUpperCase(),\n        subtitle: 'HEX',\n        icon: '🎨',\n        detail: { markdown: `\\`\\`\\`\\nHEX  ${hex.toUpperCase()}\\nRGB  rgb(${rgb.join(', ')})\\nHSL  hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)\\n\\`\\`\\`` },\n        actions: [{ id: 'copy', name: '复制 HEX', icon: '📋', run: () => copy(hex.toUpperCase()) }]\n      },\n      {\n        id: 'color:rgb',\n        title: `rgb(${rgb.join(', ')})`,\n        subtitle: 'RGB',\n        icon: '🟥',\n        actions: [{ id: 'copy', name: '复制 RGB', icon: '📋', run: () => copy(`rgb(${rgb.join(', ')})`) }]\n      },\n      {\n        id: 'color:hsl',\n        title: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,\n        subtitle: 'HSL',\n        icon: '🌈',\n        actions: [{ id: 'copy', name: '复制 HSL', icon: '📋', run: () => copy(`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`) }]\n      },\n      {\n        id: 'color:contrast',\n        title: luminance(rgb) > 0.5 ? '建议搭配深色文字' : '建议搭配浅色文字',\n        subtitle: `相对亮度 ${luminance(rgb).toFixed(2)}`,\n        icon: '◐',\n        actions: []\n      }\n    ]\n  }\n}\n\nfunction parse(text) {\n  const s = text.trim().toLowerCase()\n  let m = s.match(/^#?([0-9a-f]{3})$/)\n  if (m) return [m[1][0] + m[1][0], m[1][1] + m[1][1], m[1][2] + m[1][2]].map((h) => parseInt(h, 16))\n  m = s.match(/^#?([0-9a-f]{6})$/)\n  if (m) return [m[1].slice(0, 2), m[1].slice(2, 4), m[1].slice(4, 6)].map((h) => parseInt(h, 16))\n  m = s.match(/^rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/)\n  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]\n  return null\n}\n\nfunction rgbToHsl(r, g, b) {\n  const rn = r / 255\n  const gn = g / 255\n  const bn = b / 255\n  const max = Math.max(rn, gn, bn)\n  const min = Math.min(rn, gn, bn)\n  const l = (max + min) / 2\n  const d = max - min\n  if (!d) return [0, 0, Math.round(l * 100)]\n  const s = d / (1 - Math.abs(2 * l - 1))\n  let h\n  if (max === rn) h = ((gn - bn) / d) % 6\n  else if (max === gn) h = (bn - rn) / d + 2\n  else h = (rn - gn) / d + 4\n  return [Math.round(((h * 60) + 360) % 360), Math.round(s * 100), Math.round(l * 100)]\n}\n\nfunction luminance([r, g, b]) {\n  const f = (v) => {\n    const c = v / 255\n    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)\n  }\n  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)\n}\n"
  },
  "json-tools": {
    info: {
      "id": "json-tools",
      "name": "JSON 工具箱",
      "version": "1.0.0",
      "author": "Lumen",
      "description": "格式化 / 压缩 / 校验 JSON，并直接复制到剪贴板",
      "icon": "🧰",
      "aliases": [
        "json",
        "jsonformat"
      ],
      "participatesInRoot": false,
      "rank": 60,
      "main": "index.js"
    },
    code: "/**\n * JSON 工具箱 —— Lumen 插件示例\n *\n * 插件导出一个对象，核心是 search(ctx)：\n *   ctx.args    触发词后面的输入\n *   ctx.api     主进程能力（剪贴板、文件、系统…）\n *   ctx.toast   右上角提示\n *   ctx.close   关闭启动器\n * 返回一组结果项即可。\n */\nmodule.exports = {\n  icon: '🧰',\n\n  async search(ctx) {\n    const raw = ctx.args.trim()\n    const text = raw || (await ctx.api.clipboard.readText()).trim()\n\n    if (!text) {\n      return [\n        {\n          id: 'json:tip',\n          title: '粘贴一段 JSON 或直接在后面输入',\n          subtitle: '例如：json {\"a\":1,\"b\":[2,3]}',\n          icon: '🧰',\n          actions: []\n        }\n      ]\n    }\n\n    let parsed = null\n    let error = ''\n    try {\n      parsed = JSON.parse(text)\n    } catch (e) {\n      error = String(e && e.message ? e.message : e)\n    }\n\n    if (error) {\n      return [\n        {\n          id: 'json:invalid',\n          title: 'JSON 解析失败',\n          subtitle: error,\n          icon: '❌',\n          actions: []\n        }\n      ]\n    }\n\n    const pretty = JSON.stringify(parsed, null, 2)\n    const minified = JSON.stringify(parsed)\n    const keys = Object.keys(parsed && typeof parsed === 'object' ? parsed : {})\n\n    const copy = async (value) => {\n      await ctx.api.clipboard.write(value)\n      ctx.toast('已复制到剪贴板')\n    }\n\n    return [\n      {\n        id: 'json:format',\n        title: '格式化（缩进 2 空格）',\n        subtitle: `${pretty.length} 字符 · ${keys.length ? keys.length + ' 个顶层键' : typeof parsed}`,\n        icon: '🧰',\n        detail: { markdown: '```json\\n' + pretty.slice(0, 4000) + '\\n```' },\n        actions: [{ id: 'copy', name: '复制格式化结果', icon: '📋', run: () => copy(pretty) }]\n      },\n      {\n        id: 'json:minify',\n        title: '压缩为一行',\n        subtitle: `${minified.length} 字符（省了 ${pretty.length - minified.length} 个）`,\n        icon: '🗜️',\n        detail: { markdown: '```json\\n' + minified.slice(0, 4000) + '\\n```' },\n        actions: [{ id: 'copy', name: '复制压缩结果', icon: '📋', run: () => copy(minified) }]\n      },\n      {\n        id: 'json:valid',\n        title: '✅ 语法校验通过',\n        subtitle: `类型：${Array.isArray(parsed) ? '数组' : typeof parsed}`,\n        icon: '✅',\n        actions: []\n      }\n    ]\n  }\n}\n"
  },
  "todo": {
    info: {
      "id": "todo",
      "name": "轻量待办",
      "version": "1.0.0",
      "author": "Lumen",
      "description": "插件也能持久化数据：随时记一条待办，完成后打勾或删除",
      "icon": "✅",
      "aliases": [
        "todo",
        "待办",
        "任务"
      ],
      "participatesInRoot": false,
      "rank": 64,
      "main": "index.js"
    },
    code: "/**\n * 轻量待办 —— Lumen 插件示例（演示持久化存储）\n *\n * ctx.api.storage 是插件专用的键值存储，数据落在 userData/plugin-store.json，\n * 重启后依然在。键名建议用 `插件id.xxx` 避免和其他插件撞车。\n */\nconst KEY = 'todo.items'\n\nmodule.exports = {\n  icon: '✅',\n\n  async search(ctx) {\n    const list = (await ctx.api.storage.get(KEY)) || []\n    const arg = ctx.args.trim()\n\n    const save = async (items) => {\n      await ctx.api.storage.set(KEY, items)\n      ctx.refresh()\n    }\n\n    const items = [\n      {\n        id: 'todo:add',\n        title: arg ? `添加待办：${arg}` : '添加一条待办（在触发词后直接写内容）',\n        subtitle: arg ? '回车即写入，数据保存在本机' : '例如：todo 周五前交周报',\n        icon: '➕',\n        actions: arg\n          ? [\n              {\n                id: 'add',\n                name: '添加',\n                icon: '✅',\n                run: async () => {\n                  await save([{ id: String(Date.now()), text: arg, done: false, at: Date.now() }, ...list])\n                  ctx.toast('已添加')\n                }\n              }\n            ]\n          : []\n      },\n      ...list.map((item) => ({\n        id: 'todo:' + item.id,\n        title: (item.done ? '✅ ' : '⬜ ') + item.text,\n        subtitle: new Date(item.at).toLocaleString('zh-CN'),\n        icon: item.done ? '✅' : '⬜',\n        actions: [\n          {\n            id: 'toggle',\n            name: item.done ? '标记为未完成' : '标记完成',\n            icon: '🔄',\n            run: () => save(list.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))\n          },\n          {\n            id: 'remove',\n            name: '删除',\n            icon: '🗑️',\n            run: async () => {\n              await save(list.filter((i) => i.id !== item.id))\n              ctx.toast('已删除')\n            }\n          }\n        ]\n      }))\n    ]\n\n    if (list.length) {\n      items.push({\n        id: 'todo:clear-done',\n        title: '清除已完成',\n        subtitle: `共 ${list.filter((i) => i.done).length} 条`,\n        icon: '🧹',\n        actions: [{ id: 'clear', name: '清除', icon: '🧹', run: () => save(list.filter((i) => !i.done)) }]\n      })\n    }\n\n    return items\n  }\n}\n"
  },
  "uuid": {
    info: {
      "id": "uuid",
      "name": "随机生成器",
      "version": "1.0.0",
      "author": "Lumen",
      "description": "生成 UUID v4 / 随机密码 / 时间戳",
      "icon": "🎲",
      "aliases": [
        "uuid",
        "guid",
        "rand",
        "随机"
      ],
      "participatesInRoot": false,
      "rank": 62,
      "main": "index.js"
    },
    code: "/** 随机生成器 —— Lumen 插件示例 */\nmodule.exports = {\n  icon: '🎲',\n\n  async search(ctx) {\n    const arg = ctx.args.trim().toLowerCase()\n    const copy = async (value) => {\n      await ctx.api.clipboard.write(value)\n      ctx.toast('已复制')\n    }\n\n    const uuid = () =>\n      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {\n        const r = (Math.random() * 16) | 0\n        const v = c === 'x' ? r : (r & 0x3) | 0x8\n        return v.toString(16)\n      })\n\n    const password = (len = 16, symbols = true) => {\n      const lower = 'abcdefghijkmnopqrstuvwxyz'\n      const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'\n      const digits = '23456789'\n      const marks = '!@#$%^&*_-+=?'\n      const pool = lower + upper + digits + (symbols ? marks : '')\n      const pick = (set) => set[Math.floor(Math.random() * set.length)]\n      const chars = [pick(lower), pick(upper), pick(digits)]\n      if (symbols) chars.push(pick(marks))\n      while (chars.length < len) chars.push(pick(pool))\n      // Fisher-Yates 打乱\n      for (let i = chars.length - 1; i > 0; i--) {\n        const j = Math.floor(Math.random() * (i + 1))\n        ;[chars[i], chars[j]] = [chars[j], chars[i]]\n      }\n      return chars.join('')\n    }\n\n    const uuids = [uuid(), uuid(), uuid()]\n    const pw = password(16)\n\n    const items = [\n      {\n        id: 'rand:uuid',\n        title: uuids[0],\n        subtitle: 'UUID v4',\n        icon: '🆔',\n        detail: { markdown: '```\\n' + uuids.join('\\n') + '\\n```' },\n        actions: [\n          { id: 'copy', name: '复制这个 UUID', icon: '📋', run: () => copy(uuids[0]) },\n          { id: 'copy3', name: '复制 3 个', icon: '📚', run: () => copy(uuids.join('\\n')) }\n        ]\n      },\n      {\n        id: 'rand:password',\n        title: pw,\n        subtitle: '16 位强密码（含大小写/数字/符号）',\n        icon: '🔑',\n        actions: [{ id: 'copy', name: '复制密码', icon: '📋', run: () => copy(pw) }]\n      },\n      {\n        id: 'rand:ts',\n        title: String(Date.now()),\n        subtitle: `毫秒时间戳 · ${new Date().toLocaleString('zh-CN')}`,\n        icon: '⏱️',\n        actions: [{ id: 'copy', name: '复制时间戳', icon: '📋', run: () => copy(String(Date.now())) }]\n      }\n    ]\n\n    if (arg === 'uuid' || arg === 'guid') return [items[0]]\n    if (arg === 'pw' || arg === 'password' || arg === '密码') return [items[1]]\n    if (arg === 'ts' || arg === 'time' || arg === '时间戳') return [items[2]]\n    return items\n  }\n}\n"
  }
}
