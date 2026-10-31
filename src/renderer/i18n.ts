import type { AppSettings } from '@shared/types'

/**
 * 极简 i18n：以中文文案为「键」，英文为「值」就地成对书写：
 *   t('没有找到结果', 'No results found')
 * 不需要集中字典，新增文案时直接补第二个参数即可。
 */

export type Locale = 'zh' | 'en'

let current: Locale = 'zh'

/** 设置当前语言（useLumen 在每次渲染前同步） */
export function setLocale(locale: Locale | undefined): void {
  current = locale === 'en' ? 'en' : 'zh'
}

export function locale(): Locale {
  return current
}

export function isEnglish(): boolean {
  return current === 'en'
}

/** 双语文案：中文语境返回中文，英文语境返回英文 */
export function t(zh: string, en: string): string {
  return current === 'en' ? en : zh
}

/**
 * 常见动作名的集中翻译表。
 * 各 provider 的动作名多为「打开 / 复制 / 执行」这类标准词，
 * 渲染时统一走这里，避免逐个 provider 双语化。
 */
const ACTION_NAME_MAP: Record<string, string> = {
  执行: 'Run',
  打开: 'Open',
  运行: 'Run',
  进入: 'Enter',
  复制: 'Copy',
  删除: 'Delete',
  移除: 'Remove',
  编辑: 'Edit',
  查看全部: 'View All',
  保存: 'Save',
  取消: 'Cancel',
  关闭: 'Close',
  粘贴到当前窗口: 'Paste to Active Window',
  在资源管理器中显示: 'Reveal in Explorer',
  置顶到最前: 'Pin to Top',
  取消置顶: 'Unpin',
  另存为图片: 'Save Image As…',
  另存为: 'Save As…',
  锁定屏幕: 'Lock Screen',
  查询: 'Query'
}

/** 渲染层动作名：标准词自动翻译，其余原样返回 */
export function tAction(name: string): string {
  if (current !== 'en') return name
  return ACTION_NAME_MAP[name] ?? name
}

/** 从设置同步语言 */
export function localeFromSettings(settings: AppSettings | null): Locale {
  return settings?.language === 'en' ? 'en' : 'zh'
}
