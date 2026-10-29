import type { AppInfo } from '@shared/types'
import { api } from '../../api'
import { iconStore } from '../icons'
import { rankBy } from '../fuzzy'
import { MOD, copyAction, pinAction, revealAction } from '../helpers'
import { initialFor } from '../utils'
import { dataIcon, emoji, textIcon, type Provider, type ResultItem, type SearchContext } from '../types'
import { usageBoost } from '../usage'

let apps: AppInfo[] = []
let lastLoad = 0
let inflight: Promise<AppInfo[]> | null = null

const usageKeyOf = (app: AppInfo): string => `apps:${app.appId || app.path}`

async function ensureApps(force = false): Promise<AppInfo[]> {
  const fresh = apps.length > 0 && Date.now() - lastLoad < 5 * 60_000
  if (!force && fresh) return apps
  if (inflight && !force) return inflight

  inflight = api.apps
    .list()
    .then((list) => {
      apps = list
      lastLoad = Date.now()
      return list
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

const SOURCE_LABEL: Record<AppInfo['source'], string> = {
  startmenu: '开始菜单',
  registry: '注册表',
  uwp: 'UWP 应用'
}

function build(app: AppInfo, ctx: SearchContext): ResultItem {
  const target = app.appId || app.path
  const isUwp = app.source === 'uwp'

  // 图标按需懒加载：先给出占位，主进程取到系统图标后由 iconStore 通知重渲染
  iconStore.prefetch(target, () => api.apps.icon(target))
  const cached = iconStore.get(target)
  const icon = cached ? dataIcon(cached) : textIcon(initialFor(app.name))

  return {
    id: `app:${app.id}`,
    providerId: 'apps',
    title: app.name,
    subtitle: isUwp ? 'Windows 商店应用' : app.path,
    icon,
    keywords: [app.name, app.path, app.appId ?? ''].filter(Boolean),
    usageKey: usageKeyOf(app),
    detail: {
      hero: icon,
      fields: [
        { label: '名称', value: app.name },
        { label: '来源', value: SOURCE_LABEL[app.source] },
        { label: '可执行文件', value: app.path || '—' },
        { label: 'App ID', value: app.appId || '—' }
      ]
    },
    actions: [
      {
        id: 'open',
        name: '打开',
        primary: true,
        shortcut: ['↵'],
        async run({ close }) {
          close()
          await api.apps.open(target, isUwp)
        }
      },
      {
        id: 'runas',
        name: '以管理员身份运行',
        shortcut: [MOD, 'A'],
        icon: '🛡️',
        async run({ close, api: bridge, toast }) {
          if (isUwp) {
            toast('UWP 应用不支持管理员运行')
            return
          }
          close()
          await bridge.shell.run(
            `powershell -NoProfile -Command "Start-Process -FilePath '${
              app.path.replace(/'/g, "''")
            }' -Verb RunAs"`
          )
        }
      },
      ...(app.path ? [revealAction(() => app.path)] : []),
      copyAction(() => target),
      pinAction(() => usageKeyOf(app))
    ]
  }
}

export const applicationsProvider: Provider = {
  id: 'apps',
  name: '应用',
  description: '搜索并启动本机已安装的程序',
  icon: emoji('🚀'),
  aliases: ['app', 'apps', '应用', '打开', 'run'],
  participatesInRoot: true,
  rank: 10,
  entry: true,

  async search(ctx) {
    const list = await ensureApps()
    const query = (ctx.args || ctx.query).trim()

    // 空查询：按使用频率推荐最常启动的若干个，而不是固定前几个
    if (!query) {
      return list
        .map((item) => ({ item, boost: usageBoost(usageKeyOf(item)) }))
        .sort((a, b) => b.boost - a.boost || a.item.name.localeCompare(b.item.name))
        .slice(0, 10)
        .map(({ item, boost }) => ({ ...build(item, ctx), score: 400 + boost }))
    }

    return rankBy(list, query, (app) => [app.name, app.path, app.appId])
      .slice(0, ctx.settings.resultLimit)
      .map(({ item, ranges, score }) => ({ ...build(item, ctx), ranges, score }))
  }
}

export function refreshApplications(): Promise<AppInfo[]> {
  return ensureApps(true)
}
