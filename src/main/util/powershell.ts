import { execFile } from 'node:child_process'
import { EventEmitter } from 'node:events'

const UTF8_SWITCH = '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;$OutputEncoding=[System.Text.Encoding]::UTF8'
const HEADER = `$ErrorActionPreference='SilentlyContinue';$ProgressPreference='SilentlyContinue';${UTF8_SWITCH}`

/**
 * 执行一次 PowerShell 命令。
 *
 * 关键点：Windows PowerShell 5.1 默认以本地 OEM 代码页输出，中文会变乱码，
 * 所以脚本头部强制把控制台输出编码切成 UTF-8，Node 侧按 utf8 解码。
 */
export function powershell(script: string, timeoutMs = 20000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Sta', '-Command', `${HEADER};${script}`],
      { encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error && (!stdout || stdout.trim() === '')) {
          reject(new Error(stderr?.trim() || error.message))
          return
        }
        resolve(stdout ?? '')
      }
    )
    // 超时兜底：execFile 的 timeout 只会 kill 子进程，这里额外保证 Promise settle
    child.on('error', reject)
  })
}

/**
 * 执行 PowerShell 并尝试把输出解析为 JSON。
 * PowerShell 的 ConvertTo-Json 在只有单个元素时会退化成裸对象，这里统一包成数组。
 */
export async function powershellJson<T>(script: string, timeoutMs = 20000): Promise<T[]> {
  const stdout = await powershell(script, timeoutMs)
  const trimmed = stdout.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    // 有些命令会夹着提示信息输出，取最后一行 JSON 再试一次
    const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].startsWith('{') && !lines[i].startsWith('[')) continue
      try {
        const parsed = JSON.parse(lines[i])
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        /* 继续尝试上一行 */
      }
    }
    return []
  }
}

/** 转义 PowerShell 单引号字符串字面量 */
export function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/** 生成一个简单的取消/超时信号 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ])
}

export const psEvents = new EventEmitter()

/**
 * 判断当前是否运行在 Windows 上。
 * 非 Windows 环境（例如在 CI / Linux 上做构建校验）直接返回空结果，避免崩溃。
 */
export const isWindows = process.platform === 'win32'
