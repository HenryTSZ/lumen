import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { FormField, FormSpec } from '../engine/types'
import { t } from '../i18n'

interface Props {
  form: FormSpec
  /** 保存成功后回调，返回提示文案会作为 toast */
  onSubmitted: (message?: string) => void
  onCancel: () => void
  panelRef?: MutableRefObject<HTMLDivElement | null>
}

type Values = Record<string, string>

function initial(form: FormSpec): Values {
  const values: Values = {}
  for (const field of form.fields) {
    values[field.key] = field.defaultValue ?? (field.type === 'toggle' ? 'false' : '')
  }
  return values
}

export function FormPanel({ form, onSubmitted, onCancel, panelRef }: Props) {
  const [values, setValues] = useState<Values>(() => initial(form))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null)

  // 切换到另一张表单时重置状态并聚焦首个字段
  useEffect(() => {
    setValues(initial(form))
    setError(null)
    setBusy(false)
    requestAnimationFrame(() => firstRef.current?.focus())
  }, [form])

  const update = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const message = await form.submit(values)
      onSubmitted(message ?? undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="form-panel"
      ref={panelRef}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          void submit()
        }
      }}
    >
      {form.note ? <p className="form-note">{form.note}</p> : null}

      {form.fields.map((field: FormField, index: number) => (
        <div className="form-field" key={field.key}>
          <label className="form-label" htmlFor={`field-${field.key}`}>
            {field.label}
          </label>
          <Field
            field={field}
            value={values[field.key] ?? ''}
            inputRef={index === 0 ? firstRef : undefined}
            onChange={(next) => update(field.key, next)}
          />
          {field.hint ? <p className="form-hint">{field.hint}</p> : null}
        </div>
      ))}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="form-btn ghost" type="button" onClick={onCancel}>
          {t('取消', 'Cancel')}
        </button>
        <button className="form-btn primary" type="button" disabled={busy} onClick={() => void submit()}>
          {busy ? t('保存中…', 'Saving…') : form.submitLabel ?? t('保存', 'Save')}
        </button>
        <span className="form-keys">
          <kbd>Ctrl</kbd>
          <kbd>↵</kbd>
        </span>
      </div>
    </div>
  )
}

interface FieldProps {
  field: FormField
  value: string
  inputRef?: MutableRefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>
  onChange: (value: string) => void
}

function Field({ field, value, inputRef, onChange }: FieldProps) {
  const id = `field-${field.key}`

  if (field.type === 'toggle') {
    const on = value === 'true'
    return (
      <button
        id={id}
        type="button"
        className={`switch${on ? ' on' : ''}`}
        role="switch"
        aria-checked={on}
        onClick={() => onChange(on ? 'false' : 'true')}
      >
        <span className="switch-track">
          <span className="switch-knob" />
        </span>
        <span className="switch-text">{on ? t('已开启', 'On') : t('已关闭', 'Off')}</span>
      </button>
    )
  }

  if (field.type === 'select' && field.options?.length) {
    return (
      <select
        id={id}
        className="form-select"
        ref={inputRef as MutableRefObject<HTMLSelectElement | null> | undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        id={id}
        className="form-textarea"
        ref={inputRef as MutableRefObject<HTMLTextAreaElement | null> | undefined}
        rows={4}
        spellCheck={false}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <input
      id={id}
      className="form-input"
      ref={inputRef as MutableRefObject<HTMLInputElement | null> | undefined}
      type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
      spellCheck={false}
      placeholder={field.placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
