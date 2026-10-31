import { execFile } from 'node:child_process'
import type { PortEntry } from '@shared/types'

/**
 * 端口占用查询：解析 `netstat -ano` 输出，再用 `tasklist` 把 PID 映射到进程名。
 * 全部走 Windows 自带命令，零依赖。
 */
export interface NetstatRow {
  proto: string
  local: string
  remote: string
  state: string
  pid: number
}

function exec(cmd: string, args: string[], timeout = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, timeout, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout)
    })
  })
}

/** 解析 `netstat -ano` 的文本输出（导出以便单测覆盖） */
export function parseNetstat(out: string): NetstatRow[] {
  const rows: NetstatRow[] = []
  for (const line of out.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/)
    // TCP 有 5 列：Proto Local Foreign State PID；UDP 只有 4 列
    if (cols[0] === 'TCP' && cols.length >= 5) {
      rows.push({ proto: 'TCP', local: cols[1], remote: cols[2], state: cols[3], pid: Number(cols[4]) })
    } else if (cols[0] === 'UDP' && cols.length >= 4) {
      rows.push({ proto: 'UDP', local: cols[1], remote: cols[2] ?? '*', state: '—', pid: Number(cols[3]) })
    }
  }
  return rows
}

/** 解析 `tasklist /fo csv /nh` 的输出（导出以便单测覆盖） */
export function parseTasklistCsv(csv: string): Map<number, string> {
  const map = new Map<number, string>()
  for (const line of csv.split(/\r?\n/)) {
    const m = line.match(/^"([^"]+)","(\d+)/)
    if (m) map.set(Number(m[2]), m[1].replace(/\.exe$/i, ''))
  }
  return map
}

/** tasklist CSV → pid → 进程名 */
async function pidNameMap(): Promise<Map<number, string>> {
  try {
    const csv = await exec('tasklist', ['/fo', 'csv', '/nh'])
    return parseTasklistCsv(csv)
  } catch {
    /* 拿不到进程名也不影响展示端口 */
    return new Map()
  }
}

export async function listPorts(): Promise<PortEntry[]> {
  const [raw, names] = await Promise.all([exec('netstat', ['-ano']), pidNameMap()])
  const seen = new Set<string>()
  const rows = parseNetstat(raw)
    .filter((r) => Number.isFinite(r.pid) && r.pid > 0)
    // UDP 无状态概念、TIME_WAIT 很快消失，保留 LISTENING / ESTABLISHED 等有意义的行
    .filter((r) => r.proto === 'UDP' || r.state !== 'TIME_WAIT')
    .filter((r) => {
      const key = `${r.proto}|${r.local}|${r.state}|${r.pid}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map<PortEntry>((r) => ({
      pid: r.pid,
      process: names.get(r.pid) ?? `pid:${r.pid}`,
      protocol: r.proto as 'TCP' | 'UDP',
      local: r.local,
      remote: r.remote,
      state: r.state
    }))
  // 监听中的端口最有价值，排前面
  return rows.sort((a, b) => {
    const al = a.state === 'LISTENING' ? 0 : 1
    const bl = b.state === 'LISTENING' ? 0 : 1
    return al - bl || a.local.localeCompare(b.local, 'en', { numeric: true })
  })
}
