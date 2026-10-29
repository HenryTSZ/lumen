import type { FormSpec, IconSpec, ResultItem } from './types'

export interface Group {
  providerId: string
  name: string
  icon: IconSpec
  items: ResultItem[]
}

export interface Screen {
  kind: 'search' | 'page'
  providerId: string
  title: string
  icon?: IconSpec
  description?: string
  loading: boolean
  groups: Group[]
  /** 当前页的全部结果，用于页内本地过滤 */
  items: ResultItem[]
  /** 有值时该页渲染为表单而非结果列表 */
  form?: FormSpec
  /** 压栈前的输入框内容，用于返回上级时还原（Raycast 行为） */
  savedQuery?: string
}
