import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { store } from '../store'

/**
 * 自动更新（对接 GitHub Releases）。
 *
 * - 打包后每 12 小时后台检查一次（可在设置关闭）
 * - 有新版本自动下载，完成后通知渲染层提示「重启更新」
 * - 开发模式（未打包）自动跳过，避免缺 app-update.yml 报错
 */

export type UpdaterStatus =
  | { status: 'checking' }
  | { status: 'none'; version: string }
  | { status: 'available'; version: string }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }

let broadcastRef: ((channel: string, payload: unknown) => void) | null = null
let wired = false
/** 正在下载/检查时避免重复触发 */
let busy = false

function emit(payload: UpdaterStatus): void {
  broadcastRef?.('update:status', payload)
}

function log(...args: unknown[]): void {
  console.log('[updater]', ...args)
}

function wire(): void {
  if (wired) return
  wired = true

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    busy = true
    emit({ status: 'checking' })
  })
  autoUpdater.on('update-not-available', (info) => {
    busy = false
    emit({ status: 'none', version: info?.version ?? app.getVersion() })
  })
  autoUpdater.on('update-available', (info) => {
    busy = false
    emit({ status: 'available', version: info?.version ?? '?' })
  })
  autoUpdater.on('update-downloaded', (info) => {
    busy = false
    emit({ status: 'downloaded', version: info?.version ?? '?' })
  })
  autoUpdater.on('error', (error) => {
    busy = false
    log('error', error?.message)
    // 网络问题是常态（离线机器），不打扰用户，只记日志
  })
}

/** 启动后台自动检查；开发环境直接跳过 */
export function initUpdater(broadcast: (channel: string, payload: unknown) => void): void {
  broadcastRef = broadcast
  if (!app.isPackaged) {
    log('dev 环境，跳过自动更新')
    return
  }
  wire()
  // 启动 10 秒后首查，避开冷启动；之后每 12 小时一次
  setTimeout(() => void backgroundCheck(), 10_000)
  setInterval(() => void backgroundCheck(), 12 * 3600_000)
}

async function backgroundCheck(): Promise<void> {
  if (!store.get('autoUpdate')) return
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    log('后台检查失败', error)
  }
}

/** 手动检查（设置面板触发），返回人类可读的结果文案 */
export async function checkNow(): Promise<string> {
  if (!app.isPackaged) return '开发模式下不可用：自动更新只在打包安装后生效'
  wire()
  if (busy) return '正在检查…'
  busy = true
  try {
    const result = await autoUpdater.checkForUpdates()
    const version = result?.updateInfo?.version
    if (result?.isUpdateAvailable) {
      // autoDownload=true 时会自动开始下载，这里只负责汇报
      return `发现新版本 ${version}，正在后台下载，完成后会提示重启`
    }
    return `当前已是最新版本（${version ?? app.getVersion()}）`
  } catch (error) {
    busy = false
    return `检查更新失败：${error instanceof Error ? error.message : String(error)}`
  }
}

/** 下载完成后重启并安装 */
export function installNow(): boolean {
  if (!app.isPackaged) return false
  try {
    autoUpdater.quitAndInstall()
    return true
  } catch (error) {
    log('安装失败', error)
    return false
  }
}
