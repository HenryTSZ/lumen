import type {
  AppInfo,
  AppSettings,
  Bookmark,
  ClipItem,
  FileEntry,
  IndexStatus,
  MachineInfo,
  MarketPlugin,
  PluginInfo,
  PortEntry,
  ProcessEntry,
  Quicklink,
  Snippet,
  UsageMap,
  UserCommand,
  WifiNetwork,
  WindowEntry
} from '@shared/types'
import type { LumenApi } from '@shared/types'
import { PREVIEW_PLUGINS } from './data/previewPlugins'
import { CLIP_IMAGE_THUMB } from './data/clipSample'

const delay = (ms = 90) => new Promise((r) => setTimeout(r, ms))

function deep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let settings: AppSettings = {
  hotkey: 'Alt+Space',
  showInTray: true,
  launchAtLogin: false,
  theme: 'dark',
  resultLimit: 60,
  everythingPath: '',
  searchRoots: [],
  ignoreDirs: ['node_modules', '.git'],
  clipHistory: true,
  clipLimit: 100,
  searchEngine: 'google',
  ai: { enabled: true, baseUrl: 'https://api.deepseek.com/v1', apiKey: 'demo', model: 'deepseek-chat' },
  pluginsIndexUrl: '',
  disabledPlugins: [],
  allowRemotePlugins: true,
  firstRun: true
}

const apps: AppInfo[] = [
  { id: 'a1', name: 'Visual Studio Code', path: 'C:\\Users\\Leo\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe', source: 'startmenu' },
  { id: 'a2', name: 'Microsoft Edge', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', source: 'startmenu' },
  { id: 'a3', name: 'Google Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', source: 'startmenu' },
  { id: 'a4', name: 'Windows Terminal', path: 'C:\\Users\\Leo\\AppData\\Local\\Microsoft\\WindowsApps\\wt.exe', source: 'startmenu' },
  { id: 'a5', name: '微信', path: 'C:\\Program Files\\Tencent\\WeChat\\WeChat.exe', source: 'startmenu' },
  { id: 'a6', name: '企业微信', path: 'C:\\Program Files\\WXWork\\WXWork.exe', source: 'startmenu' },
  { id: 'a7', name: '网易云音乐', path: 'C:\\Program Files\\Netease\\CloudMusic\\cloudmusic.exe', source: 'startmenu' },
  { id: 'a8', name: 'Obsidian', path: 'C:\\Users\\Leo\\AppData\\Local\\Obsidian\\Obsidian.exe', source: 'startmenu' },
  { id: 'a9', name: 'Figma', path: 'C:\\Users\\Leo\\AppData\\Local\\Figma\\Figma.exe', source: 'startmenu' },
  { id: 'a10', name: 'Adobe Photoshop 2026', path: 'C:\\Program Files\\Adobe\\Photoshop.exe', source: 'startmenu' },
  { id: 'a11', name: 'Node.js command prompt', path: 'C:\\Program Files\\nodejs\\nodevars.bat', source: 'startmenu' },
  { id: 'a12', name: 'Cursor', path: 'C:\\Users\\Leo\\AppData\\Local\\Programs\\cursor\\Cursor.exe', source: 'startmenu' },
  { id: 'a13', name: 'Everything', path: 'C:\\Program Files\\Everything\\Everything.exe', source: 'registry' },
  { id: 'a14', name: '计算器', path: '', appId: 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App', source: 'uwp' },
  { id: 'a15', name: '设置', path: '', appId: 'windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel', source: 'uwp' },
  { id: 'a16', name: 'Task manager', path: 'C:\\Windows\\System32\\Taskmgr.exe', source: 'registry' },
  { id: 'a17', name: 'QQ音乐', path: 'C:\\Program Files\\Tencent\\QQMusic\\QQMusic.exe', source: 'startmenu' },
  { id: 'a18', name: 'Microsoft To Do', path: '', appId: 'Microsoft.Todos_8wekyb3d8bbwe!App', source: 'uwp' }
]

const filesList: FileEntry[] = [
  { path: 'C:\\Users\\Leo\\Documents\\Q4产品规划.docx', name: 'Q4产品规划.docx', ext: 'docx', size: 48213, mtime: Date.now() - 3600_000, isDir: false },
  { path: 'C:\\Users\\Leo\\Documents\\技术方案评审.md', name: '技术方案评审.md', ext: 'md', size: 12400, mtime: Date.now() - 7200_000, isDir: false },
  { path: 'C:\\Users\\Leo\\Documents\\预算表2026.xlsx', name: '预算表2026.xlsx', ext: 'xlsx', size: 99812, mtime: Date.now() - 86400_000, isDir: false },
  { path: 'C:\\Users\\Leo\\Documents\\projects\\lumen', name: 'lumen', ext: '', size: 0, mtime: Date.now() - 1800_000, isDir: true },
  { path: 'C:\\Users\\Leo\\Documents\\projects\\lumen\\README.md', name: 'README.md', ext: 'md', size: 8122, mtime: Date.now() - 600_000, isDir: false },
  { path: 'C:\\Users\\Leo\\Downloads\\setup-lumen.exe', name: 'setup-lumen.exe', ext: 'exe', size: 82_000_000, mtime: Date.now() - 172800_000, isDir: false },
  { path: 'C:\\Users\\Leo\\Downloads\\2026招聘JD.pdf', name: '2026招聘JD.pdf', ext: 'pdf', size: 331_244, mtime: Date.now() - 259200_000, isDir: false },
  { path: 'C:\\Users\\Leo\\Desktop\\截图 2026-10-28.png', name: '截图 2026-10-28.png', ext: 'png', size: 220_411, mtime: Date.now() - 5400_000, isDir: false },
  { path: 'C:\\Users\\Leo\\Pictures\\壁纸.png', name: '壁纸.png', ext: 'png', size: 2_411_004, mtime: Date.now() - 604800_000, isDir: false },
  { path: 'C:\\Users\\Leo\\Documents\\会议纪要.txt', name: '会议纪要.txt', ext: 'txt', size: 2401, mtime: Date.now() - 3000_000, isDir: false }
]

let clips: ClipItem[] = [
  {
    id: 'ci1',
    text: 'C:\\Users\\Leo\\AppData\\Roaming\\lumen\\clipimages\\1730000000000.png',
    preview: '[图片 1280×720]',
    createdAt: Date.now() - 60_000,
    type: 'image',
    width: 1280,
    height: 720,
    bytes: 284_113
  },
  { id: 'c1', text: 'https://github.com/raycast/extensions', preview: 'https://github.com/raycast/extensions', createdAt: Date.now() - 120_000, type: 'text' },
  { id: 'c2', text: 'Alt+Space', preview: 'Alt+Space', createdAt: Date.now() - 900_000, type: 'text', pinned: true },
  { id: 'c3', text: 'npm run build && electron-builder --win', preview: 'npm run build && electron-builder --win', createdAt: Date.now() - 3600_000, type: 'text' },
  { id: 'c4', text: 'leo@example.com', preview: 'leo@example.com', createdAt: Date.now() - 86400_000, type: 'text' }
]

const windowList: WindowEntry[] = [
  { pid: 1024, process: 'Code', title: 'lumen — Visual Studio Code', path: 'C:\\...\\Code.exe' },
  { pid: 2048, process: 'msedge', title: 'Electron 文档 - Microsoft Edge', path: 'C:\\...\\msedge.exe' },
  { pid: 4096, process: 'WeChat', title: '微信', path: 'C:\\...\\WeChat.exe' },
  { pid: 8192, process: 'WindowsTerminal', title: 'Windows PowerShell', path: 'C:\\...\\WindowsTerminal.exe' }
]

const userCmd: UserCommand[] = [
  { id: 'u1', name: '编辑 hosts 文件', keyword: 'hosts', type: 'open', target: 'C:\\Windows\\System32\\drivers\\etc\\hosts', icon: '📝' },
  { id: 'u2', name: '打开 WSL 终端', keyword: 'wsl', type: 'shell', target: 'wt.exe -p "Ubuntu"', icon: '🐧' },
  { id: 'u3', name: '快速粘贴邮箱', keyword: 'mail', type: 'snippet', target: 'leo@example.com', icon: '✉️' },
  { id: 'u4', name: 'GitHub Trending', keyword: 'gh', type: 'url', target: 'https://github.com/trending', icon: '🌐' }
]

/** 预览用的站内快捷搜索示例 */
let quicklinkList: Quicklink[] = [
  { id: 'q1', name: 'GitHub', keyword: 'gh', url: 'https://github.com/search?q={query}', icon: '🐙' },
  { id: 'q2', name: 'Stack Overflow', keyword: 'so', url: 'https://stackoverflow.com/search?q={query}', icon: '📚' },
  { id: 'q3', name: 'npm', keyword: 'npm', url: 'https://www.npmjs.com/search?q={query}', icon: '📦' },
  { id: 'q4', name: 'MDN', keyword: 'mdn', url: 'https://developer.mozilla.org/zh-CN/search?q={query}', icon: '📘' },
  { id: 'q5', name: '哔哩哔哩', keyword: 'bili', url: 'https://search.bilibili.com/all?keyword={query}', icon: '📺' },
  { id: 'q6', name: '知乎', keyword: 'zh', url: 'https://www.zhihu.com/search?q={query}', icon: '💬' },
  { id: 'q7', name: 'YouTube', keyword: 'yt', url: 'https://www.youtube.com/results?search_query={query}', icon: '▶️' },
  { id: 'q8', name: '淘宝', keyword: 'tb', url: 'https://s.taobao.com/search?q={query}', icon: '🛒' },
  { id: 'q9', name: '高德地图', keyword: 'map', url: 'https://www.amap.com/search?query={query}', icon: '🗺️' }
]

/** 预览用的文本片段示例 */
let snippetList: Snippet[] = [
  { id: 's1', name: '邮箱地址', keyword: 'mail', text: 'leo@example.com', icon: '✉️' },
  { id: 's2', name: '今天日期', keyword: 'today', text: '{date}', icon: '📅' },
  {
    id: 's3',
    name: '邮件签名',
    keyword: 'sign',
    text: '祝好，\nLeo\n{cursor}',
    icon: '✍️'
  },
  { id: 's4', name: '代码评审标准', keyword: 'cr', text: '请按以下顺序评审：\n1. 正确性\n2. 边界条件\n3. 可读性\n4. 性能', icon: '🔍' },
  { id: 's5', name: '标准头文件', keyword: 'std', text: '/**\n * {arg}\n * @date {date}\n */', icon: '📄' },
  { id: 's6', name: '待办模板', keyword: 'todo', text: '- [ ] {clipboard}', icon: '✅' }
]

/** 预览用的浏览器书签示例 */
const bookmarkList: Bookmark[] = [
  { id: 'b1', title: 'Electron 官方文档', url: 'https://www.electronjs.org/docs', path: '收藏夹栏/开发', source: 'Edge' },
  { id: 'b2', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', path: '收藏夹栏/开发', source: 'Edge' },
  { id: 'b3', title: 'Raycast Extensions', url: 'https://www.raycast.com/extensions', path: '收藏夹栏/工具', source: 'Chrome' },
  { id: 'b4', title: 'GitHub', url: 'https://github.com', path: '收藏夹栏', source: 'Chrome' },
  { id: 'b5', title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/', path: '收藏夹栏/开发', source: 'Chrome' },
  { id: 'b6', title: 'DeepSeek 开放平台', url: 'https://platform.deepseek.com', path: '收藏夹栏/AI', source: 'Edge' },
  { id: 'b7', title: 'Figma', url: 'https://www.figma.com/files', path: '其他书签', source: 'Edge' },
  { id: 'b8', title: '哔哩哔哩', url: 'https://www.bilibili.com', path: '收藏夹栏', source: 'Chrome' },
  { id: 'b9', title: 'npm trends', url: 'https://npmtrends.com', path: '收藏夹栏/开发', source: 'Chrome' },
  { id: 'b10', title: 'React 中文文档', url: 'https://zh-hans.react.dev', path: '收藏夹栏/开发', source: 'Edge' }
]

/** 预览用的模拟使用频率数据，让智能排序效果可见 */
let usageMap: UsageMap = {
  'apps:C:\\Users\\Leo\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe': {
    count: 168,
    lastUsed: Date.now() - 4 * 60_000
  },
  'apps:C:\\Users\\Leo\\AppData\\Local\\Figma\\Figma.exe': { count: 74, lastUsed: Date.now() - 40 * 60_000 },
  'apps:C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe': {
    count: 63,
    lastUsed: Date.now() - 12 * 60_000
  },
  'apps:C:\\Users\\Leo\\AppData\\Local\\Obsidian\\Obsidian.exe': { count: 31, lastUsed: Date.now() - 6 * 3600_000 },
  'cmd:sample-hosts': { count: 22, lastUsed: Date.now() - 90 * 60_000, pinned: true },
  'cmd:sample-wsl': { count: 14, lastUsed: Date.now() - 26 * 3600_000 },
  'sys:lock': { count: 19, lastUsed: Date.now() - 3 * 3600_000 }
}

/** 预览用的端口占用示例 */
const portList: PortEntry[] = [
  { pid: 18324, process: 'node', protocol: 'TCP', local: '0.0.0.0:3000', remote: '0.0.0.0:0', state: 'LISTENING' },
  { pid: 18324, process: 'node', protocol: 'TCP', local: '[::]:3000', remote: '[::]:0', state: 'LISTENING' },
  { pid: 21840, process: 'vite', protocol: 'TCP', local: '127.0.0.1:5173', remote: '0.0.0.0:0', state: 'LISTENING' },
  { pid: 6160, process: 'mysqld', protocol: 'TCP', local: '0.0.0.0:3306', remote: '0.0.0.0:0', state: 'LISTENING' },
  { pid: 9104, process: 'msedgewebview2', protocol: 'TCP', local: '127.0.0.1:9222', remote: '0.0.0.0:0', state: 'LISTENING' },
  { pid: 3421, process: 'Code', protocol: 'TCP', local: '127.0.0.1:54321', remote: '140.82.112.3:443', state: 'ESTABLISHED' },
  { pid: 8877, process: 'svchost', protocol: 'UDP', local: '0.0.0.0:5353', remote: '*:*', state: '—' }
]

/** 预览用的进程列表示例（按内存降序） */
const processList: ProcessEntry[] = [
  { pid: 1024, name: 'Code', title: 'lumen — Visual Studio Code', memMB: 1284.6 },
  { pid: 3421, name: 'Code', title: '', memMB: 892.1 },
  { pid: 2048, name: 'msedge', title: 'Electron 文档 - Microsoft Edge', memMB: 654.9 },
  { pid: 5122, name: 'chrome', title: 'GitHub', memMB: 587.3 },
  { pid: 4096, name: 'WeChat', title: '微信', memMB: 421.0 },
  { pid: 18324, name: 'node', title: '', memMB: 286.4 },
  { pid: 6160, name: 'mysqld', title: '', memMB: 512.8 },
  { pid: 8192, name: 'WindowsTerminal', title: 'Windows PowerShell', memMB: 118.2 },
  { pid: 4310, name: 'cloudmusic', title: '网易云音乐', memMB: 264.5 },
  { pid: 777, name: 'Obsidian', title: '笔记库', memMB: 342.7 }
]

/** 预览用的 Wi-Fi 列表示例 */
const wifiList: WifiNetwork[] = [
  { ssid: 'Home-5G', signal: 92, auth: 'WPA3-Personal', connected: true },
  { ssid: 'Home-2.4G', signal: 84, auth: 'WPA2-Personal', connected: false },
  { ssid: 'Office-Guest', signal: 67, auth: 'Open', connected: false },
  { ssid: 'ChinaNet-aB3x', signal: 55, auth: 'WPA2-Personal', connected: false },
  { ssid: 'CMCC-Free', signal: 41, auth: 'Open', connected: false },
  { ssid: 'TP-LINK_5F', signal: 28, auth: 'WPA2-Personal', connected: false }
]

/** 市场标签（预览数据里没有，单独补一份） */
const MARKET_TAGS: Record<string, string[]> = {
  'json-tools': ['开发', '文本'],
  base64: ['开发', '编码'],
  uuid: ['工具'],
  color: ['设计', '工具'],
  todo: ['效率']
}

/** 预览模式的插件市场：用打包进来的真实插件源码，装了就能跑 */
const marketList: MarketPlugin[] = Object.values(PREVIEW_PLUGINS).map(({ info }) => ({
  id: info.id,
  name: info.name,
  version: info.version,
  author: info.author,
  description: info.description,
  icon: info.icon,
  source: 'builtin',
  tags: MARKET_TAGS[info.id] ?? ['工具'],
  aliases: info.aliases,
  rank: info.rank,
  participatesInRoot: info.participatesInRoot
}))

/** 预览模式默认预装一个插件，好让「插件生效」这件事一眼可见 */
let installedPlugins: PluginInfo[] = [{ ...PREVIEW_PLUGINS['json-tools'].info, installed: true }]
const pluginStore = new Map<string, unknown>()

/**
 * 浏览器预览模式下使用的 Mock 实现。
 * 结构严格对齐 LumenApi，因此在 Electron 里跑的是真实 IPC，在浏览器里跑的是这份数据。
 */
export function createMockApi(): LumenApi {
  const machine: MachineInfo = {
    version: '1.0.0',
    platform: 'win32',
    dataDir: 'C:\\Users\\Leo\\AppData\\Roaming\\lumen',
    commandsFile: 'C:\\Users\\Leo\\AppData\\Roaming\\lumen\\commands.json',
    quicklinksFile: 'C:\\Users\\Leo\\AppData\\Roaming\\lumen\\quicklinks.json',
    snippetsFile: 'C:\\Users\\Leo\\AppData\\Roaming\\lumen\\snippets.json'
  }

  return {
    launcher: {
      hide: async () => undefined,
      resize: async () => undefined,
      paste: async () => undefined,
      openSettingsWindow: async () => undefined
    },
    settings: {
      getAll: async () => deep(settings),
      set: async (key, value) => {
        settings = { ...settings, [key]: value }
        return deep(settings)
      },
      openFile: async () => undefined,
      setHotkey: async (accelerator) => {
        settings = { ...settings, hotkey: accelerator }
        return accelerator
      },
      setAutoLaunch: async (enabled) => {
        settings = { ...settings, launchAtLogin: enabled }
        return enabled
      }
    },
    apps: {
      list: async () => {
        await delay()
        return deep(apps)
      },
      rescan: async () => deep(apps),
      icon: async () => '',
      open: async () => true
    },
    files: {
      status: async (): Promise<IndexStatus> => ({ state: 'ready', count: 128_400, everything: false }),
      query: async (query, limit = 40) => {
        await delay(120)
        const q = query.toLowerCase()
        return deep(
          filesList
            .filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
            .slice(0, limit)
        )
      },
      reindex: async () => undefined,
      decorate: async (entry) => deep(entry),
      open: async () => true,
      reveal: async () => undefined
    },
    clipboard: {
      readText: async () => clips[0]?.text ?? '',
      list: async () => deep(clips),
      copy: async () => undefined,
      write: async (text) => {
        clips = [{ id: `c${Date.now()}`, text, preview: text.slice(0, 140), createdAt: Date.now(), type: 'text' }, ...clips]
      },
      remove: async (id) => {
        clips = clips.filter((c) => c.id !== id)
        return deep(clips)
      },
      clear: async () => {
        clips = []
      },
    togglePin: async (id) => {
      clips = clips.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
      return deep(clips)
    },
    thumbnail: async (id) => (clips.find((c) => c.id === id)?.type === 'image' ? CLIP_IMAGE_THUMB : ''),
    imageData: async (id) => (clips.find((c) => c.id === id)?.type === 'image' ? CLIP_IMAGE_THUMB : ''),
    saveImage: async (id) => (clips.find((c) => c.id === id)?.type === 'image' ? 'C:\\Users\\Leo\\Pictures\\截图.png' : '')
  },
    windows: {
      list: async () => deep(windowList),
      focus: async () => true,
      close: async () => true,
      snap: async () => true
    },
    ports: {
      list: async () => {
        await delay()
        return deep(portList)
      }
    },
    processes: {
      list: async () => {
        await delay()
        return deep(processList)
      },
      kill: async (pid) => {
        const idx = processList.findIndex((p) => p.pid === pid)
        if (idx >= 0) processList.splice(idx, 1)
        return true
      }
    },
    wifi: {
      list: async () => {
        await delay()
        return deep(wifiList)
      }
    },
    plugins: {
      market: async () => deep(marketList),
      installed: async () => deep(installedPlugins),
      code: async (id) => PREVIEW_PLUGINS[id]?.code ?? '',
      install: async (id) => {
        const item = PREVIEW_PLUGINS[id]
        if (!item || installedPlugins.some((p) => p.id === id)) return deep(installedPlugins)
        installedPlugins = [...installedPlugins, { ...item.info, installed: true }]
        return deep(installedPlugins)
      },
      uninstall: async (id) => {
        installedPlugins = installedPlugins.filter((p) => p.id !== id)
        return deep(installedPlugins)
      },
      setDisabled: async (id, disabled) => {
        installedPlugins = installedPlugins.map((p) => (p.id === id ? { ...p, disabled } : p))
        return deep(installedPlugins)
      },
      dir: async () => 'C:\\Users\\Leo\\AppData\\Roaming\\lumen\\plugins'
    },
    storage: {
      get: async (key) => deep(pluginStore.get(key) ?? null),
      set: async (key, value) => {
        pluginStore.set(key, deep(value))
      },
      remove: async (key) => {
        pluginStore.delete(key)
      },
      keys: async () => [...pluginStore.keys()]
    },
    system: {
      run: async () => '完成',
      open: async () => ''
    },
    commands: {
      list: async () => deep(userCmd),
      reload: async () => deep(userCmd)
    },
    shell: {
      openExternal: async () => undefined,
      run: async () => undefined
    },
    ai: {
      chat: async (prompt) => {
        await delay(1400)
        return `这是对「${prompt}」的回答。\n\n在 Electron 环境里，这里会调用你在设置中填写的模型接口（默认 DeepSeek），返回真实结果。`
      }
    },
    quicklinks: {
      list: async () => deep(quicklinkList),
      save: async (list) => {
        quicklinkList = deep(list)
        return deep(quicklinkList)
      }
    },
    snippets: {
      list: async () => deep(snippetList),
      save: async (list) => {
        snippetList = deep(list)
        return deep(snippetList)
      }
    },
    browser: {
      bookmarks: async () => {
        await delay(120)
        return deep(bookmarkList)
      }
    },
    app: {
      info: async () => deep(machine),
      relaunch: async () => undefined
    },
    usage: {
      all: async () => deep(usageMap),
      record: async (key) => {
        const prev = usageMap[key]
        usageMap = {
          ...usageMap,
          [key]: { count: (prev?.count ?? 0) + 1, lastUsed: Date.now(), pinned: prev?.pinned }
        }
      },
      pin: async (key, pinned) => {
        usageMap = { ...usageMap, [key]: { ...(usageMap[key] ?? { count: 0, lastUsed: 0 }), pinned } }
        return deep(usageMap)
      },
      reset: async () => {
        usageMap = {}
      }
    },
    on: () => () => undefined
  }
}
