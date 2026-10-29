import type { ResultItem } from '../engine/types'
import { IconView } from './Icon'
import { Markdown } from './Markdown'

interface Props {
  item: ResultItem | null
}

/** 右侧详情面板：Tab 展开，展示元信息、正文与可用操作 */
export function DetailPanel({ item }: Props) {
  if (!item) return <aside className="detail detail-empty" />

  const detail = item.detail
  const actions = item.actions.filter((action) => !action.primary).slice(0, 6)

  return (
    <aside className="detail">
      <div className="detail-scroll">
        <div className="detail-hero">
          <IconView icon={detail?.hero ?? item.icon} size={72} radius={18} />
          <div className="detail-hero-text">
            <div className="detail-title">{item.title}</div>
            {item.subtitle ? <div className="detail-subtitle">{item.subtitle}</div> : null}
          </div>
        </div>

        {detail?.image ? (
          <div className="detail-image">
            <img src={detail.image} alt="" draggable={false} />
          </div>
        ) : null}

        {detail?.fields?.length ? (
          <dl className="detail-fields">
            {detail.fields.map((field, index) => (
              <div className="detail-field" key={index}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {detail?.markdown ? <Markdown text={detail.markdown} /> : null}

        {actions.length ? (
          <div className="detail-actions">
            <div className="detail-section-title">可执行操作</div>
            {actions.map((action) => (
              <div className="detail-action" key={action.id}>
                <span className="detail-action-icon">{action.icon ?? '▸'}</span>
                <span className="detail-action-name">{action.name}</span>
                {action.shortcut?.length ? <kbd>{action.shortcut.join(' ')}</kbd> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {detail?.footer ? <div className="detail-footer">{detail.footer}</div> : null}
    </aside>
  )
}
