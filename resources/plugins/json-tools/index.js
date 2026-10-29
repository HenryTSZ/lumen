/**
 * JSON 工具箱 —— Lumen 插件示例
 *
 * 插件导出一个对象，核心是 search(ctx)：
 *   ctx.args    触发词后面的输入
 *   ctx.api     主进程能力（剪贴板、文件、系统…）
 *   ctx.toast   右上角提示
 *   ctx.close   关闭启动器
 * 返回一组结果项即可。
 */
module.exports = {
  icon: '🧰',

  async search(ctx) {
    const raw = ctx.args.trim()
    const text = raw || (await ctx.api.clipboard.readText()).trim()

    if (!text) {
      return [
        {
          id: 'json:tip',
          title: '粘贴一段 JSON 或直接在后面输入',
          subtitle: '例如：json {"a":1,"b":[2,3]}',
          icon: '🧰',
          actions: []
        }
      ]
    }

    let parsed = null
    let error = ''
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      error = String(e && e.message ? e.message : e)
    }

    if (error) {
      return [
        {
          id: 'json:invalid',
          title: 'JSON 解析失败',
          subtitle: error,
          icon: '❌',
          actions: []
        }
      ]
    }

    const pretty = JSON.stringify(parsed, null, 2)
    const minified = JSON.stringify(parsed)
    const keys = Object.keys(parsed && typeof parsed === 'object' ? parsed : {})

    const copy = async (value) => {
      await ctx.api.clipboard.write(value)
      ctx.toast('已复制到剪贴板')
    }

    return [
      {
        id: 'json:format',
        title: '格式化（缩进 2 空格）',
        subtitle: `${pretty.length} 字符 · ${keys.length ? keys.length + ' 个顶层键' : typeof parsed}`,
        icon: '🧰',
        detail: { markdown: '```json\n' + pretty.slice(0, 4000) + '\n```' },
        actions: [{ id: 'copy', name: '复制格式化结果', icon: '📋', run: () => copy(pretty) }]
      },
      {
        id: 'json:minify',
        title: '压缩为一行',
        subtitle: `${minified.length} 字符（省了 ${pretty.length - minified.length} 个）`,
        icon: '🗜️',
        detail: { markdown: '```json\n' + minified.slice(0, 4000) + '\n```' },
        actions: [{ id: 'copy', name: '复制压缩结果', icon: '📋', run: () => copy(minified) }]
      },
      {
        id: 'json:valid',
        title: '✅ 语法校验通过',
        subtitle: `类型：${Array.isArray(parsed) ? '数组' : typeof parsed}`,
        icon: '✅',
        actions: []
      }
    ]
  }
}
