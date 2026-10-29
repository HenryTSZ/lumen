import type { AppSettings, AppInfo } from '@shared/types'
import { readJson, writeJson } from '../store'
import { powershellJson } from '../util/powershell'

const KEY = 'app-cache.json'

/** 已安装应用列表扫描脚本结果 */
interface RawApp {
  name?: string
  path?: string
  appId?: string
  source?: string
}

/**
 * 应用层 —— 负责扫描本机已安装应用。
 * 数据来自三个渠道：
 *   1. 开始菜单快捷方式（最贴近用户在开始菜单里看到的应用名）
 *   2. 注册表 App Paths（系统登记的可执行文件）
 *   3. UWP / Store 应用（Get-StartApps，只能通过 shell:AppsFolder 启动）
 */
export class ApplicationService {
  private apps: AppInfo[] = []
  private iconCache = new Map<string, string>()
  private lastScan = 0

  constructor() {
    // 先用磁盘缓存兜底，保证冷启动的第一帧就有结果
    this.apps = readJson<AppInfo[]>(KEY, [])
  }

  get list(): AppInfo[] {
    return this.apps
  }

  /** 由 IPC 调用：返回缓存，并在过期时后台静默刷新 */
  async getAppList(): Promise<AppInfo[]> {
    const stale = Date.now() - this.lastScan > 10 * 60 * 1000
    if (this.apps.length === 0 || stale) {
      void this.scan()
    }
    return this.apps
  }

  /** 强制重新扫描（用户在设置里点了「重建应用缓存」） */
  async scan(): Promise<AppInfo[]> {
    const script = buildScanScript()
    const raw = await powershellJson<RawApp>(script, 30000)
    const seen = new Set<string>()
    const apps: AppInfo[] = []

    for (const item of raw) {
      const name = (item.name ?? '').trim()
      const path = (item.path ?? '').trim()
      const appId = (item.appId ?? '').trim()
      if (!name) continue
      const source = (item.source as AppInfo['source']) ?? 'startmenu'
      const key = `${source}:${appId || path}`.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      apps.push({
        id: Buffer.from(key).toString('base64url'),
        name,
        path,
        appId: appId || undefined,
        source
      })
    }

    // 去重：同名优先保留开始菜单来源（名称更本地化、更像用户认知里的应用名）
    apps.sort((a, b) => {
      const rank = (s: AppInfo['source']) => (s === 'startmenu' ? 0 : s === 'uwp' ? 1 : 2)
      return rank(a.source) - rank(b.source)
    })
    const dedup = new Map<string, AppInfo>()
    for (const app of apps) {
      const k = app.name.toLowerCase()
      if (!dedup.has(k)) dedup.set(k, app)
    }

    this.apps = [...dedup.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    this.lastScan = Date.now()
    writeJson(KEY, this.apps)
    return this.apps
  }

  cacheIcon(key: string, dataUrl: string): void {
    this.iconCache.set(key, dataUrl)
  }

  getCachedIcon(key: string): string | undefined {
    return this.iconCache.get(key)
  }

  get size(): number {
    return this.apps.length
  }
}

function buildScanScript(): string {
  return `
$sh = New-Object -ComObject WScript.Shell
$arr = New-Object System.Collections.ArrayList
$seen = @{}

$roots = @(
  (Join-Path $env:ProgramData 'Microsoft\\Windows\\Start Menu\\Programs'),
  (Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs')
)
foreach ($root in $roots) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  $links = Get-ChildItem -LiteralPath $root -Recurse -File -Include *.lnk -ErrorAction SilentlyContinue
  foreach ($link in $links) {
    try {
      $target = $sh.CreateShortcut($link.FullName).TargetPath
    } catch { $target = '' }
    if (-not $target) { continue }
    if (($target -notmatch '\\.(exe|bat|cmd|msc|cpl)$') -and -not (Test-Path -LiteralPath $target)) { continue }
    $key = $target.ToLower()
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    $null = $arr.Add([pscustomobject]@{
      name = [System.IO.Path]::GetFileNameWithoutExtension($link.Name)
      path = $target
      appId = ''
      source = 'startmenu'
    })
  }
}

$regPaths = Get-ChildItem -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths' -ErrorAction SilentlyContinue
foreach ($reg in $regPaths) {
  $target = [string]$reg.GetValue($null)
  $target = $target.Trim('"')
  if (-not $target) { continue }
  $key = $target.ToLower()
  if ($seen.ContainsKey($key)) { continue }
  if (-not (Test-Path -LiteralPath $target)) { continue }
  $seen[$key] = $true
  $null = $arr.Add([pscustomobject]@{
    name = [System.IO.Path]::GetFileNameWithoutExtension($target)
    path = $target
    appId = ''
    source = 'registry'
  })
}

$uwp = Get-StartApps -ErrorAction SilentlyContinue
foreach ($app in $uwp) {
  if (-not $app.AppID) { continue }
  $key = $app.AppID.ToLower()
  if ($seen.ContainsKey($key)) { continue }
  $seen[$key] = $true
  $null = $arr.Add([pscustomobject]@{
    name = $app.Name
    path = ''
    appId = $app.AppID
    source = 'uwp'
  })
}

if ($arr.Count -eq 0) { '[]' } else { $arr | ConvertTo-Json -Compress -Depth 4 }
`.trim()
}

/** 默认全局设定在调用方注入，避免循环依赖 */
export interface AppServiceDeps {
  getSettings(): AppSettings
}

export const applications = new ApplicationService()
