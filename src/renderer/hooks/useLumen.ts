import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { AppSettings } from '@shared/types'
import { api } from '../api'
import { iconStore } from '../engine/icons'
import { PROVIDERS, resolve, rootProviders } from '../engine/registry'
import { loadPlugins } from '../engine/pluginRuntime'
import type { Group, Screen } from '../engine/types.internal'
import type { FormSpec, IconSpec, PushOptions, ResultItem, SearchContext } from '../engine/types'
import { loadUsage, recordUsage, usageBoost } from '../engine/usage'
import { localeFromSettings, setLocale, t } from '../i18n'
import { providerLabel } from '../engine/providerLabels'

const ROOT_TITLE = 'Lumen'
const MAX_ROOT_PER_GROUP = 4

/** 单个结果的综合权重：模糊匹配分 + 使用频率加权 */
function weightOf(item: ResultItem): number {
  return (item.score ?? 0) + usageBoost(item.usageKey)
}

/** 扩展的默认排位：数值越小越靠前 */
function rankOf(providerId: string): number {
  if (providerId === 'entries') return 9999
  return PROVIDERS.find((provider) => provider.id === providerId)?.rank ?? 900
}

/** 短输入给手指留点缓冲，长输入要跟手 */
function debounceFor(input: string): number {
  if (!input) return 0
  return input.length <= 2 ? 140 : 90
}

export function useLumen() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  // 语言要在渲染前同步好，t() 才能取到当次渲染的文案
  setLocale(localeFromSettings(settings))
  const [query, setQuery] = useState('')
  const [stack, setStack] = useState<Screen[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null)
  /** 使用频率数据是否已就绪，就绪后才允许按习惯重排结果 */
  const [booted, setBooted] = useState(false)
  /** 插件加载完成计数，变化后重新搜索一次，让插件结果出现在列表里 */
  const [pluginsReady, setPluginsReady] = useState(0)

  const searchId = useRef(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const queryRef = useRef('')
  queryRef.current = query
  const stackRef = useRef<Screen[]>([])
  stackRef.current = stack
  const settingsRef = useRef<AppSettings | null>(null)
  settingsRef.current = settings

  // 应用图标是异步从主进程取的，到位后触发重渲染
  useSyncExternalStore(iconStore.subscribe, iconStore.getSnapshot)

  /* ---------------- 生命周期 ---------------- */
  useEffect(() => {
    let alive = true
    void loadUsage().then(() => {
      if (alive) setBooted(true)
    })
    // 插件加载失败不应该影响内置功能，所以单独 catch
    void loadPlugins()
      .catch(() => [])
      .then(() => {
        if (alive) setPluginsReady((n) => n + 1)
      })
    void api.settings.getAll().then((value) => {
      if (alive) setSettings(value)
    })
    const off = api.on('window:shown', () => {
      setQuery('')
      setStack([])
      setSelected(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    })
    return () => {
      alive = false
      off()
    }
  }, [])

  useEffect(() => {
    if (settings) document.documentElement.dataset.theme = settings.theme
  }, [settings])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(timer)
  }, [toast])

  const close = useCallback(() => {
    void api.launcher.hide()
  }, [])

  const toastMessage = useCallback((message: string) => {
    if (message) setToast({ message, id: Date.now() })
  }, [])

  /** 表单 / 外部改完配置后把最新设置拉回来，触发重排与重渲染 */
  const reloadSettings = useCallback(async () => {
    try {
      setSettings(await api.settings.getAll())
    } catch {
      /* 忽略 */
    }
  }, [])

  /* ---------------- 搜索 ---------------- */
  const runSearch = useCallback(
    async (input: string, currentSettings: AppSettings): Promise<ResultItem[]> => {
      const id = ++searchId.current
      setLoading(true)

      const push = (options: PushOptions) => {
        const screen: Screen = toScreen({
          kind: 'page',
          providerId: options.items[0]?.providerId ?? 'page',
          title: options.title,
          icon: options.icon,
          description: options.description,
          items: options.items,
          loading: Boolean(options.loading),
          form: options.form,
          savedQuery: input
        })
        setStack((prev) => [...prev, screen])
        setQuery('')
        setSelected(0)
        requestAnimationFrame(() => inputRef.current?.focus())
      }

      const replaceLatest = (options: PushOptions) => {
        setStack((prev) => {
          if (!prev.length) return prev
          const next = [...prev]
          const top = next[next.length - 1]
          next[next.length - 1] = toScreen({
            kind: 'page',
            providerId: top.providerId,
            title: options.title,
            icon: options.icon ?? top.icon,
            description: options.description ?? top.description,
            items: options.items,
            loading: Boolean(options.loading),
            form: options.form ?? top.form
          })
          return next
        })
      }

      const ctx: SearchContext = {
        query: input,
        args: resolve(input).args,
        settings: currentSettings,
        api,
        close,
        toast: toastMessage,
        push,
        replace: replaceLatest,
        runQuery: setQuery,
        refresh: () => {
          void runSearch(input, currentSettings)
        }
      }

      const execute = async (): Promise<ResultItem[]> => {
        // 二级页：只做本地过滤，不重新请求
        const top = stackRef.current[stackRef.current.length - 1]
        if (top?.kind === 'page') {
          // 表单页由自身管理输入，不做过滤
          if (!input.trim() || top.form) {
            if (searchId.current === id) setLoading(false)
            return []
          }
          const needle = input.trim().toLowerCase()
          const filtered = top.items.filter((item) =>
            `${item.title} ${item.subtitle ?? ''}`.toLowerCase().includes(needle)
          )
          if (searchId.current !== id) return []
          setStack((prev) => {
            const next = [...prev]
            const currentTop = next[next.length - 1]
            next[next.length - 1] = {
              ...currentTop,
              groups: filtered.length
                ? [{ providerId: currentTop.providerId, name: currentTop.title, icon: currentTop.icon!, items: filtered }]
                : []
            }
            return next
          })
          setSelected(0)
          setLoading(false)
          return filtered
        }

        const { provider, args } = resolve(input)

        if (provider) {
          let items: ResultItem[] = []
          try {
            items = await provider.search({ ...ctx, args })
          } catch (error) {
            console.error(`[provider:${provider.id}]`, error)
          }
          if (searchId.current !== id) return []
          setStack([
            toScreen({
              kind: 'search',
              providerId: provider.id,
              title: providerLabel(provider).name,
              icon: provider.icon,
              items,
              loading: false
            })
          ])
          setLoading(false)
          return items
        }

        // 聚合搜索：并行调用所有参与 root 的扩展，各自成组
        const results = await Promise.all(
          rootProviders().map(async (entry) => {
            try {
              return { entry, items: await entry.search({ ...ctx, args, query: input }) }
            } catch (error) {
              console.error(`[provider:${entry.id}]`, error)
              return { entry, items: [] as ResultItem[] }
            }
          })
        )
        if (searchId.current !== id) return []

        const groups: Group[] = []
        for (const { entry, items } of results
          .filter((r) => r.items.length > 0)
          .sort((a, b) => a.entry.rank - b.entry.rank)) {
          groups.push({
            providerId: entry.id,
            name: providerLabel(entry).name,
            icon: entry.icon,
            items: items
          })
        }

        if (!input.trim()) {
          groups.push({
            providerId: 'entries',
            name: t('所有功能', 'All Extensions'),
            icon: { kind: 'emoji', value: '🧩' } satisfies IconSpec,
            items: PROVIDERS.filter((p) => p.entry).map((p) => ({
              id: `entry:${p.id}`,
              providerId: p.id,
              title: providerLabel(p).name,
              subtitle: providerLabel(p).description,
              icon: p.icon,
              usageKey: `entry:${p.id}`,
              actions: [
                {
                  id: 'enter',
                  name: t('进入', 'Enter'),
                  primary: true,
                  shortcut: ['↵'],
                  run: () => setQuery(`${p.aliases[0]} `)
                }
              ]
            }))
          })
        }

        // 综合排序：组内按「匹配分 + 使用频率」，组之间按「扩展默认排序 - 该组最高加权」
        const orderedGroups = groups
          .map((group) => {
            const items = [...group.items]
              .sort((a, b) => weightOf(b) - weightOf(a))
              .slice(0, group.providerId === 'entries' ? MAX_ROOT_PER_GROUP * 3 : MAX_ROOT_PER_GROUP)
            const best = items.reduce((max, item) => Math.max(max, usageBoost(item.usageKey)), 0)
            return { group: { ...group, items }, order: rankOf(group.providerId) - best }
          })
          .filter((entry) => entry.group.items.length > 0)
          .sort((a, b) => a.order - b.order)
          .map((entry) => entry.group)

        setStack([
          {
            kind: 'search',
            providerId: 'root',
            title: ROOT_TITLE,
            loading: false,
            groups: orderedGroups,
            items: orderedGroups.flatMap((g) => g.items)
          }
        ])
        setLoading(false)
        return orderedGroups.flatMap((g) => g.items)
      }

      return await execute()
    },
    [close, toastMessage]
  )

  /* ---------------- 输入驱动 ---------------- */
  useEffect(() => {
    if (!settings) return
    setSelected(0)
    const timer = setTimeout(() => void runSearch(query, settings), debounceFor(query))
    return () => clearTimeout(timer)
  }, [query, settings, stack.length, runSearch, booted, pluginsReady])

  /* ---------------- 派生数据 ---------------- */
  const current: Screen | null = stack.length ? stack[stack.length - 1] : null
  const groups = current?.groups ?? []
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const selectedItem = flatItems[selected] ?? null

  const move = useCallback(
    (delta: number) => {
      setSelected((prev) => {
        if (!flatItems.length) return 0
        const next = prev + delta
        if (next < 0) return flatItems.length - 1
        if (next >= flatItems.length) return 0
        return next
      })
    },
    [flatItems.length]
  )

  const back = useCallback(() => {
    const snapshot = stackRef.current
    if (snapshot.length <= 1) return
    // 还原压栈前的输入，返回后上级列表会按最新设置重新搜索
    setStack(snapshot.slice(0, -1))
    setQuery(snapshot[snapshot.length - 1].savedQuery ?? '')
    setSelected(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const refresh = useCallback(() => {
    const currentSettings = settingsRef.current
    if (currentSettings) void runSearch(queryRef.current, currentSettings)
  }, [runSearch])

  const runAction = useCallback(
    async (item: ResultItem | null, index = 0) => {
      const currentSettings = settingsRef.current
      if (!item || !currentSettings) return
      const action = item.actions[index]
      if (!action) return
      recordUsage(item.usageKey)
      try {
        await action.run({
          item,
          settings: currentSettings,
          api,
          close,
          toast: toastMessage,
          refresh,
          runQuery: setQuery
        })
      } catch (error) {
        console.error('[action]', error)
        toastMessage(`执行失败：${String(error)}`)
      }
      // 动作可能改动了设置，统一拉最新值回来
      await reloadSettings()
    },
    [close, refresh, reloadSettings, toastMessage]
  )

  /* ---------------- 命令快捷键 ---------------- */
  useEffect(() => {
    // 主进程在全局快捷键命中后推送搜索词：执行第一条结果，
    // 没有结果时保留窗口让用户手动选择
    const off = api.on('hotkey:trigger', (query: string) => {
      const currentSettings = settingsRef.current
      if (!currentSettings || !query) return
      setQuery(query)
      void runSearch(query, currentSettings).then((items) => {
        const first = items?.[0]
        if (first?.actions.length) void runAction(first, 0)
      })
    })
    return off
  }, [runSearch, runAction])

  return {
    settings,
    query,
    setQuery,
    loading,
    current,
    groups,
    flatItems,
    selected,
    setSelected,
    selectedItem,
    move,
    back,
    runAction,
    refresh,
    reloadSettings,
    notify: toastMessage,
    toast,
    inputRef
  }
}

function toScreen(options: {
  kind: Screen['kind']
  providerId: string
  title: string
  icon?: IconSpec
  description?: string
  items: ResultItem[]
  loading: boolean
  form?: FormSpec
  savedQuery?: string
}): Screen {
  return {
    kind: options.kind,
    providerId: options.providerId,
    title: options.title,
    icon: options.icon,
    description: options.description,
    loading: options.loading,
    form: options.form,
    savedQuery: options.savedQuery,
    items: options.items,
    groups: options.items.length
      ? [
          {
            providerId: options.providerId,
            name: options.title,
            icon: options.icon ?? { kind: 'emoji', value: '🧩' },
            items: options.items
          }
        ]
      : []
  }
}
