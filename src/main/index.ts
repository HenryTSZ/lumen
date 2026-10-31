import { app, globalShortcut, ipcMain, BrowserWindow } from 'electron'
import { store } from './store'
import { registerIpcHandlers, broadcast, reapplyHotkeys } from './ipc'
import {
  applyAutoLaunch,
  createLauncherWindow,
  destroyTray,
  getWindow,
  hideLauncher,
  registerWindowIpc,
  setupTray,
  showLauncher,
  toggleLauncher
} from './window'
import { applications } from './services/applications'
import { clipboardService } from './services/clipboard'
import { files } from './services/files'
import { userCommands } from './services/commands'

const APP_ID = 'Lumen.Launcher'

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showLauncher())
  app.whenReady().then(bootstrap)
}

function bootstrap(): void {
  app.setAppUserModelId(APP_ID)
  registerWindowIpc()
  registerIpcHandlers()
  registerHotkeyActions()

  // 开机自启：--startup 参数下只驻留，不弹窗
  if (store.get('launchAtLogin')) applyAutoLaunch(true)
  if (!process.argv.includes('--startup')) {
    // 预热窗口，首次唤起更快
    createLauncherWindow()
  }

  setupTray()
  clipboardService.start()
  userCommands.load()
  void files.bootstrap(store.getAll())
  void applications.scan().then(() => broadcast('index:status', files.indexStatus))

  registerGlobalHotkeys()

  app.on('activate', () => showLauncher())
  // 所有窗口关闭时不退出：启动器需要常驻后台等待下一次唤起
  app.on('window-all-closed', () => {
    /* no-op：由托盘或显式退出结束进程 */
  })
  app.on('before-quit', () => {
    globalShortcut.unregisterAll()
    clipboardService.stop()
    destroyTray()
    store.flush()
  })
}

/** 注册主唤起键 + 用户命令快捷键（失败自动降级并写回设置） */
function registerGlobalHotkeys(): void {
  reapplyHotkeys()
}

/** 设置变更时需要主进程配合处理的动作 */
function registerHotkeyActions(): void {
  ipcMain.handle('settings:set-hotkey', (_e, accelerator: string) => {
    store.set('hotkey', accelerator)
    reapplyHotkeys()
    return store.getAll().hotkey
  })
  ipcMain.handle('settings:set-autolaunch', (_e, enabled: boolean) => {
    store.set('launchAtLogin', enabled)
    applyAutoLaunch(enabled)
    return enabled
  })
  ipcMain.handle('launcher:show', () => showLauncher())
  ipcMain.handle('launcher:toggle', () => toggleLauncher())
  ipcMain.handle('app:relaunch', () => {
    app.relaunch()
    app.exit(0)
  })
}

export function activeWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? getWindow()
}

export { hideLauncher }
