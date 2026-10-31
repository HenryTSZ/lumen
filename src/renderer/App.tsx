import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import type { Group } from './engine/types.internal'
import type { ActionSpec } from './engine/types'
import { useLumen } from './hooks/useLumen'
import { SearchBar } from './components/SearchBar'
import { ResultList } from './components/ResultList'
import { FormPanel } from './components/FormPanel'
import { ActionPanel } from './components/ActionPanel'
import { DetailPanel } from './components/DetailPanel'
import { Toast } from './components/Toast'
import { t, tAction } from './i18n'

const BASE_WIDTH = 780
const DETAIL_WIDTH = 1140
const CHROME_HEIGHT = 96 // 搜索框 60 + 底部栏 34 + 边距
const ROW_HEIGHT = 62
const GROUP_HEADER = 32
const MAX_VISIBLE_ROWS = 9
const MAX_FORM_HEIGHT = 640

export default function App() {
  const lumen = useLumen()
  const { setQuery, runAction, move, back, notify, reloadSettings, selectedItem, groups, flatItems, selected, inputRef } =
    lumen
  const [showDetail, setShowDetail] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const form = lumen.current?.form ?? null
  const formRef = useRef<HTMLDivElement | null>(null)
  const [formHeight, setFormHeight] = useState(0)

  const rows = useMemo(
    () => groups.reduce((total: number, group: Group) => total + group.items.length, 0),
    [groups]
  )
  const groupCount = useMemo(
    () => groups.filter((group: Group) => group.items.length > 0).length,
    [groups]
  )

  /* 表单页高度按实际内容自适应 */
  useLayoutEffect(() => {
    if (!form) {
      setFormHeight(0)
      return
    }
    const node = formRef.current
    if (!node) return
    const measure = () => setFormHeight(node.scrollHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [form])

  /* 窗口尺寸随内容变化（Raycast 的自适应窗口） */
  useEffect(() => {
    const visibleRows = Math.min(rows, MAX_VISIBLE_ROWS)
    const listHeight = CHROME_HEIGHT + visibleRows * ROW_HEIGHT + groupCount * GROUP_HEADER + (rows ? 8 : 0)
    const height = form ? CHROME_HEIGHT + Math.min(formHeight, MAX_FORM_HEIGHT) : listHeight
    void api.launcher.resize({ width: showDetail ? DETAIL_WIDTH : BASE_WIDTH, height })
  }, [rows, groupCount, showDetail, form, formHeight])

  const enterProvider = useCallback(
    (keyword: string) => {
      setShowActions(false)
      setQuery(keyword)
      inputRef.current?.focus()
    },
    [inputRef, setQuery]
  )

  /* 键盘导航 */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // 焦点在表单内部时，导航快捷键让位给输入框（Esc 仍可返回上级）
      const target = event.target as HTMLElement | null
      const inForm = Boolean(target?.closest('.form-panel'))
      const mod = event.ctrlKey || event.metaKey

      if (event.key === 'Escape') {
        event.preventDefault()
        if (showActions) setShowActions(false)
        else if (inForm) back()
        else if (lumen.query) setQuery('')
        else if (lumen.current?.kind === 'page') back()
        else void api.launcher.hide()
        return
      }

      if (inForm) return

      if (event.key === 'Tab') {
        event.preventDefault()
        setShowDetail((prev) => !prev)
        return
      }

      if (event.key === 'ArrowDown' || (mod && event.key === 'n')) {
        event.preventDefault()
        if (showActions) return
        move(1)
        return
      }

      if (event.key === 'ArrowUp' || (mod && event.key === 'p')) {
        event.preventDefault()
        if (showActions) return
        move(-1)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        if (showActions) return
        void runAction(selectedItem, 0)
        return
      }

      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setShowActions((prev) => !prev)
        return
      }

      if (mod && event.key === ',') {
        event.preventDefault()
        enterProvider('settings ')
        return
      }

      if (mod && event.key.toLowerCase() === 'i') {
        event.preventDefault()
        enterProvider('ai ')
        return
      }

      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        setShowDetail((prev) => !prev)
        return
      }

      if (mod && /^[1-9]$/.test(event.key)) {
        event.preventDefault()
        const index = Number(event.key) - 1
        if (index > 0) void runAction(selectedItem, index)
        return
      }

      if (event.key === 'Backspace' && !lumen.query && lumen.current?.kind === 'page') {
        event.preventDefault()
        back()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [back, enterProvider, lumen, move, runAction, selectedItem, setQuery, showActions])

  const primaryHint = selectedItem?.actions[0]
  const footerLeft = lumen.current?.title ?? 'Lumen'

  return (
    <div className={`app${showDetail ? ' with-detail' : ''}`}>
      <SearchBar
        value={lumen.query}
        icon={lumen.current?.icon}
        loading={lumen.loading}
        providerName={footerLeft}
        inputRef={inputRef}
        onChange={setQuery}
        onBack={() => {
          if (lumen.current?.kind === 'page') back()
          else if (lumen.query) setQuery('')
        }}
        onOpenAi={() => enterProvider('ai ')}
        onOpenSettings={() => enterProvider('settings ')}
      />

      <div className="body">
        <main className="content">
          {form ? (
            <FormPanel
              form={form}
              panelRef={formRef}
              onCancel={back}
              onSubmitted={(message) => {
                if (message) notify(message)
                void reloadSettings()
                back()
              }}
            />
          ) : (
            <ResultList
              groups={groups}
              selected={selected}
              showAccessory={!showDetail}
              emptyHint={
                lumen.loading ? t('正在搜索…', 'Searching…') : undefined
              }
              onSelect={lumen.setSelected}
              onRun={(index) => void runAction(selectedItem, index)}
            />
          )}
          <ActionPanel
            item={selectedItem}
            open={showActions}
            onClose={() => setShowActions(false)}
            onRun={(index) => {
              setShowActions(false)
              void runAction(selectedItem, index)
            }}
          />
        </main>
        {showDetail && !form ? <DetailPanel item={selectedItem} /> : null}
      </div>

      <footer className="footer">
        <div className="footer-left">
          <span className="dot" />
          {footerLeft}
          <span className="footer-sep">·</span>
          {form ? t(`${form.fields.length} 个字段`, `${form.fields.length} fields`) : t(`${flatItems.length} 项`, `${flatItems.length} items`)}
        </div>
        {form ? <FormFooter /> : <ListFooter primaryHint={primaryHint} />}
      </footer>

      <Toast message={lumen.toast?.message ?? null} />
    </div>
  )
}

function FormFooter() {
  return (
    <div className="footer-right">
      <kbd>Ctrl</kbd>
      <kbd>↵</kbd>
      <span>{t('保存', 'Save')}</span>
      <span className="footer-sep">·</span>
      <kbd>Esc</kbd>
      <span>{t('返回', 'Back')}</span>
    </div>
  )
}

function ListFooter({ primaryHint }: { primaryHint?: ActionSpec }) {
  return (
    <div className="footer-right">
      {primaryHint ? (
        <>
          <kbd>↵</kbd>
          <span>{tAction(primaryHint.name)}</span>
          <span className="footer-sep">·</span>
        </>
      ) : null}
      <kbd>Ctrl</kbd>
      <kbd>K</kbd>
      <span>{t('操作', 'Actions')}</span>
      <span className="footer-sep">·</span>
      <kbd>Tab</kbd>
      <span>{t('详情', 'Details')}</span>
    </div>
  )
}
