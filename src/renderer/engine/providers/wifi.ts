import type { WifiNetwork } from '@shared/types'
import { api } from '../../api'
import { emoji, type Provider, type ResultItem } from '../types'
import { copyAction } from '../helpers'

function bars(signal: number): string {
  const n = signal >= 80 ? 4 : signal >= 60 ? 3 : signal >= 40 ? 2 : signal > 0 ? 1 : 0
  return '▂▄▆█'.slice(0, n).padEnd(4, '▁')
}

function build(entry: WifiNetwork): ResultItem {
  return {
    id: `wifi:${entry.ssid}`,
    providerId: 'wifi',
    title: entry.ssid,
    subtitle: `${bars(entry.signal)} ${entry.signal}%${entry.auth ? ` · ${entry.auth}` : ''}${
      entry.connected ? ' · 已连接 ✓' : ''
    }`,
    icon: emoji(entry.connected ? '📶' : '📡'),
    keywords: [entry.ssid, entry.auth],
    usageKey: `wifi:${entry.ssid}`,
    detail: {
      hero: emoji('📶'),
      fields: [
        { label: '网络名称', value: entry.ssid },
        { label: '信号', value: `${entry.signal}%` },
        { label: '认证方式', value: entry.auth || '—' },
        { label: '状态', value: entry.connected ? '已连接' : '未连接' }
      ],
      footer: 'Ctrl+C 复制网络名称 · 连接请使用系统网络面板'
    },
    actions: [copyAction(() => entry.ssid)]
  }
}

export const wifiProvider: Provider = {
  id: 'wifi',
  name: 'Wi-Fi 列表',
  description: '查看附近的无线网络与信号强度（netsh wlan）',
  icon: emoji('📶'),
  aliases: ['wifi', 'wi-fi', 'wlan', '无线', '网络'],
  participatesInRoot: false,
  rank: 37,
  entry: true,

  async search(ctx) {
    let list: WifiNetwork[] = []
    try {
      list = await api.wifi.list()
    } catch (error) {
      return [
        {
          id: 'wifi:error',
          providerId: 'wifi',
          title: '无法获取 Wi-Fi 列表',
          subtitle: '本机可能没有无线网卡，或当前系统不是 Windows',
          icon: emoji('⚠️'),
          actions: []
        }
      ]
    }
    const query = ctx.args.trim().toLowerCase()
    if (query) list = list.filter((w) => w.ssid.toLowerCase().includes(query))
    return list.slice(0, ctx.settings.resultLimit).map(build)
  }
}
