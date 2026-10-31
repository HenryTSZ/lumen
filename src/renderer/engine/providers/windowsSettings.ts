import { WIN_SETTINGS, winSettingGroup, type WinSetting } from '../../data/windowsSettings'
import { api } from '../../api'
import { copyAction } from '../helpers'
import { rankBy } from '../fuzzy'
import { emoji, type Provider, type ResultItem, type SearchContext } from '../types'
import { isEnglish, t } from '../../i18n'

/**
 * Windows 设置搜索。
 * 直接搜「蓝牙」「默认应用」「设备管理器」就能跳到对应设置页，
 * 不用再点开开始菜单 → 设置 → 一层层翻。
 */

function titleOf(entry: WinSetting): string {
  return isEnglish() ? entry.titleEn : entry.title
}

function iconFor(entry: WinSetting): string {
  return entry.icon ?? winSettingGroup(entry.group).icon
}

function subtitleFor(entry: WinSetting): string {
  const group = winSettingGroup(entry.group)
  return `${isEnglish() ? group.titleEn : group.title} · ${entry.target}`
}

function build(entry: WinSetting, ctx: SearchContext, score: number, ranges?: Array<[number, number]>): ResultItem {
  const group = winSettingGroup(entry.group)
  return {
    id: `winset:${entry.target}`,
    providerId: 'windows-settings',
    title: titleOf(entry),
    subtitle: subtitleFor(entry),
    icon: emoji(iconFor(entry)),
    keywords: [entry.titleEn, ...entry.keys, group.title, group.titleEn, entry.target],
    score,
    ranges,
    usageKey: `winset:${entry.target}`,
    detail: {
      hero: emoji(iconFor(entry)),
      fields: [
        { label: t('名称', 'Name'), value: titleOf(entry) },
        { label: 'English', value: entry.titleEn },
        { label: t('分组', 'Group'), value: isEnglish() ? group.titleEn : group.title },
        { label: t('打开方式', 'Opens'), value: entry.target }
      ],
      footer: t('回车直接打开系统设置页 · Ctrl+C 复制命令', 'Enter opens the settings page · Ctrl+C copies the command')
    },
    actions: [
      {
        id: 'open',
        name: t(`打开${titleOf(entry)}`, `Open ${titleOf(entry)}`),
        primary: true,
        shortcut: ['↵'],
        icon: iconFor(entry),
        async run({ close, toast }) {
          close()
          const error = await api.system.open(entry.target)
          if (error) toast(error)
        }
      },
      copyAction(() => entry.target)
    ]
  }
}

export const windowsSettingsProvider: Provider = {
  id: 'windows-settings',
  name: 'Windows 设置',
  description: '搜索并直达系统设置、控制面板与管理工具（蓝牙、默认应用、设备管理器…）',
  icon: emoji('🪟'),
  aliases: ['winset', 'winsettings', 'win设置', 'windows设置', 'msettings', '控制面板', 'control'],
  participatesInRoot: true,
  rank: 12,
  entry: true,

  search(ctx) {
    const query = ctx.args.trim()
    const limit = ctx.settings.resultLimit

    if (!query) {
      // 空参数时按分组顺序平铺，方便浏览
      return [...WIN_SETTINGS]
        .sort((a, b) => a.group - b.group)
        .slice(0, limit)
        .map((entry) => build(entry, ctx, 500))
    }

    return rankBy(WIN_SETTINGS, query, (entry) => [
      titleOf(entry),
      isEnglish() ? entry.title : entry.titleEn,
      entry.keys.join(' '),
      isEnglish() ? winSettingGroup(entry.group).titleEn : winSettingGroup(entry.group).title,
      entry.target
    ])
      .slice(0, limit)
      .map(({ item, score, ranges }) => build(item, ctx, score, ranges))
  }
}
