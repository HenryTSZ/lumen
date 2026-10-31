/**
 * 主进程 / preload / 渲染层共用的类型契约
 */

/* ------------------------------------------------------------------ */
/* 设置项                                                              */
/* ------------------------------------------------------------------ */

export interface AiSettings {
  enabled: boolean
  baseUrl: string
  apiKey: string
  model: string
}

export interface AppSettings {
  /** 全局唤起快捷键，Electron accelerator 语法，如 Alt+Space / Ctrl+Space */
  hotkey: string
  /** 是否显示托盘图标 */
  showInTray: boolean
  /** 开机自启 */
  launchAtLogin: boolean
  /** 主题 */
  theme: 'dark' | 'light'
  /** 单屏最多展示的结果条数 */
  resultLimit: number
  /** Everything 命令行工具 es.exe 的路径，配置后文件搜索走 Everything */
  everythingPath: string
  /** 文件索引根目录，为空时默认 %USERPROFILE% */
  searchRoots: string[]
  /** 索引时忽略的目录名 */
  ignoreDirs: string[]
  /** 是否启用剪贴板历史 */
  clipHistory: boolean
  /** 剪贴板历史最大条数 */
  clipLimit: number
  /** 默认网页搜索引擎 */
  searchEngine: 'google' | 'bing' | 'baidu' | 'duckduckgo'
  /** AI 命令配置 */
  ai: AiSettings
  /** 插件市场索引地址，为空时用内置索引 */
  pluginsIndexUrl: string
  /** 被禁用的插件 id */
  disabledPlugins: string[]
  /** 是否允许安装远程插件（从市场 URL 下载代码） */
  allowRemotePlugins: boolean
  /** 首次运行 */
  firstRun: boolean
}

/* ------------------------------------------------------------------ */
/* 数据实体                                                            */
/* ------------------------------------------------------------------ */

export interface AppInfo {
  id: string
  name: string
  /** 可执行文件真实路径，UWP 应用为空字符串 */
  path: string
  /** UWP 应用的 AppUserModelID */
  appId?: string
  source: 'startmenu' | 'registry' | 'uwp'
}

export interface FileEntry {
  path: string
  name: string
  ext: string
  size: number
  mtime: number
  isDir: boolean
}

export interface ClipItem {
  id: string
  text: string
  /** 首行预览（用于列表展示，避免超长文本撑爆 UI） */
  preview: string
  createdAt: number
  pinned?: boolean
  type: 'text' | 'image' | 'file' | 'rtf'
  /** 图片宽高（仅图片条目） */
  width?: number
  height?: number
  /** 图片字节大小（仅图片条目） */
  bytes?: number
}

export interface WindowEntry {
  pid: number
  process: string
  title: string
  path: string
}

export type SystemAction =
  | 'lock'
  | 'sleep'
  | 'hibernate'
  | 'shutdown'
  | 'restart'
  | 'logoff'
  | 'emptyTrash'
  | 'env'
  | 'publicIp'

/** 窗口分屏 / 摆放动作 */
export type SnapAction =
  | 'left'
  | 'right'
  | 'maximize'
  | 'minimize'
  | 'center'
  | 'nextDisplay'

/** 端口占用情况（来自 netstat -ano） */
export interface PortEntry {
  pid: number
  /** 进程名，如 node */
  process: string
  protocol: 'TCP' | 'UDP'
  /** 本地地址，如 0.0.0.0:3000 */
  local: string
  /** 远端地址 */
  remote: string
  /** LISTENING / ESTABLISHED / TIME_WAIT… */
  state: string
}

/** 正在运行的进程（杀进程用） */
export interface ProcessEntry {
  pid: number
  name: string
  /** 主窗口标题，可为空 */
  title: string
  /** 物理内存，MB */
  memMB: number
}

/**
 * 插件（第三方扩展）。
 * 一个插件 = 一个目录：plugin.json（元信息）+ main 指向的 JS 源码。
 * 源码在渲染进程里以受控方式执行，通过 ctx.api 访问系统能力。
 */
export interface PluginInfo {
  id: string
  name: string
  version: string
  author: string
  description: string
  icon: string
  /** 触发词 */
  aliases: string[]
  /** 是否参与无触发词的聚合搜索 */
  participatesInRoot: boolean
  rank: number
  /** 入口文件名，如 index.js */
  main: string
  /** 是否已安装到本机 */
  installed: boolean
  /** 已安装时被禁用 */
  disabled?: boolean
  /** 市场条目来源：内置资源 / 远程地址 */
  source?: 'builtin' | 'remote'
  /** 远程插件的下载地址 */
  downloadUrl?: string
  /** 市场分类标签 */
  tags?: string[]
}

/** 市场里的一条可安装条目 */
export interface MarketPlugin {
  id: string
  name: string
  version: string
  author: string
  description: string
  icon: string
  source: 'builtin' | 'remote'
  downloadUrl?: string
  tags?: string[]
  /** 安装后写入 plugin.json 的默认值 */
  aliases?: string[]
  rank?: number
  participatesInRoot?: boolean
}

/** 附近的 Wi-Fi 网络 */
export interface WifiNetwork {
  ssid: string
  /** 信号强度 0-100 */
  signal: number
  /** 认证方式，如 WPA2-Personal / Open */
  auth: string
  connected: boolean
}

export interface IndexStatus {
  state: 'idle' | 'indexing' | 'ready'
  /** 已索引条目数 */
  count: number
  /** 是否使用 Everything 外部索引 */
  everything: boolean
  /** 最近一次错误，正常为空 */
  error?: string
}

/** 用户自定义扩展命令，来自 userData/commands.json */
export interface UserCommand {
  id: string
  name: string
  keyword?: string
  type: 'open' | 'url' | 'shell' | 'snippet'
  /** open=路径，url=网址，shell=命令行，snippet=直接粘贴的文本 */
  target: string
  /** shell 命令的工作目录 */
  cwd?: string
  icon?: string
}

/**
 * 站内快捷搜索：把关键词拼进任意站点的搜索 URL。
 * url 里用 `{Query}`（原始）或 `{query}`（URL 编码）占位。
 */
export interface Quicklink {
  id: string
  name: string
  /** 触发词，如 gh */
  keyword: string
  url: string
  icon?: string
}

/**
 * 文本片段：支持占位符
 * {clipboard} {date} {time} {datetime} {weekday} {arg} {cursor}
 */
export interface Snippet {
  id: string
  name: string
  keyword: string
  text: string
  icon?: string
}

/** 浏览器书签里的一条网址 */
export interface Bookmark {
  id: string
  title: string
  url: string
  /** 所在文件夹路径，如「收藏夹栏/开发」 */
  path: string
  /** 来源浏览器，如 Chrome / Edge */
  source: string
}

/* ------------------------------------------------------------------ */
/* IPC 通道                                                            */
/* ------------------------------------------------------------------ */

export interface LumenApi {
  launcher: {
    hide(): Promise<void>
    /** 渲染层按内容尺寸调整窗口（列表变长 / 详情面板展开） */
    resize(size: { width: number; height: number }): Promise<void>
    paste(): Promise<void>
    openSettingsWindow(): Promise<void>
  }
  settings: {
    getAll(): Promise<AppSettings>
    set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<AppSettings>
    openFile(): Promise<void>
    setHotkey(accelerator: string): Promise<string>
    setAutoLaunch(enabled: boolean): Promise<boolean>
  }
  apps: {
    list(): Promise<AppInfo[]>
    rescan(): Promise<AppInfo[]>
    icon(pathOrAppId: string): Promise<string>
    open(target: string, useAppId?: boolean): Promise<boolean>
  }
  files: {
    status(): Promise<IndexStatus>
    query(query: string, limit?: number): Promise<FileEntry[]>
    reindex(): Promise<void>
    decorate(entry: FileEntry): Promise<FileEntry>
    open(path: string): Promise<boolean>
    reveal(path: string): Promise<void>
  }
  clipboard: {
    list(): Promise<ClipItem[]>
    copy(id: string): Promise<void>
    write(text: string): Promise<void>
    /** 读取系统剪贴板当前文本（片段占位符要用） */
    readText(): Promise<string>
    remove(id: string): Promise<ClipItem[]>
    clear(): Promise<void>
    togglePin(id: string): Promise<ClipItem[]>
    /** 图片条目的缩略图（data URL，已缩放），非图片返回空串 */
    thumbnail(id: string): Promise<string>
    /** 图片条目原图 data URL（长边不超过 1024） */
    imageData(id: string): Promise<string>
    /** 把图片条目另存为文件，返回保存路径（取消则为空） */
    saveImage(id: string): Promise<string>
  }
  windows: {
    list(): Promise<WindowEntry[]>
    focus(pid: number): Promise<boolean>
    close(pid: number): Promise<boolean>
    /** 把某个窗口摆放到指定位置（半屏/最大化/居中/移到下一块屏幕） */
    snap(pid: number, action: SnapAction): Promise<boolean>
  }
  /** 端口占用查询 */
  ports: {
    list(): Promise<PortEntry[]>
  }
  /** 进程管理 */
  processes: {
    /** 按内存占用排序的进程列表 */
    list(): Promise<ProcessEntry[]>
    kill(pid: number): Promise<boolean>
  }
  /** 附近的 Wi-Fi 网络 */
  wifi: {
    list(): Promise<WifiNetwork[]>
  },
  /** 插件市场与插件管理 */
  plugins: {
    /** 市场可安装列表 */
    market(): Promise<MarketPlugin[]>
    /** 本机已安装插件 */
    installed(): Promise<PluginInfo[]>
    /** 读取插件源码（渲染层执行用） */
    code(id: string): Promise<string>
    install(id: string): Promise<PluginInfo[]>
    uninstall(id: string): Promise<PluginInfo[]>
    setDisabled(id: string, disabled: boolean): Promise<PluginInfo[]>
    /** 插件目录，便于手动查看 */
    dir(): Promise<string>
  },
  /** 插件可用的键值存储（持久化在 userData/plugin-store.json） */
  storage: {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
    remove(key: string): Promise<void>
    keys(): Promise<string[]>
  }
  system: {
    run(
      action:
        | 'lock'
        | 'sleep'
        | 'hibernate'
        | 'shutdown'
        | 'restart'
        | 'logoff'
        | 'emptyTrash'
        | 'env'
        | 'publicIp'
    ): Promise<string>
    /** 打开系统入口：ms-settings: URI、.cpl、.msc 或可执行名 */
    open(target: string): Promise<string>
  }
  commands: {
    list(): Promise<UserCommand[]>
    reload(): Promise<UserCommand[]>
  }
  shell: {
    openExternal(url: string): Promise<void>
    run(command: string, cwd?: string): Promise<void>
  }
  quicklinks: {
    list(): Promise<Quicklink[]>
    save(list: Quicklink[]): Promise<Quicklink[]>
  }
  snippets: {
    list(): Promise<Snippet[]>
    save(list: Snippet[]): Promise<Snippet[]>
  }
  browser: {
    bookmarks(): Promise<Bookmark[]>
  }
  ai: {
    chat(prompt: string): Promise<string>
  }
  app: {
    info(): Promise<MachineInfo>
    relaunch(): Promise<void>
  }
  usage: {
    all(): Promise<UsageMap>
    record(key: string): Promise<void>
    pin(key: string, pinned: boolean): Promise<UsageMap>
    reset(): Promise<void>
  }
  /** 主进程推送给渲染层的事件 */
  on(channel: LumenEventChannel, listener: (...args: any[]) => void): () => void
}

/** 单个条目的使用统计 */
export interface UsageRecord {
  count: number
  lastUsed: number
  pinned?: boolean
}

export type UsageMap = Record<string, UsageRecord>

export interface MachineInfo {
  version: string
  platform: string
  dataDir: string
  commandsFile: string
  quicklinksFile: string
  snippetsFile: string
}

export type LumenEventChannel = 'window:shown' | 'window:hidden' | 'settings:changed' | 'index:status'
