import type { SnapAction, WindowEntry } from '@shared/types'
import { powershell, powershellJson, psQuote } from '../util/powershell'

/**
 * 窗口管理：枚举已打开的可见窗口，并把某个窗口切到前台。
 *
 * Electron 没有跨平台窗口枚举/激活 API，这里用 PowerShell + user32 P/Invoke 实现。
 * 关键点：非前台进程直接调用 SetForegroundWindow 经常无效（Windows 会忽略请求，
 * 只让任务栏闪烁），所以先用 AttachThreadInput 把本线程挂到前台线程上再激活，
 * 这是 Windows 上最可靠的通用方案。
 */
const CS_LINES = [
  '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);',
  '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);',
  '[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);',
  '[DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);',
  '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
  '[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);',
  '[DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);',
  '[StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }',
  '[DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);',
  '[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int hh, uint flags);',
  '[DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);',
  '[DllImport("user32.dll")] public static extern IntPtr MonitorFromPoint(POINT p, uint flags);',
  '[StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }',
  '[StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT Monitor; public RECT Work; public uint Flags; }',
  '[DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr h, ref MONITORINFO info);',
  '',
  'public static RECT WorkAreaOf(IntPtr h) {',
  '  var mi = new MONITORINFO(); mi.cbSize = System.Runtime.InteropServices.Marshal.SizeOf(mi);',
  '  GetMonitorInfo(MonitorFromWindow(h, 2), ref mi);',
  '  return mi.Work;',
  '}',
  '',
  'public static void Activate(IntPtr h) {',
  '  uint dummy;',
  '  if (IsIconic(h)) { ShowWindow(h, 9); }',
  '  uint fg = GetWindowThreadProcessId(GetForegroundWindow(), out dummy);',
  '  uint target = GetWindowThreadProcessId(h, out dummy);',
  '  if (fg != target && fg != 0 && target != 0) {',
  '    AttachThreadInput(fg, target, true);',
  '    SetForegroundWindow(h);',
  '    AttachThreadInput(fg, target, false);',
  '  } else {',
  '    SetForegroundWindow(h);',
  '  }',
  '  BringWindowToTop(h);',
  '  ShowWindow(h, 5);',
  '}'
]

const CS_SOURCE = ['using System;', 'using System.Runtime.InteropServices;', 'namespace LumenWin32 {', 'public class Activator {', ...CS_LINES, '} }'].join('\n')

/** 编译 Helper DLL 的 PowerShell 片段，用单引号 here-string 避免变量被插值 */
const ADD_TYPE = `Add-Type -TypeDefinition @'\n${CS_SOURCE}\n'@ -ErrorAction SilentlyContinue`

/** 跨多块屏幕时找「下一块屏幕」用的 System.Windows.Forms 支持 */
const ADD_FORMS = 'Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue'

export async function listWindows(): Promise<WindowEntry[]> {
  const script = [
    '$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne \'\' -and $_.Id -ne $PID }',
    '$out = foreach ($p in $procs) {',
    '  $path = \'\'',
    '  try { $path = $p.Path } catch { }',
    '  [pscustomobject]@{ pid = $p.Id; process = $p.ProcessName; title = $p.MainWindowTitle; path = $path }',
    '}',
    'if ($out) { $out | ConvertTo-Json -Compress -Depth 3 } else { \'[]\' }'
  ].join('\n')

  const raw = await powershellJson<{ pid: number; process: string; title: string; path: string }>(script, 8000)

  return raw
    .filter((w) => w && w.title && w.pid)
    .map((w) => ({
      pid: Number(w.pid),
      process: String(w.process ?? ''),
      title: String(w.title ?? ''),
      path: String(w.path ?? '')
    }))
}

export async function focusWindow(pid: number): Promise<boolean> {
  const script = [
    ADD_TYPE,
    `$p = Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue`,
    'if (-not $p -or $p.MainWindowHandle -eq 0) { exit 1 }',
    '[LumenWin32.Activator]::Activate($p.MainWindowHandle)',
    'exit 0'
  ].join('\n')

  try {
    await powershell(script, 8000)
    return true
  } catch {
    return false
  }
}

export async function closeWindow(pid: number): Promise<boolean> {
  try {
    await powershell(`Stop-Process -Id ${Number(pid)} -Force -ErrorAction Stop`, 6000)
    return true
  } catch {
    return false
  }
}

/** 把当前前台窗口记录下来，供「粘贴后自动回到原窗口」使用 */
export async function focusLastWindow(): Promise<void> {
  const script = [
    ADD_TYPE,
    '$h = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne \'\' } |',
    '  Where-Object { $_.MainWindowHandle -ne (Get-Process -Id $PID).MainWindowHandle } |',
    '  Select-Object -First 1',
    'if ($h) { [LumenWin32.Activator]::Activate($h.MainWindowHandle) }'
  ].join('\n')
  try {
    await powershell(script, 6000)
  } catch {
    /* 忽略 */
  }
}

/**
 * 隐藏启动器窗口后，模拟 Ctrl+V 把剪贴板内容粘到上一个活动窗口里。
 * 顺序很重要：先激活目标窗口 → 等焦点稳定 → 再发送按键。
 */
export async function sendPaste(): Promise<void> {
  const script = [
    ADD_TYPE,
    'Start-Sleep -Milliseconds 220',
    '$h = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne \'\' } | Select-Object -First 1',
    'if ($h) { [LumenWin32.Activator]::Activate($h.MainWindowHandle) }',
    'Start-Sleep -Milliseconds 260',
    '$ws = New-Object -ComObject WScript.Shell',
    '$ws.SendKeys("^v")'
  ].join(';')
  try {
    await powershell(script, 8000)
  } catch {
    /* 忽略 */
  }
}

/** 把某个可执行文件路径（或其中的进程名）对应的窗口提到前台 */
export async function focusByPath(targetPath: string): Promise<void> {
  const name = psQuote(targetPath.replace(/^.*\\/, '').replace(/\.exe$/i, ''))
  const script = `${ADD_TYPE};$p = Get-Process -Name ${name} -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1; if ($p) { [LumenWin32.Activator]::Activate($p.MainWindowHandle) }`
  try {
    await powershell(script, 6000)
  } catch {
    /* 忽略 */
  }
}

/* --------------------------------------------------------------------- */
/* 窗口分屏 / 摆放                                                        */
/* --------------------------------------------------------------------- */

/**
 * 把窗口摆放到指定位置。
 * 半屏取目标显示器的工作区（不含任务栏），跨屏移动则按窗口中心点找下一块屏幕。
 */
export async function snapWindow(pid: number, action: SnapAction): Promise<boolean> {
  const p = Number(pid)
  const lines: string[] = [ADD_TYPE]
  switch (action) {
    case 'maximize':
      lines.push(`$h = (Get-Process -Id ${p}).MainWindowHandle`, '[LumenWin32.Activator]::ShowWindow($h, 3)')
      break
    case 'minimize':
      lines.push(`$h = (Get-Process -Id ${p}).MainWindowHandle`, '[LumenWin32.Activator]::ShowWindow($h, 6)')
      break
    case 'left':
    case 'right':
      lines.push(
        `$h = (Get-Process -Id ${p}).MainWindowHandle`,
        '$w = [LumenWin32.Activator]::WorkAreaOf($h)',
        `$x = if ('${action}' -eq 'left') { $w.Left } else { [int](($w.Left + $w.Right) / 2) }`,
        '$half = [int](($w.Right - $w.Left) / 2)',
        `[LumenWin32.Activator]::ShowWindow($h, 9); [void][LumenWin32.Activator]::SetWindowPos($h, [IntPtr]::Zero, $x, $w.Top, $half, ($w.Bottom - $w.Top), 0x0040)`
      )
      break
    case 'center':
      lines.push(
        `$h = (Get-Process -Id ${p}).MainWindowHandle`,
        '$r = New-Object LumenWin32.Activator+RECT',
        '[void][LumenWin32.Activator]::GetWindowRect($h, [ref]$r)',
        '$w = [LumenWin32.Activator]::WorkAreaOf($h)',
        '$ww = $r.Right - $r.Left; $wh = $r.Bottom - $r.Top',
        `$cx = $w.Left + [int](($w.Right - $w.Left - $ww) / 2); $cy = $w.Top + [int](($w.Bottom - $w.Top - $wh) / 2)`,
        '[void][LumenWin32.Activator]::SetWindowPos($h, [IntPtr]::Zero, $cx, $cy, $ww, $wh, 0x0040)'
      )
      break
    case 'nextDisplay':
      lines.push(
        ADD_FORMS,
        `$h = (Get-Process -Id ${p}).MainWindowHandle`,
        '$r = New-Object LumenWin32.Activator+RECT',
        '[void][LumenWin32.Activator]::GetWindowRect($h, [ref]$r)',
        '$cx = ($r.Left + $r.Right) / 2; $cy = ($r.Top + $r.Bottom) / 2',
        '$screens = [System.Windows.Forms.Screen]::AllScreens',
        'if ($screens.Count -lt 2) { exit 0 }',
        '$idx = 0',
        'for ($i = 0; $i -lt $screens.Count; $i++) {',
        '  $b = $screens[$i].Bounds',
        '  if ($cx -ge $b.Left -and $cx -lt $b.Right -and $cy -ge $b.Top -and $cy -lt $b.Bottom) { $idx = $i; break }',
        '}',
        '$t = $screens[($idx + 1) % $screens.Count].WorkingArea',
        '$ww = $r.Right - $r.Left; $wh = $r.Bottom - $r.Top',
        `$ncx = $t.Left + [int](($t.Width - $ww) / 2); $ncy = $t.Top + [int](($t.Height - $wh) / 2)`,
        '[void][LumenWin32.Activator]::SetWindowPos($h, [IntPtr]::Zero, $ncx, $ncy, $ww, $wh, 0x0040)'
      )
      break
    default:
      return false
  }
  try {
    await powershell(lines.join('\n'), 8000)
    return true
  } catch {
    return false
  }
}
