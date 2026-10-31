import { useRef } from 'react'
import type { IconSpec } from '../engine/types'
import { IconView } from './Icon'
import { t } from '../i18n'

interface Props {
  value: string
  icon?: IconSpec
  loading: boolean
  providerName: string
  inputRef: React.RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
  onBack: () => void
  onOpenAi: () => void
  onOpenSettings: () => void
}

export function SearchBar({
  value,
  icon,
  loading,
  providerName,
  inputRef,
  onChange,
  onBack,
  onOpenAi,
  onOpenSettings
}: Props) {
  const localRef = useRef<HTMLInputElement | null>(null)
  const ref = inputRef ?? localRef

  return (
    <div className="searchbar">
      <button
        className="provider-badge"
        title={t(`${providerName}（点击返回总览）`, `${providerName} (click to go back)`)}
        onClick={onBack}
      >
        <IconView icon={icon ?? { kind: 'emoji', value: '💡' }} size={26} />
      </button>
      <input
        ref={ref}
        className="search-input"
        value={value}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        placeholder={t('搜索应用、文件、命令，或直接输入表达式…', 'Search apps, files, commands, or type an expression…')}
        onChange={(event) => onChange(event.target.value)}
        autoFocus
      />
      {loading ? <span className="spinner" aria-label={t('加载中', 'Loading')} /> : null}
      <div className="searchbar-actions">
        <button className="ghost-btn" title={t('AI 助手（Ctrl+I）', 'AI Assistant (Ctrl+I)')} onClick={onOpenAi}>
          ✨
        </button>
        <button className="ghost-btn" title={t('设置（Ctrl+,）', 'Settings (Ctrl+,)')} onClick={onOpenSettings}>
          ⚙️
        </button>
      </div>
    </div>
  )
}
