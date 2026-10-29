import { gradientFor } from '../engine/utils'
import type { IconSpec } from '../engine/types'

interface Props {
  icon?: IconSpec
  size?: number
  radius?: number
}

/**
 * 统一的图标渲染：
 *  - data/url：来自主进程的真实系统图标
 *  - emoji：内置扩展的自选图标
 *  - text：没有真实图标时的占位，按名称生成稳定的渐变色
 */
export function IconView({ icon, size = 34, radius }: Props) {
  const style = { width: size, height: size, borderRadius: radius ?? Math.round(size * 0.26) }

  if (!icon) return <div className="icon" style={style} />

  if (icon.kind === 'data' || icon.kind === 'url') {
    return <img className="icon icon-image" src={icon.value} alt="" style={style} draggable={false} />
  }

  if (icon.kind === 'emoji') {
    return (
      <div className="icon icon-emoji" style={{ ...style, fontSize: Math.round(size * 0.62) }}>
        {icon.value}
      </div>
    )
  }

  const [from, to] = gradientFor(icon.value)
  return (
    <div
      className="icon icon-text"
      style={{
        ...style,
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: Math.round(size * (icon.value.length > 1 ? 0.3 : 0.46))
      }}
    >
      {icon.value.slice(0, 3)}
    </div>
  )
}
