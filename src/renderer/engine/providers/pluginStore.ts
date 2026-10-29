import type { MarketPlugin, PluginInfo } from '@shared/types'
import { api } from '../../api'
import { emoji, textIcon, type Provider, type ResultItem } from '../types'
import { copyAction } from '../helpers'
import { reloadPlugin } from '../pluginRuntime'

function stateLabel(info?: PluginInfo): string {
  if (!info) return '未安装'
  return info.disabled ? '已禁用' : '已安装'
}

function build(entry: MarketPlugin, info: PluginInfo | undefined, dir: string): ResultItem {
  const installed = Boolean(info)
  const disabled = Boolean(info?.disabled)
  const trigger = (info?.aliases ?? entry.aliases ?? [entry.id])[0]

  return {
    id: `plugin:${entry.id}`,
    providerId: 'plugins',
    title: entry.name,
    subtitle: `${stateLabel(info)} · v${entry.version} · ${entry.author}${
      entry.tags?.length ? ` · ${entry.tags.join('/')}` : ''
    }`,
    icon: emoji(entry.icon || '🧩'),
    keywords: [entry.id, entry.author, ...(entry.tags ?? []), entry.description],
    usageKey: `pluginstore:${entry.id}`,
    detail: {
      hero: emoji(entry.icon || '🧩'),
      fields: [
        { label: '名称', value: entry.name },
        { label: '说明', value: entry.description },
        { label: '版本', value: `v${entry.version}` },
        { label: '作者', value: entry.author },
        { label: '来源', value: entry.source === 'remote' ? '远程下载' : '内置随程序分发' },
        { label: '触发词', value: trigger ?? '—' },
        { label: '状态', value: stateLabel(info) },
        { label: '插件目录', value: dir }
      ],
      footer: installed
        ? `输入 ${trigger} 直接使用 · Ctrl+D 卸载 · Ctrl+P 启停`
        : '回车安装 · 插件运行在受限环境里，看不到 Node 能力'
    },
    actions: [
      installed
        ? {
            id: 'run',
            name: `使用（输入 ${trigger} ）`,
            primary: true,
            icon: '🚀',
            run({ runQuery }: { runQuery: (q: string) => void }) {
              runQuery(`${trigger} `)
            }
          }
        : {
            id: 'install',
            name: '安装插件',
            primary: true,
            icon: '⬇️',
            async run({ toast, refresh }: { toast: (m: string) => void; refresh: () => void }) {
              try {
                const list = await api.plugins.install(entry.id)
                await reloadPlugin(list.find((p) => p.id === entry.id)!)
                toast(`已安装 ${entry.name}，输入 ${trigger} 即可使用`)
              } catch (error) {
                toast(`安装失败：${String(error)}`)
              }
              refresh()
            }
          },
      ...(installed
        ? [
            {
              id: 'toggle',
              name: disabled ? '启用插件' : '禁用插件',
              icon: disabled ? '▶️' : '⏸️',
              async run({ toast, refresh }: { toast: (m: string) => void; refresh: () => void }) {
                const list = await api.plugins.setDisabled(entry.id, !disabled)
                await reloadPlugin(list.find((p) => p.id === entry.id)!, !disabled ? false : true)
                toast(disabled ? `已启用 ${entry.name}` : `已禁用 ${entry.name}`)
                refresh()
              }
            },
            {
              id: 'uninstall',
              name: '卸载插件',
              icon: '🗑️',
              async run({ toast, refresh }: { toast: (m: string) => void; refresh: () => void }) {
                await api.plugins.uninstall(entry.id)
                await reloadPlugin({ ...entry, installed: false } as PluginInfo, true)
                toast(`已卸载 ${entry.name}`)
                refresh()
              }
            }
          ]
        : []),
      copyAction(() => entry.id)
    ]
  }
}

export const pluginStoreProvider: Provider = {
  id: 'plugins',
  name: '插件市场',
  description: '安装 / 卸载 / 启停扩展，内置 5 个开箱即用的插件',
  icon: emoji('🧩'),
  aliases: ['store', 'plugin', 'plugins', '插件', '市场', '扩展'],
  participatesInRoot: false,
  rank: 38,
  entry: true,

  async search(ctx) {
    let market: MarketPlugin[] = []
    let installed: PluginInfo[] = []
    let dir = ''
    try {
      ;[market, installed, dir] = await Promise.all([api.plugins.market(), api.plugins.installed(), api.plugins.dir()])
    } catch (error) {
      return [
        {
          id: 'plugins:error',
          providerId: 'plugins',
          title: '插件市场加载失败',
          subtitle: String(error),
          icon: textIcon('✕'),
          actions: []
        }
      ]
    }

    const byId = new Map(installed.map((p) => [p.id, p]))
    const query = ctx.args.trim().toLowerCase()
    const pool = query
      ? market.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.id.includes(query) ||
            p.description.toLowerCase().includes(query) ||
            (p.tags ?? []).some((t) => t.toLowerCase().includes(query))
        )
      : market

    if (!pool.length) {
      return [
        {
          id: 'plugins:empty',
          providerId: 'plugins',
          title: `没有匹配「${ctx.args.trim()}」的插件`,
          subtitle: `市场共 ${market.length} 个插件`,
          icon: textIcon('∅'),
          actions: []
        }
      ]
    }

    // 已安装的排前面，未安装的按 rank
    const ordered = [...pool].sort((a, b) => {
      const ai = byId.has(a.id) ? 0 : 1
      const bi = byId.has(b.id) ? 0 : 1
      return ai - bi || (a.rank ?? 60) - (b.rank ?? 60)
    })

    return ordered.map((entry) => build(entry, byId.get(entry.id), dir))
  }
}
