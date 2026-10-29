import type { WifiNetwork } from '@shared/types'
import { execFile } from 'node:child_process'

/**
 * Wi-Fi 列表：解析 `netsh wlan show networks mode=bssid` 输出。
 * 信号为百分比（netsh 显示 0-99），认证方式取 WPA2/WPA3/Open 等。
 */
function exec(cmd: string, args: string[], timeout = 9000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, timeout, maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout)
    })
  })
}

/** 当前已连接的 SSID（可能为空） */
async function connectedSsid(): Promise<string> {
  try {
    const out = await exec('netsh', ['wlan', 'show', 'interfaces'])
    const m = out.match(/^\s*SSID\s*:\s*(.+)$/m)
    return m ? m[1].trim() : ''
  } catch {
    return ''
  }
}

export async function listWifi(): Promise<WifiNetwork[]> {
  const [raw, current] = await Promise.all([exec('netsh', ['wlan', 'show', 'networks', 'mode=bssid']), connectedSsid()])
  const map = new Map<string, WifiNetwork>()

  let ssid = ''
  for (const line of raw.split(/\r?\n/)) {
    const ssidMatch = line.match(/^\s*SSID\s+(\d+)\s*:\s*(.*)$/)
    if (ssidMatch) {
      ssid = ssidMatch[2].trim()
      if (ssid && !map.has(ssid)) {
        map.set(ssid, { ssid, signal: 0, auth: '', connected: ssid === current })
      }
      continue
    }
    if (!ssid || !map.has(ssid)) continue
    const entry = map.get(ssid)!
    const sig = line.match(/^\s*信号\s*:\s*(\d+)%/) ?? line.match(/^\s*Signal\s*:\s*(\d+)%/)
    if (sig) entry.signal = Math.max(entry.signal, Number(sig[1]))
    const auth = line.match(/^\s*身份验证\s*:\s*(.+)/) ?? line.match(/^\s*Authentication\s*:\s*(.+)/)
    if (auth && !entry.auth) entry.auth = auth[1].trim()
  }

  return [...map.values()].sort((a, b) => b.signal - a.signal)
}
