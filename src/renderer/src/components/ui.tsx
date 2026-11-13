import { MoreHorizontal, X, type LucideIcon } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'subtle'
const VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-accent text-black hover:brightness-110',
  subtle: 'bg-tile text-zinc-100 hover:bg-hover',
  ghost: 'text-muted hover:text-zinc-100 hover:bg-tile',
  danger: 'bg-red-500/90 text-white hover:bg-red-500'
}

export function Button({
  variant = 'subtle',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-semibold tracking-wide transition disabled:pointer-events-none disabled:opacity-40 ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
      } ${VARIANTS[variant]} ${className}`}
    />
  )
}

export function IconButton({ title, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { title: string }) {
  return (
    <button
      {...props}
      title={title}
      aria-label={title}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-zinc-100 ${className}`}
    />
  )
}

export function SectionHeader({ title, count, children }: { title: string; count?: number; children?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="label text-zinc-300">
        {title}
        {count !== undefined && <span className="ml-2 text-muted">{count}</span>}
      </h2>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  )
}

export function Modal({
  title,
  header,
  onClose,
  children,
  wide,
  medium
}: {
  title: string
  header?: ReactNode
  onClose?: () => void
  children: ReactNode
  wide?: boolean
  medium?: boolean
}) {
  useEffect(() => {
    // Close on Esc unless a recorder is capturing keys (it stops propagation).
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`w-full ${wide ? 'max-w-3xl' : medium ? 'max-w-xl' : 'max-w-md'} rounded-xl bg-panel shadow-2xl ring-1 ring-line`}>
        <header className="flex items-center gap-4 px-6 pt-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em]">{title}</h3>
          <div className="flex-1">{header}</div>
          {onClose && (
            <IconButton title="Close" onClick={onClose}>
              <X size={16} />
            </IconButton>
          )}
        </header>
        <div className="px-6 pt-4 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function Switch({ checked, onChange, title }: { checked: boolean; onChange: (v: boolean) => void; title?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

export function Segmented<T extends string | number | boolean>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string; title?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-md bg-tile p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={String(o.value)}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`rounded px-2.5 py-1 font-semibold transition ${value === o.value ? 'bg-hover text-zinc-100' : 'text-muted hover:text-zinc-200'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export interface MenuItem {
  label: string
  icon?: LucideIcon
  onClick: () => void
  danger?: boolean
  hidden?: boolean
}

/** "⋯" button with a small popover menu. */
export function Menu({ items, title = 'More' }: { items: MenuItem[]; title?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <IconButton title={title} onClick={() => setOpen((o) => !o)} className={open ? 'bg-hover text-zinc-100' : ''}>
        <MoreHorizontal size={16} />
      </IconButton>
      {open && (
        <div className="absolute right-0 top-8 z-40 min-w-[180px] rounded-lg bg-tile py-1 shadow-2xl ring-1 ring-line">
          {items
            .filter((i) => !i.hidden)
            .map((i) => (
              <button
                key={i.label}
                onClick={() => {
                  setOpen(false)
                  i.onClick()
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition hover:bg-hover ${i.danger ? 'text-red-400' : 'text-zinc-200'}`}
              >
                {i.icon && <i.icon size={14} className="shrink-0 opacity-80" />}
                {i.label}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

export function PromptModal({
  title,
  label,
  hint,
  initial = '',
  confirm = 'Save',
  onSubmit,
  onClose
}: {
  title: string
  label: string
  hint?: string
  initial?: string
  confirm?: string
  onSubmit: (v: string) => void
  onClose: () => void
}) {
  const [v, setV] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  const ok = v.trim().length > 0
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) onSubmit(v.trim().slice(0, 60))
        }}
      >
        {hint && <p className="mb-4 text-sm text-muted">{hint}</p>}
        <label className="label mb-2 block">{label}</label>
        <input ref={ref} className="input w-full" value={v} maxLength={60} onChange={(e) => setV(e.target.value)} />
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!ok}>
            {confirm}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function ConfirmModal({
  title,
  message,
  confirm,
  danger = true,
  onConfirm,
  onClose
}: {
  title: string
  message: ReactNode
  confirm: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-zinc-300">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirm}
        </Button>
      </div>
    </Modal>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  title,
  width = 'w-14'
}: {
  label?: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  suffix?: string
  title?: string
  width?: string
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const commit = () => {
    const n = Math.round(Number(text))
    if (text.trim() !== '' && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
    else setText(String(value))
  }
  return (
    <label className="flex items-center gap-2 text-xs text-muted" title={title}>
      {label}
      <span className="flex items-center rounded-md bg-tile ring-1 ring-transparent focus-within:ring-accent">
        <input
          className={`${width} bg-transparent px-2 py-1 text-right text-sm text-zinc-100 outline-none`}
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9-]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {suffix && <span className="pr-2 text-xs text-muted">{suffix}</span>}
      </span>
    </label>
  )
}
