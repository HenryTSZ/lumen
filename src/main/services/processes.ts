import type { ProcessEntry } from '@shared/types'
import { powershell, powershellJson } from '../util/powershell'

/**
 * 进程管理：按内存占用列出进程，并支持强制结束。
 * 结束进程用 Stop-Process；进程名映射交给渲染层展示。
 */
export async function listProcesses(limit = 80): Promise<ProcessEntry[]> {
  const script = [
    '$out = Get-Process |',
    '  Where-Object { $_.Id -ne $PID } |',
    '  Sort-Object WorkingSet64 -Descending |',
    `  Select-Object -First ${Number(limit)} |`,
    '  ForEach-Object {',
    '    $title = \'\'',
    '    try { $title = $_.MainWindowTitle } catch { }',
    '    [pscustomobject]@{ pid = $_.Id; name = $_.ProcessName; title = $title; memMB = [math]::Round($_.WorkingSet64 / 1MB, 1) }',
    '  }',
    'if ($out) { $out | ConvertTo-Json -Compress -Depth 3 } else { \'[]\' }'
  ].join('\n')

  const raw = await powershellJson<{ pid: number; name: string; title: string; memMB: number }>(script, 8000)
  return raw
    .filter((p) => p && p.pid)
    .map((p) => ({
      pid: Number(p.pid),
      name: String(p.name ?? ''),
      title: String(p.title ?? ''),
      memMB: Number(p.memMB ?? 0)
    }))
}

export async function killProcess(pid: number): Promise<boolean> {
  try {
    await powershell(`Stop-Process -Id ${Number(pid)} -Force -ErrorAction Stop`, 6000)
    return true
  } catch {
    return false
  }
}
