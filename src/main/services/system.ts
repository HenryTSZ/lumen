import { execFile } from 'node:child_process'
import { shell } from 'electron'
import type { SystemAction } from '@shared/types'
import { powershell } from '../util/powershell'

/**
 * 系统级动作集合。全部走系统原生命令，不依赖第三方包。
 */
const POWER_CS =
  '[System.Runtime.InteropServices.DllImport("powrprof.dll")] public static extern uint SetSuspendState(bool hibernate, bool forceCritical, bool disableWakeEvent);'

export function runSystemAction(action: SystemAction): Promise<string> {
  switch (action) {
    case 'lock':
      return run('rundll32.exe', ['user32.dll,LockWorkStation'])
    case 'sleep':
      return ps(`${POWER_CS};Add-Type -Namespace LumenPower -Name Power -MemberDefinition @'\n${POWER_CS}\n'@ -ErrorAction SilentlyContinue;[LumenPower.Power]::SetSuspendState($false,$false,$false)`)
    case 'hibernate':
      return run('powercfg.exe', ['-h', 'on']).then(() =>
        ps(`${POWER_CS};Add-Type -Namespace LumenPower -Name Power -MemberDefinition @'\n${POWER_CS}\n'@ -ErrorAction SilentlyContinue;[LumenPower.Power]::SetSuspendState($true,$false,$false)`)
      )
    case 'shutdown':
      return run('shutdown.exe', ['/s', '/hybrid', '/t', '0']).then(() => '正在关机')
    case 'restart':
      return run('shutdown.exe', ['/r', '/t', '0']).then(() => '正在重启')
    case 'logoff':
      return run('shutdown.exe', ['/l']).then(() => '正在注销')
    case 'emptyTrash':
      return ps('Clear-RecycleBin -Force -ErrorAction SilentlyContinue').then(() => '回收站已清空')
    case 'env':
      return run('rundll32.exe', ['sysdm.cpl,EditEnvironmentVariables'])
    case 'publicIp':
      return ps(
        '(Invoke-RestMethod -Uri "https://api.ipify.org?format=text" -TimeoutSec 6 -UseBasicParsing).ToString().Trim()',
        10000
      )
    default:
      return Promise.resolve('未知操作')
  }
}

const URI_RE = /^[a-z][a-z0-9+.-]*:/i

/**
 * 打开一个系统入口：
 *   - `ms-settings:*` 这类 URI 交给 ShellExecute（shell.openExternal）
 *   - `.cpl` / `.msc` / 可执行名交给 cmd 的 start（控制面板、设备管理器等管理工具）
 */
export async function openSystemTarget(target: string): Promise<string> {
  const value = target.trim()
  if (!value) return ''
  if (URI_RE.test(value) && !/^[a-z]:[\\/]/i.test(value)) {
    await shell.openExternal(value)
    return ''
  }
  return run('cmd.exe', ['/c', 'start', '', value])
}

function run(file: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(file, args, { windowsHide: true, timeout: 8000 }, (error) => {
      resolve(error ? `执行失败：${error.message}` : '')
    })
  })
}

function ps(script: string, timeout = 8000): Promise<string> {
  return powershell(script, timeout).then((out) => out.trim())
}
