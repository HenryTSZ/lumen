import type { ReactNode } from 'react'
import type { ResultItem } from '../engine/types'
import { IconView } from './Icon'

interface Props {
  item: ResultItem
  selected: boolean
  showAccessory: boolean
  /** 供列表容器做滚动定位 */
  'data-index'?: number
  onSelect: () => void
  onRun: (index: number) => void
}

/** 按命中区间切片，实现搜索关键词高亮 */
function highlight(title: string, ranges?: Array<[number, number]>): ReactNode {
  if (!ranges?.length) return title
  const nodes: ReactNode[] = []
  let cursor = 0
  ranges.forEach(([start, end], index) => {
    if (start > cursor) nodes.push(title.slice(cursor, start))
    nodes.push(
      <mark key={index} className="hl">
        {title.slice(start, end + 1)}
      </mark>
    )
    cursor = end + 1
  })
  if (cursor < title.length) nodes.push(title.slice(cursor))
  return nodes
}

export function ResultRow({
  item,
  selected,
  showAccessory,
  'data-index': dataIndex,
  onSelect,
  onRun
}: Props) {
  const secondary = item.actions.filter((action) => !action.primary).slice(0, 3)

  return (
    <div
      className={`row${selected ? ' selected' : ''}`}
      data-index={dataIndex}
      onMouseMove={onSelect}
      onClick={() => onRun(0)}
      role="option"
      aria-selected={selected}
    >
      <IconView icon={item.icon} size={34} />
      <div className="row-main">
        <div className="row-title">{highlight(item.title, item.ranges)}</div>
        {item.subtitle ? <div className="row-subtitle">{item.subtitle}</div> : null}
      </div>
      {showAccessory && secondary.length ? (
        <div className="row-accessory">
          {secondary.map((action) => (
            <button
              key={action.id}
              className="chip"
              title={`${action.name}${action.shortcut ? ` (${action.shortcut.join('+')})` : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                onRun(item.actions.indexOf(action))
              }}
            >
              {action.icon ? <span className="chip-icon">{action.icon}</span> : null}
              <span>{action.shortcut?.join(' ') || action.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
