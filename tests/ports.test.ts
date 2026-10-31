import { describe, expect, it } from 'vitest'
import { parseNetstat, parseTasklistCsv } from '../src/main/services/ports'

const SAMPLE = `

Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1234
  TCP    127.0.0.1:5173         0.0.0.0:0              LISTENING       8888
  TCP    192.168.1.5:54321      20.42.65.84:443        ESTABLISHED     4321
  TCP    192.168.1.5:54320      20.42.65.84:443        TIME_WAIT       0
  UDP    0.0.0.0:5353           *:*                                    7777
  UDP    [::1]:1900             *:*                                    9999
`

describe('parseNetstat', () => {
  it('解析 TCP 五列：协议 / 本地 / 远端 / 状态 / PID', () => {
    const rows = parseNetstat(SAMPLE)
    expect(rows).toHaveLength(6)
    const first = rows[0]
    expect(first).toEqual({
      proto: 'TCP',
      local: '0.0.0.0:135',
      remote: '0.0.0.0:0',
      state: 'LISTENING',
      pid: 1234
    })
  })

  it('解析 UDP 四列，状态补为占位符', () => {
    const rows = parseNetstat(SAMPLE).filter((row) => row.proto === 'UDP')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ proto: 'UDP', local: '0.0.0.0:5353', remote: '*:*', state: '—', pid: 7777 })
  })

  it('跳过表头、空行与无关行', () => {
    const rows = parseNetstat(SAMPLE)
    expect(rows.every((row) => row.proto === 'TCP' || row.proto === 'UDP')).toBe(true)
    for (const row of rows) {
      expect(Number.isFinite(row.pid)).toBe(true)
    }
  })

  it('PID 为数字；系统保留连接（PID 0）也能解析出来', () => {
    const timeWait = parseNetstat(SAMPLE).find((row) => row.state === 'TIME_WAIT')
    expect(timeWait?.pid).toBe(0)
  })

  it('空输出不炸', () => {
    expect(parseNetstat('')).toEqual([])
    expect(parseNetstat('garbage line')).toEqual([])
  })

  it('支持 CRLF 换行（Windows 实际输出）', () => {
    const crlf = '  TCP    0.0.0.0:80             0.0.0.0:0              LISTENING       4\r\n'
    expect(parseNetstat(crlf)[0].pid).toBe(4)
  })
})

describe('parseTasklistCsv', () => {
  it('把 tasklist CSV 解析成 pid → 进程名（去掉 .exe）', () => {
    const csv = [
      '"System Idle Process","0","Services","0","8 K"',
      '"node.exe","8888","Console","1","120,000 K"',
      '"chrome.exe","4321","Console","1","300,000 K"',
      '"explorer.exe","1234","Console","1","150,000 K"'
    ].join('\r\n')
    const map = parseTasklistCsv(csv)
    expect(map.get(8888)).toBe('node')
    expect(map.get(4321)).toBe('chrome')
    expect(map.get(1234)).toBe('explorer')
    expect(map.size).toBe(4)
  })

  it('进程名里带逗号/空格也能正确取到（按引号切分）', () => {
    const map = parseTasklistCsv('"My App, Inc.exe","55","Console","1","1 K"')
    expect(map.get(55)).toBe('My App, Inc')
  })

  it('空输出返回空表', () => {
    expect(parseTasklistCsv('').size).toBe(0)
  })
})
