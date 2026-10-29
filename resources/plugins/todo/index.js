/**
 * 轻量待办 —— Lumen 插件示例（演示持久化存储）
 *
 * ctx.api.storage 是插件专用的键值存储，数据落在 userData/plugin-store.json，
 * 重启后依然在。键名建议用 `插件id.xxx` 避免和其他插件撞车。
 */
const KEY = 'todo.items'

module.exports = {
  icon: '✅',

  async search(ctx) {
    const list = (await ctx.api.storage.get(KEY)) || []
    const arg = ctx.args.trim()

    const save = async (items) => {
      await ctx.api.storage.set(KEY, items)
      ctx.refresh()
    }

    const items = [
      {
        id: 'todo:add',
        title: arg ? `添加待办：${arg}` : '添加一条待办（在触发词后直接写内容）',
        subtitle: arg ? '回车即写入，数据保存在本机' : '例如：todo 周五前交周报',
        icon: '➕',
        actions: arg
          ? [
              {
                id: 'add',
                name: '添加',
                icon: '✅',
                run: async () => {
                  await save([{ id: String(Date.now()), text: arg, done: false, at: Date.now() }, ...list])
                  ctx.toast('已添加')
                }
              }
            ]
          : []
      },
      ...list.map((item) => ({
        id: 'todo:' + item.id,
        title: (item.done ? '✅ ' : '⬜ ') + item.text,
        subtitle: new Date(item.at).toLocaleString('zh-CN'),
        icon: item.done ? '✅' : '⬜',
        actions: [
          {
            id: 'toggle',
            name: item.done ? '标记为未完成' : '标记完成',
            icon: '🔄',
            run: () => save(list.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
          },
          {
            id: 'remove',
            name: '删除',
            icon: '🗑️',
            run: async () => {
              await save(list.filter((i) => i.id !== item.id))
              ctx.toast('已删除')
            }
          }
        ]
      }))
    ]

    if (list.length) {
      items.push({
        id: 'todo:clear-done',
        title: '清除已完成',
        subtitle: `共 ${list.filter((i) => i.done).length} 条`,
        icon: '🧹',
        actions: [{ id: 'clear', name: '清除', icon: '🧹', run: () => save(list.filter((i) => !i.done)) }]
      })
    }

    return items
  }
}
