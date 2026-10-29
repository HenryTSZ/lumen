import type { AppSettings, LumenApi } from '@shared/types'

/* ------------------------------------------------------------------ */
/* 图标                                                                */
/* ------------------------------------------------------------------ */

export type IconSpec =
  | { kind: 'emoji'; value: string }
  | { kind: 'text'; value: string }
  | { kind: 'data'; value: string }
  | { kind: 'url'; value: string }

export const emoji = (value: string): IconSpec => ({ kind: 'emoji', value })
export const textIcon = (value: string): IconSpec => ({ kind: 'text', value })
export const dataIcon = (value: string): IconSpec => ({ kind: 'data', value })

/* ------------------------------------------------------------------ */
/* 动作                                                                */
/* ------------------------------------------------------------------ */

export interface ActionContext {
  item: ResultItem
  settings: AppSettings
  /** 关闭启动器窗口 */
  close: () => void
  /** 右上角短暂提示 */
  toast: (message: string) => void
  /** 重新执行当前搜索，用于数据变更后的即时刷新 */
  refresh: () => void
  /** 把搜索框内容替换掉（用于「进入某个扩展」这类动作） */
  runQuery: (query: string) => void
  api: LumenApi
}

export interface ActionSpec {
  id: string
  name: string
  shortcut?: string[]
  icon?: string
  primary?: boolean
  run: (ctx: ActionContext) => void | Promise<void>
}

/* ------------------------------------------------------------------ */
/* 结果项                                                              */
/* ------------------------------------------------------------------ */

export interface DetailField {
  label: string
  value: string
}

export interface ResultDetail {
  fields?: DetailField[]
  markdown?: string
  /** 详情面板顶部大图（如应用 icon 放大版） */
  hero?: IconSpec
  /** 详情面板里的整幅预览图（data URL，剪贴板图片用） */
  image?: string
  /** 靠 footer 展示的提示 */
  footer?: string
}

export interface ResultItem {
  id: string
  providerId: string
  title: string
  subtitle?: string
  icon: IconSpec
  /** 参与模糊匹配的额外关键词 */
  keywords?: string[]
  score?: number
  /** 标题中的命中区间，用于高亮 */
  ranges?: Array<[number, number]>
  /** 学习排序用的稳定 key，一般为 `providerId:唯一标识` */
  usageKey?: string
  /** 详情面板内容，Tab 可切换显示 */
  detail?: ResultDetail
  /** 主操作 = actions[0]，⌘1..9 触发其余 */
  actions: ActionSpec[]
  data?: unknown
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export interface SearchContext {
  /** 用户在搜索框中的完整输入 */
  query: string
  /** 去掉触发词后的参数部分 */
  args: string
  settings: AppSettings
  api: LumenApi
  close: () => void
  toast: (message: string) => void
  /** 二级页：把一组新结果压入导航栈 */
  push: (options: PushOptions) => void
  /** 替换当前二级页的内容（用于异步结果回填，例如 AI 回答） */
  replace: (options: PushOptions) => void
  /** 刷新当前结果（重新触发一次搜索） */
  refresh: () => void
  /** 直接改写搜索框内容（插件可用它跳转到别的触发词） */
  runQuery: (query: string) => void
}

/* ------------------------------------------------------------------ */
/* 表单（设置面板用）                                                   */
/* ------------------------------------------------------------------ */

export interface FormField {
  key: string
  label: string
  type?: 'text' | 'password' | 'number' | 'textarea' | 'select' | 'toggle'
  placeholder?: string
  defaultValue?: string
  options?: string[]
  hint?: string
}

export interface FormSpec {
  fields: FormField[]
  submitLabel?: string
  note?: string
  /** 返回字符串时作为 toast 提示 */
  submit: (values: Record<string, string>) => Promise<string | void>
}

export interface PushOptions {
  title: string
  icon?: IconSpec
  items: ResultItem[]
  loading?: boolean
  /** 二级页头部说明 */
  description?: string
  /** 传入后该页渲染为表单而非结果列表 */
  form?: FormSpec
}

export interface Provider {
  id: string
  name: string
  description: string
  icon: IconSpec
  /** 触发词，如 'clip' 'sys' */
  aliases: string[]
  /** 是否参与无触发词的聚合搜索 */
  participatesInRoot: boolean
  /** 无需触发词，根据输入内容自动命中（如计算器） */
  detect?: (query: string) => boolean
  /** 数字越小排名越靠前 */
  rank: number
  search: (ctx: SearchContext) => Promise<ResultItem[]> | ResultItem[]
  /** provider 自身的快捷入口，会在 root 搜索里作为一条结果出现 */
  entry?: boolean
}
