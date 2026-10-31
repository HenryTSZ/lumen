import { app, ipcMain, shell, clipboard } from 'electron'
import { execFile, spawn } from 'node:child_process'
import { join } from 'node:path'
import type {
  AppSettings,
  Bookmark,
  ClipItem,
  FileEntry,
  MarketPlugin,
  PluginInfo,
  PortEntry,
  ProcessEntry,
  Quicklink,
  SnapAction,
  Snippet,
  SystemAction,
  UserCommand,
  WifiNetwork,
  WindowEntry
} from '@shared/types'
import { store } from './store'
import { applications } from './services/applications'
import { clipboardService } from './services/clipboard'
import { files } from './services/files'
import { closeWindow, focusWindow, listWindows, sendPaste, snapWindow } from './services/windows'
import { openSystemTarget, runSystemAction } from './services/system'
import { listPorts } from './services/ports'
import { killProcess, listProcesses } from './services/processes'
import { listWifi } from './services/wifi'
import {
  installPlugin,
  installedPlugins,
  marketPlugins,
  pluginCode,
  pluginDir,
  setDisabled as setPluginDisabled,
  uninstallPlugin
} from './services/plugins'
import { storageGet, storageKeys, storageRemove, storageSet } from './services/storage'
import { userCommands } from './services/commands'
import { usage } from './services/usage'
import { quicklinks, snippets } from './services/data'
import { bookmarks } from './services/bookmarks'
import { createLauncherWindow, getWindow, hideLauncher, registerWindowIpc, showLauncher, toggleLauncher } from './window'
import { applyHotkeys } from './services/hotkeys'
import { checkNow, installNow } from './services/updater'

/**
 * （重新）注册所有全局快捷键：主唤起键 + 命令快捷键。
 * 唤起键被占用时自动降级并把结果写回设置。
 */
export function reapplyHotkeys(): { launcherKey: string; failed: string[] } {
  const result = applyHotkeys(store.getAll(), {
    toggleLauncher: () => toggleLauncher(),
    runCommand: (query) => {
      showLauncher()
      getWindow()?.webContents.send('hotkey:trigger', query)
    }
  })
  if (result.launcherKey && result.launcherKey !== store.get('hotkey')) {
    store.set('hotkey', result.launcherKey)
    broadcast('settings:changed', store.getAll())
  }
  for (const accelerator of result.failed) {
    console.warn(`[hotkeys] 快捷键 ${accelerator} 注册失败（可能被其他程序占用或冲突）`)
  }
  return result
}

export function registerIpcHandlers(): void {
  registerWindowIpc()

  /* ---------------- 设置 ---------------- */
  ipcMain.handle('settings:get', (): AppSettings => store.getAll())
  ipcMain.handle('settings:set', (_e, patch: Partial<AppSettings>): AppSettings => {
    const next = store.patch(patch)
    // 快捷键相关字段变化时需要主进程重新注册
    if ('hotkey' in patch || 'commandHotkeys' in patch) reapplyHotkeys()
    broadcast('settings:changed', next)
    return next
  })
  ipcMain.handle('settings:open-file', () => {
    shell.openPath(store.dir)
  })

  /* ---------------- 应用 ---------------- */
  ipcMain.handle('apps:list', () => applications.getAppList())
  ipcMain.handle('apps:rescan', () => applications.scan())
  ipcMain.handle('apps:icon', async (_e, pathOrAppId: string): Promise<string> => {
    const cached = applications.getCachedIcon(pathOrAppId)
    if (cached) return cached
    if (!pathOrAppId || pathOrAppId.includes('!')) return ''
    try {
      const image = await app.getFileIcon(pathOrAppId, { size: 'large' })
      const dataUrl = image.toDataURL()
      applications.cacheIcon(pathOrAppId, dataUrl)
      return dataUrl
    } catch {
      return ''
    }
  })
  ipcMain.handle('apps:open', async (_e, target: string, useAppId = false) => {
    hideLauncher()
    if (!target) return false
    try {
      if (useAppId) {
        execFile('explorer.exe', [`shell:AppsFolder\\${target}`])
        return true
      }
      if (/\.(msc|cpl)$/i.test(target)) {
        execFile('mmc.exe', [target])
        return true
      }
      const error = await shell.openPath(target)
      return error === ''
    } catch {
      return false
    }
  })

  /* ---------------- 文件 ---------------- */
  ipcMain.handle('files:status', () => files.indexStatus)
  ipcMain.handle('files:query', async (_e, query: string, limit?: number): Promise<FileEntry[]> =>
    files.query(store.getAll(), query, limit ?? 40)
  )
  ipcMain.handle('files:reindex', async () => {
    await files.reindex(store.getAll())
  })
  ipcMain.handle('files:open', async (_e, path: string) => {
    hideLauncher()
    const error = await shell.openPath(path)
    return error === ''
  })
  ipcMain.handle('files:reveal', (_e, path: string) => {
    hideLauncher()
    shell.showItemInFolder(path)
  })
  ipcMain.handle('files:decorate', async (_e, entry: FileEntry) => files.decorate(entry))

  /* ---------------- 剪贴板 ---------------- */
  ipcMain.handle('clip:list', (): ClipItem[] => clipboardService.list())
  ipcMain.handle('clip:copy', async (_e, id: string) => {
    clipboardService.copy(id)
    hideLauncher()
    await sendPaste()
  })
  ipcMain.handle('clip:write', (_e, text: string) => clipboardService.write(text))
  ipcMain.handle('clip:remove', (_e, id: string) => clipboardService.remove(id))
  ipcMain.handle('clip:clear', () => clipboardService.clear())
  ipcMain.handle('clip:toggle-pin', (_e, id: string) => clipboardService.togglePin(id))
  ipcMain.handle('clip:read-now', () => clipboard.readText())
  ipcMain.handle('clip:thumbnail', (_e, id: string) => clipboardService.thumbnail(id))
  ipcMain.handle('clip:image-data', (_e, id: string) => clipboardService.imageData(id))
  ipcMain.handle('clip:save-image', async (_e, id: string) => clipboardService.saveImageAs(id))

  /* ---------------- 窗口切换 ---------------- */
  ipcMain.handle('win:list', (): Promise<WindowEntry[]> => listWindows())
  ipcMain.handle('win:focus', async (_e, pid: number) => {
    hideLauncher()
    return focusWindow(pid)
  })
  ipcMain.handle('win:close', async (_e, pid: number) => closeWindow(pid))
  ipcMain.handle('win:snap', async (_e, pid: number, action: SnapAction) => {
    if (action !== 'minimize') hideLauncher()
    return snapWindow(pid, action)
  })

  /* ---------------- 端口 / 进程 / Wi-Fi ---------------- */
  ipcMain.handle('ports:list', (): Promise<PortEntry[]> => listPorts())
  ipcMain.handle('procs:list', (): Promise<ProcessEntry[]> => listProcesses())
  ipcMain.handle('procs:kill', (_e, pid: number) => killProcess(pid))
  ipcMain.handle('wifi:list', (): Promise<WifiNetwork[]> => listWifi())

  /* ---------------- 插件市场 ---------------- */
  ipcMain.handle('plugins:market', (): Promise<MarketPlugin[]> => marketPlugins())
  ipcMain.handle('plugins:installed', (): PluginInfo[] => installedPlugins())
  ipcMain.handle('plugins:code', (_e, id: string): string => pluginCode(id))
  ipcMain.handle('plugins:install', async (_e, id: string): Promise<PluginInfo[]> => installPlugin(id))
  ipcMain.handle('plugins:uninstall', (_e, id: string): PluginInfo[] => uninstallPlugin(id))
  ipcMain.handle('plugins:set-disabled', (_e, id: string, disabled: boolean): PluginInfo[] =>
    setPluginDisabled(id, disabled)
  )
  ipcMain.handle('plugins:dir', (): string => pluginDir())

  /* ---------------- 插件存储 ---------------- */
  ipcMain.handle('storage:get', (_e, key: string) => storageGet(key))
  ipcMain.handle('storage:set', (_e, key: string, value: unknown) => storageSet(key, value))
  ipcMain.handle('storage:remove', (_e, key: string) => storageRemove(key))
  ipcMain.handle('storage:keys', () => storageKeys())

  /* ---------------- 系统命令 ---------------- */
  ipcMain.handle('system:run', (_e, action: SystemAction) => {
    if (action !== 'publicIp') hideLauncher()
    return runSystemAction(action)
  })

  /* Windows 设置 URI / 控制面板 / 管理工具 */
  ipcMain.handle('system:open', (_e, target: string): Promise<string> => {
    hideLauncher()
    return openSystemTarget(target)
  })

  /* ---------------- 用户扩展命令 ---------------- */
  ipcMain.handle('commands:list', (): UserCommand[] => userCommands.list())
  ipcMain.handle('commands:reload', (): UserCommand[] => userCommands.load())

  /* ---------------- 外壳执行 ---------------- */
  ipcMain.handle('shell:external', (_e, url: string) => {
    hideLauncher()
    shell.openExternal(url)
  })
  ipcMain.handle('shell:run', (_e, command: string, cwd?: string) => {
    hideLauncher()
    try {
      const child = spawn(command, {
        shell: true,
        detached: true,
        stdio: 'ignore',
        cwd: cwd || undefined,
        windowsHide: true
      })
      child.unref()
    } catch (error) {
      console.error('[shell:run] 失败', error)
    }
  })

  /* ---------------- AI ---------------- */
  ipcMain.handle('ai:chat', async (_e, prompt: string): Promise<string> => {
    const settings = store.getAll()
    const { baseUrl, apiKey, model } = settings.ai
    if (!apiKey) return '⚠️ 请先在设置里配置 AI 的 API Key'
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content:
                '你是一个嵌入在桌面启动器里的高效助手。回答简洁、直接、可操作，使用与用户相同的语言。除非用户要求，不要使用 Markdown 标题。'
            },
            { role: 'user', content: prompt }
          ]
        })
      })
      if (!response.ok) return `⚠️ 请求失败（${response.status}）：${await response.text()}`
      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      return json.choices?.[0]?.message?.content?.trim() || '（无返回内容）'
    } catch (error) {
      return `⚠️ ${String(error)}`
    }
  })

  /* ---------------- 效率工具箱：快捷搜索 / 片段 / 书签 ---------------- */
  ipcMain.handle('quicklinks:list', (): Quicklink[] => quicklinks.list())
  ipcMain.handle('quicklinks:save', (_e, list: Quicklink[]): Quicklink[] => quicklinks.save(list))
  ipcMain.handle('snippets:list', (): Snippet[] => snippets.list())
  ipcMain.handle('snippets:save', (_e, list: Snippet[]): Snippet[] => snippets.save(list))
  ipcMain.handle('browser:bookmarks', (): Bookmark[] => bookmarks())

  /* ---------------- 使用频率 ---------------- */
  ipcMain.handle('usage:all', () => usage.all())
  ipcMain.handle('usage:record', (_e, key: string) => usage.record(key))
  ipcMain.handle('usage:pin', (_e, key: string, pinned: boolean) => usage.pin(key, pinned))
  ipcMain.handle('usage:reset', () => usage.reset())

  /* ---------------- 环境信息 ---------------- */
  ipcMain.handle('app:machine', () => ({
    version: app.getVersion(),
    platform: process.platform,
    dataDir: store.dir,
    commandsFile: join(store.dir, 'commands.json'),
    quicklinksFile: join(store.dir, 'quicklinks.json'),
    snippetsFile: join(store.dir, 'snippets.json')
  }))

  /* ---------------- 自动更新 ---------------- */
  ipcMain.handle('updater:check', (): Promise<string> => checkNow())
  ipcMain.handle('updater:install', (): Promise<boolean> => Promise.resolve(installNow()))
}

export function broadcast(channel: string, payload: unknown): void {
  const window = getWindow()
  if (window && !window.isDestroyed()) window.webContents.send(channel, payload)
  if (!window) createLauncherWindow()
}
