import { api } from '../../api'
import type { AppSettings, HotkeyBinding } from '@shared/types'
import { findHotkeyConflicts, isValidAccelerator, normalizeAccelerator } from '@shared/hotkeys'
import { t } from '../../i18n'
import { emoji, type ActionSpec, type FormSpec, type Provider, type ResultItem, type SearchContext } from '../types'

const HOTKEY_CANDIDATES = ['Alt+Space', 'Ctrl+Space', 'Alt+S', 'Ctrl+Alt+Space', 'Alt+Q', 'Ctrl+;']
const ENGINES: Array<{ id: AppSettings['searchEngine']; name: string }> = [
  { id: 'google', name: 'Google' },
  { id: 'bing', name: 'Bing' },
  { id: 'baidu', name: '百度' },
  { id: 'duckduckgo', name: 'DuckDuckGo' }
]
const ENGINE_NAMES = ENGINES.map((e) => e.name)
const THEMES = ['深色', '浅色']

let machineInfo: Awaited<ReturnType<typeof api.app.info>> | null = null

async function info() {
  if (!machineInfo) machineInfo = await api.app.info()
  return machineInfo
}

const bool = (value: string) => value === 'true'
const onOff = (value: boolean) => (value ? '开启' : '关闭')
const lines = (value: string) =>
  value
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)

/** 把一组字段渲染成二级表单页 */
function openForm(ctx: SearchContext, title: string, icon: string, form: FormSpec) {
  ctx.push({ title, icon: emoji(icon), items: [], form })
}

interface SettingRow {
  id: string
  title: string
  subtitle: string
  icon: string
  keywords?: string[]
  actions: ResultItem['actions']
}

/** 命令快捷键的新增/编辑表单（binding 为 null 表示新增） */
function openHotkeyForm(ctx: SearchContext, s: AppSettings, binding: HotkeyBinding | null) {
  const bindings = s.commandHotkeys ?? []
  openForm(ctx, binding ? `编辑：${binding.label}` : '添加命令快捷键', '⌨️', {
    note: '按下组合键 = 唤起启动器并自动执行该搜索词的第一条结果。比如「app code」直达 VS Code。',
    submitLabel: binding ? '保存修改' : '添加快捷键',
    fields: [
      { key: 'label', label: '名称', type: 'text', defaultValue: binding?.label ?? '', placeholder: '打开 VS Code' },
      {
        key: 'query',
        label: '搜索词',
        type: 'text',
        defaultValue: binding?.query ?? '',
        placeholder: 'app code / sys 锁屏 / clip …',
        hint: '热键触发时在启动器里执行的完整输入'
      },
      {
        key: 'accelerator',
        label: '组合键',
        type: 'text',
        defaultValue: binding?.accelerator ?? '',
        placeholder: 'Ctrl+Alt+K',
        hint: '支持 Ctrl / Alt / Shift / Win 修饰键 + 字母数字 / F1-F24'
      }
    ],
    async submit(values) {
      const label = values.label.trim()
      const query = values.query.trim()
      const accelerator = normalizeAccelerator(values.accelerator)
      if (!label) return '请填写名称'
      if (!query) return '请填写搜索词'
      if (!accelerator) return '请填写组合键，如 Ctrl+Alt+K'
      if (!isValidAccelerator(accelerator)) return `组合键语法不对：${accelerator}`
      const others = bindings.filter((b) => !binding || b.id !== binding.id)
      const conflicts = findHotkeyConflicts(s.hotkey, [
        ...others,
        { id: 'next', label, query, accelerator }
      ])
      if (conflicts.length) return `组合键冲突：${conflicts.join('、')}，请换一个`
      const next: HotkeyBinding[] = [
        ...others,
        { id: binding?.id ?? `hk-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`, label, query, accelerator }
      ]
      await api.settings.set('commandHotkeys', next)
      return binding ? '已保存，立即生效' : '已添加，立即生效'
    }
  })
}

function rows(ctx: SearchContext): SettingRow[] {
  const s = ctx.settings
  const out: SettingRow[] = []
  const engineName = ENGINES.find((e) => e.id === s.searchEngine)?.name ?? s.searchEngine

  /* ---------------- 通用 ---------------- */
  out.push({
    id: 'general',
    title: '通用',
    subtitle: `${s.hotkey} · ${s.theme === 'dark' ? '深色' : '浅色'} · 自启${onOff(s.launchAtLogin)} · 托盘${onOff(s.showInTray)} · 单屏 ${s.resultLimit} 条`,
    icon: '🎛️',
    keywords: ['general', 'hotkey', 'theme', '设置', '常规'],
    actions: [
      {
        id: 'edit',
        name: '编辑通用设置',
        primary: true,
        shortcut: ['↵'],
        run() {
          openForm(ctx, '通用设置', '🎛️', {
            note: '快捷键与主题即时生效；托盘图标需要重启后生效。',
            submitLabel: '保存通用设置',
            fields: [
              {
                key: 'language',
                label: t('界面语言', 'Language'),
                type: 'select',
                options: ['中文', 'English'],
                defaultValue: s.language === 'en' ? 'English' : '中文',
                hint: t('切换后立即生效', 'Takes effect immediately')
              },
              {
                key: 'hotkey',
                label: '全局唤起快捷键',
                type: 'select',
                options: Array.from(new Set([s.hotkey, ...HOTKEY_CANDIDATES])),
                defaultValue: s.hotkey,
                hint: 'Electron accelerator 语法，如 Alt+Space'
              },
              {
                key: 'theme',
                label: '外观主题',
                type: 'select',
                options: THEMES,
                defaultValue: s.theme === 'dark' ? '深色' : '浅色'
              },
              { key: 'launchAtLogin', label: '开机自动启动', type: 'toggle', defaultValue: String(s.launchAtLogin) },
              { key: 'showInTray', label: '托盘图标', type: 'toggle', defaultValue: String(s.showInTray) },
              {
                key: 'resultLimit',
                label: '单屏最多结果条数',
                type: 'number',
                defaultValue: String(s.resultLimit),
                hint: '1 ~ 50 之间'
              }
            ],
            async submit(values) {
              const changes: string[] = []
              const language = values.language === 'English' ? 'en' : 'zh'
              if (language !== s.language) {
                await api.settings.set('language', language)
                changes.push(language === 'zh' ? '中文界面' : 'English')
              }
              const hotkey = values.hotkey.trim()
              if (hotkey && hotkey !== s.hotkey) {
                const applied = await api.settings.setHotkey(hotkey)
                changes.push(`快捷键 ${applied}`)
              }
              const theme = values.theme === '浅色' ? 'light' : 'dark'
              if (theme !== s.theme) {
                await api.settings.set('theme', theme)
                changes.push(theme === 'dark' ? '深色主题' : '浅色主题')
              }
              if (bool(values.launchAtLogin) !== s.launchAtLogin) {
                await api.settings.setAutoLaunch(bool(values.launchAtLogin))
                changes.push(`开机自启${onOff(bool(values.launchAtLogin))}`)
              }
              if (bool(values.showInTray) !== s.showInTray) {
                await api.settings.set('showInTray', bool(values.showInTray))
                changes.push('托盘图标（重启生效）')
              }
              const limit = Math.min(50, Math.max(1, Math.round(Number(values.resultLimit) || s.resultLimit)))
              if (limit !== s.resultLimit) {
                await api.settings.set('resultLimit', limit)
                changes.push(`单屏 ${limit} 条`)
              }
              return changes.length ? `已更新：${changes.join(' · ')}` : '没有改动'
            }
          })
        }
      },
      {
        id: 'theme',
        name: s.theme === 'dark' ? '切换为浅色' : '切换为深色',
        shortcut: ['Ctrl', 'T'],
        async run({ toast }) {
          await api.settings.set('theme', s.theme === 'dark' ? 'light' : 'dark')
          toast('主题已切换')
        }
      },
      {
        id: 'autolaunch',
        name: s.launchAtLogin ? '关闭开机自启' : '开启开机自启',
        shortcut: ['Ctrl', 'L'],
        async run({ toast }) {
          const next = await api.settings.setAutoLaunch(!s.launchAtLogin)
          toast(next ? '已开启开机自启' : '已关闭开机自启')
        }
      }
    ]
  })

  /* ---------------- 搜索引擎 ---------------- */
  out.push({
    id: 'engine',
    title: '默认搜索引擎',
    subtitle: `当前：${engineName}`,
    icon: '🌐',
    keywords: ['search', 'engine', 'google', 'baidu', '搜索引擎'],
    actions: [
      {
        id: 'edit',
        name: '选择搜索引擎',
        primary: true,
        shortcut: ['↵'],
        run() {
          openForm(ctx, '默认搜索引擎', '🌐', {
            fields: [
              {
                key: 'engine',
                label: '搜索引擎',
                type: 'select',
                options: ENGINE_NAMES,
                defaultValue: engineName,
                hint: '影响搜索框直接输入关键词时的跳转目标'
              }
            ],
            async submit(values) {
              const picked = ENGINES.find((e) => e.name === values.engine)?.id ?? s.searchEngine
              await api.settings.set('searchEngine', picked)
              return `默认搜索引擎已设为 ${values.engine}`
            }
          })
        }
      },
      ...ENGINES.filter((engine) => engine.id !== s.searchEngine).map<ActionSpec>((engine) => ({
        id: `engine:${engine.id}`,
        name: `切换为${engine.name}`,
        async run({ toast }) {
          await api.settings.set('searchEngine', engine.id)
          toast(`默认搜索引擎已设为 ${engine.name}`)
        }
      }))
    ]
  })

  /* ---------------- 搜索与索引 ---------------- */
  out.push({
    id: 'index',
    title: '搜索与索引',
    subtitle: s.everythingPath
      ? `已连接 Everything · ${s.searchRoots.length} 个根目录`
      : `内置索引 · ${s.searchRoots.length} 个根目录`,
    icon: '🗂️',
    keywords: ['index', 'everything', 'file', '索引', '文件'],
    actions: [
      {
        id: 'edit',
        name: '编辑索引设置',
        primary: true,
        shortcut: ['↵'],
        run() {
          openForm(ctx, '搜索与索引', '🗂️', {
            note: '填了 es.exe 路径就用 Everything 全盘秒搜，留空则用内置索引。',
            submitLabel: '保存索引设置',
            fields: [
              {
                key: 'everythingPath',
                label: 'Everything 命令行路径（es.exe）',
                defaultValue: s.everythingPath,
                placeholder: 'C:\\Program Files\\Everything\\es.exe'
              },
              {
                key: 'searchRoots',
                label: '索引根目录',
                type: 'textarea',
                defaultValue: s.searchRoots.join('\n'),
                hint: '每行一个，为空时使用用户目录'
              },
              {
                key: 'ignoreDirs',
                label: '忽略的目录名',
                type: 'textarea',
                defaultValue: s.ignoreDirs.join('\n'),
                hint: '每行一个，例如 node_modules'
              }
            ],
            async submit(values) {
              await api.settings.set('everythingPath', values.everythingPath.trim())
              await api.settings.set('searchRoots', lines(values.searchRoots))
              await api.settings.set('ignoreDirs', lines(values.ignoreDirs))
              await api.files.reindex()
              return '索引设置已保存，正在重建索引'
            }
          })
        }
      },
      {
        id: 'reindex',
        name: '重建文件索引',
        shortcut: ['Ctrl', 'R'],
        async run({ toast }) {
          toast('正在后台重建索引…')
          await api.files.reindex()
          toast('索引重建完成')
        }
      },
      {
        id: 'rescan-apps',
        name: '重新扫描已安装应用',
        shortcut: ['Ctrl', 'A'],
        async run({ toast }) {
          await api.apps.rescan()
          toast('应用列表已刷新')
        }
      }
    ]
  })

  /* ---------------- 剪贴板 ---------------- */
  out.push({
    id: 'clipboard',
    title: '剪贴板历史',
    subtitle: s.clipHistory ? `已开启，最多保留 ${s.clipLimit} 条` : '已关闭',
    icon: '📋',
    keywords: ['clipboard', 'paste', '剪贴板'],
    actions: [
      {
        id: 'edit',
        name: '编辑剪贴板设置',
        primary: true,
        shortcut: ['↵'],
        run() {
          openForm(ctx, '剪贴板历史', '📋', {
            fields: [
              { key: 'clipHistory', label: '记录剪贴板历史', type: 'toggle', defaultValue: String(s.clipHistory) },
              {
                key: 'clipLimit',
                label: '最多保留条数',
                type: 'number',
                defaultValue: String(s.clipLimit),
                hint: '10 ~ 500 之间'
              }
            ],
            async submit(values) {
              const limit = Math.min(500, Math.max(10, Math.round(Number(values.clipLimit) || s.clipLimit)))
              await api.settings.set('clipHistory', bool(values.clipHistory))
              await api.settings.set('clipLimit', limit)
              return `剪贴板历史${onOff(bool(values.clipHistory))}，最多 ${limit} 条`
            }
          })
        }
      },
      {
        id: 'toggle',
        name: s.clipHistory ? '关闭剪贴板历史' : '开启剪贴板历史',
        shortcut: ['Ctrl', 'H'],
        async run({ toast }) {
          await api.settings.set('clipHistory', !s.clipHistory)
          toast('已更新')
        }
      },
      {
        id: 'clear',
        name: '清空剪贴板历史',
        shortcut: ['Ctrl', 'Backspace'],
        icon: '🗑️',
        async run({ toast }) {
          await api.clipboard.clear()
          toast('剪贴板历史已清空')
        }
      }
    ]
  })

  /* ---------------- AI ---------------- */
  out.push({
    id: 'ai',
    title: 'AI 配置',
    subtitle: s.ai.apiKey ? `${s.ai.model} @ ${s.ai.baseUrl}` : '未配置 API Key，AI 命令不可用',
    icon: '✨',
    keywords: ['ai', 'openai', 'apikey', '人工智能'],
    actions: [
      {
        id: 'edit',
        name: '编辑 AI 配置',
        primary: true,
        shortcut: ['↵'],
        run() {
          openForm(ctx, 'AI 配置', '✨', {
            note: '兼容任意 OpenAI 格式的接口，密钥只保存在本机配置文件中。',
            submitLabel: '保存 AI 配置',
            fields: [
              { key: 'enabled', label: '启用 AI 命令', type: 'toggle', defaultValue: String(s.ai.enabled) },
              {
                key: 'baseUrl',
                label: '接口地址',
                defaultValue: s.ai.baseUrl,
                placeholder: 'https://api.openai.com/v1'
              },
              {
                key: 'apiKey',
                label: 'API Key',
                type: 'password',
                defaultValue: s.ai.apiKey,
                placeholder: 'sk-...'
              },
              { key: 'model', label: '模型名称', defaultValue: s.ai.model, placeholder: 'gpt-4o-mini' }
            ],
            async submit(values) {
              const baseUrl = values.baseUrl.trim() || s.ai.baseUrl
              const model = values.model.trim() || s.ai.model
              await api.settings.set('ai', {
                enabled: bool(values.enabled),
                baseUrl: baseUrl.replace(/\/+$/, ''),
                apiKey: values.apiKey.trim(),
                model
              })
              if (values.apiKey.trim() && values.apiKey.trim() !== s.ai.apiKey) return 'AI 配置已保存'
              return 'AI 配置已更新'
            }
          })
        }
      },
      {
        id: 'toggle',
        name: s.ai.enabled ? '停用 AI' : '启用 AI',
        shortcut: ['Ctrl', 'E'],
        async run({ toast }) {
          await api.settings.set('ai', { ...s.ai, enabled: !s.ai.enabled })
          toast('已更新')
        }
      }
    ]
  })

  /* ---------------- 命令快捷键 ---------------- */
  {
    const bindings = s.commandHotkeys ?? []
    out.push({
      id: 'command-hotkeys',
      title: '命令快捷键',
      subtitle: bindings.length
        ? `${bindings.length} 个绑定，如 ${bindings[0].accelerator} → ${bindings[0].query}`
        : '给任意搜索词绑一个全局组合键，按下即执行',
      icon: '⌨️',
      keywords: ['hotkey', 'shortcut', '快捷键', '热键', '绑定', 'command hotkey'],
      actions: [
        {
          id: 'add',
          name: '添加快捷键',
          primary: true,
          shortcut: ['↵'],
          run() {
            openHotkeyForm(ctx, s, null)
          }
        },
        {
          id: 'list',
          name: '查看全部绑定',
          shortcut: ['Ctrl', 'L'],
          run() {
            ctx.push({
              title: '命令快捷键',
              icon: emoji('⌨️'),
              description: '选中一条回车编辑，Ctrl+X 删除',
              items: bindings.map((b) => ({
                id: `hk:${b.id}`,
                providerId: 'settings',
                title: `${b.label} · ${b.accelerator}`,
                subtitle: `按下执行搜索「${b.query}」`,
                icon: emoji('⌨️'),
                keywords: [b.label, b.query, b.accelerator],
                usageKey: `hk:${b.id}`,
                actions: [
                  {
                    id: 'edit',
                    name: '编辑',
                    primary: true,
                    shortcut: ['↵'],
                    run() {
                      openHotkeyForm(ctx, s, b)
                    }
                  },
                  {
                    id: 'del',
                    name: '删除',
                    shortcut: ['Ctrl', 'X'],
                    icon: '🗑️',
                    async run({ toast, refresh }) {
                      await api.settings.set(
                        'commandHotkeys',
                        (s.commandHotkeys ?? []).filter((x) => x.id !== b.id)
                      )
                      toast('已删除')
                      refresh()
                    }
                  }
                ]
              }))
            })
          }
        }
      ]
    })
    for (const binding of bindings) {
      out.push({
        id: `hk:${binding.id}`,
        title: `${binding.label} · ${binding.accelerator}`,
        subtitle: `按下执行搜索「${binding.query}」`,
        icon: '⌨️',
        keywords: [binding.label, binding.query, binding.accelerator],
        actions: [
          {
            id: 'edit',
            name: '编辑',
            primary: true,
            shortcut: ['↵'],
            run() {
              openHotkeyForm(ctx, s, binding)
            }
          },
          {
            id: 'del',
            name: '删除',
            shortcut: ['Ctrl', 'X'],
            icon: '🗑️',
            async run({ toast, refresh }) {
              await api.settings.set('commandHotkeys', (s.commandHotkeys ?? []).filter((x) => x.id !== binding.id))
              toast('已删除')
              refresh()
            }
          }
        ]
      })
    }
  }

  /* ---------------- 自定义命令 ---------------- */
  out.push({
    id: 'commands',
    title: '自定义命令',
    subtitle: '编辑 commands.json 添加自己的扩展命令',
    icon: '🧩',
    keywords: ['command', '自定义', '扩展'],
    actions: [
      {
        id: 'open',
        name: '打开 commands.json',
        primary: true,
        shortcut: ['↵'],
        async run({ close }) {
          close()
          await api.files.open((await info()).commandsFile)
        }
      },
      {
        id: 'reload',
        name: '重新加载命令文件',
        shortcut: ['Ctrl', 'Shift', 'R'],
        async run({ toast }) {
          await api.commands.reload()
          toast('已重新加载')
        }
      }
    ]
  })

  /* ---------------- 插件 ---------------- */
  out.push({
    id: 'plugins',
    title: '插件市场',
    subtitle: '安装 / 卸载扩展，可自定义市场索引地址',
    icon: '🧩',
    keywords: ['plugin', 'store', '插件', '扩展', '市场'],
    actions: [
      {
        id: 'open',
        name: '打开插件市场',
        primary: true,
        shortcut: ['↵'],
        run({ runQuery }) {
          runQuery('store ')
        }
      },
      {
        id: 'edit',
        name: '编辑插件设置',
        shortcut: ['Ctrl', 'E'],
        run() {
          openForm(ctx, '插件设置', '🧩', {
            fields: [
              {
                key: 'pluginsIndexUrl',
                label: '市场索引地址',
                placeholder: 'https://example.com/lumen-plugins.json',
                defaultValue: s.pluginsIndexUrl,
                hint: '留空使用内置索引；填写后会从该地址拉取插件清单（JSON）'
              },
              {
                key: 'allowRemotePlugins',
                label: '允许安装远程插件',
                type: 'toggle',
                defaultValue: s.allowRemotePlugins ? 'true' : 'false'
              }
            ],
            note: '插件在受限环境里运行：拿不到 Node / 文件系统，只能通过 Lumen 提供的接口访问系统能力。',
            async submit(values) {
              await api.settings.set('pluginsIndexUrl', values.pluginsIndexUrl.trim())
              await api.settings.set('allowRemotePlugins', values.allowRemotePlugins === 'true')
              return '插件设置已保存'
            }
          })
        }
      },
      {
        id: 'dir',
        name: '打开插件目录',
        shortcut: ['Ctrl', 'D'],
        async run({ close }) {
          close()
          const dir = await api.plugins.dir()
          await api.files.open(dir)
        }
      }
    ]
  })

  /* ---------------- 配置文件 / 关于 ---------------- */
  out.push({
    id: 'advanced',
    title: '配置文件',
    subtitle: '在编辑器中打开 settings.json（所有字段的原始形态）',
    icon: '📄',
    keywords: ['json', 'advanced', '配置', '高级'],
    actions: [
      {
        id: 'open',
        name: '打开 settings.json',
        primary: true,
        shortcut: ['↵'],
        async run({ close }) {
          close()
          await api.settings.openFile()
        }
      },
      {
        id: 'dir',
        name: '打开数据目录',
        shortcut: ['Ctrl', 'D'],
        async run({ close }) {
          close()
          await api.settings.openFile()
        }
      }
    ]
  })

  out.push({
    id: 'about',
    title: '关于 Lumen',
    subtitle: '版本、数据目录与运行信息',
    icon: 'ℹ️',
    keywords: ['about', 'version', '关于'],
    actions: [
      {
        id: 'detail',
        name: '查看详细信息',
        primary: true,
        shortcut: ['↵'],
        async run() {
          const machine = await info()
          ctx.push({
            title: '关于 Lumen',
            icon: emoji('ℹ️'),
            items: [
              {
                id: 'about:info',
                providerId: 'settings',
                title: `Lumen v${machine.version}`,
                subtitle: machine.platform,
                icon: emoji('ℹ️'),
                detail: {
                  fields: [
                    { label: '应用版本', value: machine.version },
                    { label: '运行平台', value: machine.platform },
                    { label: '数据目录', value: machine.dataDir },
                    { label: '自定义命令', value: machine.commandsFile }
                  ]
                },
                actions: []
              }
            ]
          })
        }
      },
      {
        id: 'relaunch',
        name: '重启 Lumen',
        shortcut: ['Ctrl', 'Q'],
        icon: '🔄',
        async run() {
          await api.app.relaunch()
        }
      }
    ]
  })

  return out
}

export const settingsProvider: Provider = {
  id: 'settings',
  name: '设置',
  description: '快捷键、主题、索引、剪贴板与 AI 的可视化配置',
  icon: emoji('⚙️'),
  aliases: ['settings', 'setting', '设置', '偏好', 'preferences', '配置'],
  participatesInRoot: false,
  rank: 50,
  entry: true,

  search(ctx) {
    const query = ctx.args.trim().toLowerCase()
    const list = rows(ctx)
    const filtered = query
      ? list.filter((row) => `${row.title}${row.subtitle}${(row.keywords ?? []).join(' ')}`.toLowerCase().includes(query))
      : list
    return filtered.map<ResultItem>((row) => ({
      id: `settings:${row.id}`,
      providerId: 'settings',
      title: row.title,
      subtitle: row.subtitle,
      icon: emoji(row.icon),
      keywords: row.keywords,
      score: 600,
      usageKey: `settings:${row.id}`,
      detail: {
        fields: [{ label: row.title, value: row.subtitle }],
        footer: row.actions
          .slice(1)
          .map((a) => `${a.name} ${a.shortcut?.join(' ') ?? ''}`)
          .join('   ·   ')
      },
      actions: row.actions
    }))
  }
}
