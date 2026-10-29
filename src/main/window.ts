import { BrowserWindow, screen, ipcMain, nativeImage, Tray, Menu, app, shell } from 'electron'
import { join } from 'node:path'
import { store } from './store'

export const WINDOW_WIDTH = 780
const MIN_HEIGHT = 118
const TOP_RATIO = 0.2

let win: BrowserWindow | null = null
let tray: Tray | null = null
let lastFocusTimer: NodeJS.Timeout | null = null

/** 资源文件路径：开发态读项目目录，打包态读 app resources */
export function resourcePath(file: string): string {
  if (app.isPackaged) return join(process.resourcesPath, file)
  return join(__dirname, '../../resources', file)
}

export function getWindow(): BrowserWindow | null {
  return win
}

export function createLauncherWindow(): BrowserWindow {
  const workArea = screen.getPrimaryDisplay().workAreaSize
  const height = Math.min(560, Math.round(workArea.height * 0.72))

  win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height,
    minHeight: MIN_HEIGHT,
    maxHeight: Math.round(workArea.height * 0.86),
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    transparent: true,
    hasShadow: true,
    paintWhenInitiallyHidden: false,
    backgroundColor: '#00000000',
    title: 'Lumen',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  })

  // Windows 11 亚克力材质：给窗口底层的原生磨砂质感
  try {
    win.setBackgroundMaterial?.('acrylic')
  } catch {
    /* Windows 10 及以下不支持，回落到渲染层的半透明背景 */
  }

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.menuBarVisible = false
  win.loadURL(getRendererUrl())

  win.on('blur', () => {
    if (win?.webContents.isDevToolsOpened()) return
    hideLauncher()
  })

  win.on('closed', () => {
    win = null
  })

  return win
}

function getRendererUrl(): string {
  if (process.env.ELECTRON_RENDERER_URL) return process.env.ELECTRON_RENDERER_URL
  return `file://${join(__dirname, '../renderer/index.html')}`
}

/** 把窗口定位到光标所在屏幕的上方 1/5 处，水平居中 */
function positionWindow(): void {
  if (!win) return
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const { x, y, width, height } = display.workArea
  const bounds = win.getBounds()
  const left = Math.round(x + (width - bounds.width) / 2)
  const top = Math.round(y + height * TOP_RATIO)
  win.setBounds({ x: left, y: top, width: bounds.width, height: bounds.height })
}

export function showLauncher(): void {
  if (!win) {
    createLauncherWindow()
  }
  const w = win!
  if (w.isVisible() && w.isFocused()) return

  positionWindow()
  w.setAlwaysOnTop(true, 'screen-saver')
  w.show()
  w.focus()
  w.webContents.send('window:shown')

  // Electron 在某些显卡/Win10 组合下会有 focus 竞态，补一次
  if (lastFocusTimer) clearTimeout(lastFocusTimer)
  lastFocusTimer = setTimeout(() => {
    if (w.isVisible() && !w.isFocused()) w.focus()
  }, 60)
}

export function hideLauncher(): void {
  if (!win || !win.isVisible()) return
  win.webContents.send('window:hidden')
  win.hide()
}

export function toggleLauncher(): void {
  if (win?.isVisible()) hideLauncher()
  else showLauncher()
}

/** 渲染层根据结果数量 / 详情面板动态调整窗口尺寸 */
export function setWindowSize(size: { width: number; height: number }): void {
  if (!win || !win.isVisible()) return
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const maxHeight = Math.round(display.workArea.height * 0.86)
  const width = Math.max(WINDOW_WIDTH, Math.min(Math.round(size.width), Math.round(display.workArea.width * 0.92)))
  const height = Math.max(MIN_HEIGHT, Math.min(Math.round(size.height), maxHeight))
  const bounds = win.getBounds()
  if (Math.abs(bounds.height - height) < 2 && Math.abs(bounds.width - width) < 2) return
  // 水平方向始终居中，垂直保持顶部锚点，避免窗口「抖动」
  const left = Math.round(display.workArea.x + (display.workArea.width - width) / 2)
  win.setBounds({ x: left, y: bounds.y, width, height })
}

export function setupTray(): void {
  if (!store.get('showInTray')) return
  const iconPath = resourcePath('tray.png')
  const image = nativeImage.createFromPath(iconPath)
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  tray.setToolTip('Lumen — Alt+Space 唤起')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示 Lumen', click: () => showLauncher() },
      { type: 'separator' },
      { label: '打开配置目录', click: () => shell.openPath(store.dir) },
      {
        label: '开机自启',
        type: 'checkbox',
        checked: store.get('launchAtLogin'),
        click: (item) => {
          store.set('launchAtLogin', item.checked)
          applyAutoLaunch(item.checked)
        }
      },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() }
    ])
  )
  tray.on('click', () => toggleLauncher())
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

export function applyAutoLaunch(enabled: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      args: ['--startup'],
      name: 'Lumen'
    })
  } catch (error) {
    console.error('[autolaunch] 设置失败', error)
  }
}

/** renderer → main 的窗口控制（隐藏、改高度）挂载点 */
export function registerWindowIpc(): void {
  ipcMain.handle('launcher:hide', () => hideLauncher())
  ipcMain.handle('launcher:resize', (_e, size: { width: number; height: number }) => setWindowSize(size))
  ipcMain.handle('launcher:open-settings', () => shell.openPath(store.dir))
}
