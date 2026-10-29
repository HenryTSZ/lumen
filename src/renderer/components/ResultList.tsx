import { useEffect, useRef } from 'react'
import type { Group } from '../engine/types.internal'
import type { ResultItem } from '../engine/types'
import { ResultRow } from './ResultRow'

interface Props {
  groups: Group[]
  selected: number
  showAccessory: boolean
  emptyHint?: string
  onSelect: (index: number) => void
  onRun: (index: number) => void
}

/** 结果列表：按扩展分组，键盘导航时自动滚动到可见区域 */
export function ResultList({ groups, selected, showAccessory, emptyHint, onSelect, onRun }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const visible = groups.filter((group) => group.items.length > 0)

  useEffect(() => {
    const node = containerRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [selected, groups])

  if (!visible.length) {
    return (
      <div className="empty">
        <div className="empty-title">没有找到结果</div>
        <div className="empty-subtitle">{emptyHint ?? '换个关键词，或按 Esc 关闭'}</div>
      </div>
    )
  }

  let offset = 0

  return (
    <div className="results" ref={containerRef}>
      {visible.map((group) => {
        const start = offset
        offset += group.items.length
        return (
          <section className="group" key={group.providerId}>
            <header className="group-header">{group.name}</header>
            <div className="group-items">
              {group.items.map((item: ResultItem, index: number) => (
                <ResultRow
                  key={item.id}
                  data-index={start + index}
                  item={item}
                  selected={start + index === selected}
                  showAccessory={showAccessory}
                  onSelect={() => onSelect(start + index)}
                  onRun={onRun}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
