import type { ResultItem } from '../engine/types'
import { IconView } from './Icon'

interface Props {
  item: ResultItem | null
  open: boolean
  onClose: () => void
  onRun: (index: number) => void
}

/** 动作面板：列出当前结果可以执行的所有操作，Ctrl+数字直接触发 */
export function ActionPanel({ item, open, onClose, onRun }: Props) {
  if (!open || !item) return null

  return (
    <div className="action-panel">
      <div className="action-head">
        <IconView icon={item.icon} size={24} />
        <div className="action-head-title">{item.title}</div>
        <button className="ghost-btn" onClick={onClose} title="关闭（Esc）">
          ✕
        </button>
      </div>
      <div className="action-list">
        {item.actions.map((action, index) => (
          <button key={action.id} className="action-item" onClick={() => onRun(index)}>
            <span className="action-icon">{action.icon ?? '▸'}</span>
            <span className="action-name">{action.name}</span>
            {action.shortcut?.length ? (
              <span className="action-keys">
                {action.shortcut.map((key, i) => (
                  <kbd key={i}>{key}</kbd>
                ))}
              </span>
            ) : index === 0 ? (
              <span className="action-keys">
                <kbd>↵</kbd>
              </span>
            ) : null}
          </button>
        ))}
        {!item.actions.length ? <div className="action-empty">该项目没有可执行的操作</div> : null}
      </div>
    </div>
  )
}
