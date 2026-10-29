interface Props {
  message: string | null
}

/** 操作反馈：出现在搜索框右下角，2.4 秒后自动消失 */
export function Toast({ message }: Props) {
  if (!message) return null
  return (
    <div className="toast" role="status">
      {message}
    </div>
  )
}
