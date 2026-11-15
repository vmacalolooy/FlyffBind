import { ChevronDown, Keyboard, MousePointer2, MousePointerClick, Pencil, Repeat, Trash2, Zap } from 'lucide-react'
import { keyLabel } from '../../../shared/keys'
import { type GameWindow, type Macro, MACRO_TYPE_LABEL, MOUSE_MODE_LABEL } from '../../../shared/types'
import { KeysEditor } from './KeysEditor'
import { MouseEditor } from './MouseEditor'
import { TYPE_ICON } from './TypeTiles'
import { Menu, NumberField, Segmented, Switch } from './ui'

interface Props {
  macro: Macro
  windows: GameWindow[]
  conflict: string | null
  update: (fn: (m: Macro) => Macro) => void
  onDelete: () => void
  onRename: () => void
  onChangeHotkey: () => void
  onChangeType: () => void
  onRecordKeys: (actionId: string) => void
  /** first row: the guided tour points here */
  tourAnchor?: boolean
}

function summary(m: Macro, windows: GameWindow[]): string {
  if (m.kind === 'mouse') {
    const n = m.mouse.steps.length
    if (m.mouse.mode === 'recorded') return n ? `${(m.mouse.steps.reduce((t, s) => t + s.delayMs, 0) / m.mouse.speed / 1000).toFixed(1)}s path` : 'Not recorded'
    return n ? `${n} point${n === 1 ? '' : 's'}` : 'No points'
  }
  const names = m.actions.map((a) => windows.find((w) => w.id === a.windowId)?.name).filter(Boolean)
  return names.length ? names.join(', ') : 'No windows'
}

export function MacroRow({ macro: m, windows, conflict, update, onDelete, onRename, onChangeHotkey, onChangeType, onRecordKeys, tourAnchor }: Props) {
  const TypeIcon = TYPE_ICON[m.type]
  const KindIcon = m.kind === 'keys' ? Keyboard : m.mouse.mode === 'recorded' ? MousePointer2 : MousePointerClick
  const open = !m.collapsed
  const set = (patch: Partial<Macro>) => update((x) => ({ ...x, ...patch }))

  return (
    <div data-tour={tourAnchor ? 'macro' : undefined} className={`rounded-lg transition-[background-color,opacity,box-shadow] duration-200 ${open ? 'bg-tile shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]' : 'lift bg-tile/70 hover:bg-tile'} ${m.enabled ? '' : 'opacity-50'}`}>
      {/* Header row */}
      <div className="flex cursor-pointer items-center gap-3 px-4 py-3" onClick={() => set({ collapsed: !m.collapsed })}>
        <KindIcon size={16} className="shrink-0 text-muted" />
        <button
          title="Change trigger key"
          onClick={(e) => {
            e.stopPropagation()
            onChangeHotkey()
          }}
          className={`kbd min-w-[46px] justify-center py-1 hover:ring-1 hover:ring-accent ${conflict ? 'text-amber-400 ring-1 ring-amber-500/60' : 'text-accent'}`}
        >
          {keyLabel(m.hotkey)}
        </button>
        <span className="min-w-0 truncate font-semibold">{m.name}</span>
        <span className="hidden min-w-0 items-center gap-1.5 truncate text-xs text-muted md:flex">
          <TypeIcon size={12} className="shrink-0" />
          {MACRO_TYPE_LABEL[m.type]}
          <span className="opacity-40">·</span>
          <span className="truncate">{summary(m, windows)}</span>
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {conflict && <span className="text-[11px] text-amber-400">{conflict}</span>}
          <Switch checked={m.enabled} onChange={(v) => set({ enabled: v })} title={m.enabled ? 'Enabled' : 'Disabled'} />
          <Menu
            items={[
              { label: 'Rename', icon: Pencil, onClick: onRename },
              { label: 'Change trigger key', icon: Zap, onClick: onChangeHotkey },
              { label: 'Change behavior', icon: Repeat, onClick: onChangeType },
              { label: 'Delete', icon: Trash2, onClick: onDelete, danger: true }
            ]}
          />
          <ChevronDown size={16} className={`chev cursor-pointer text-muted hover:text-zinc-100 ${open ? 'rotate-180' : ''}`} onClick={() => set({ collapsed: !m.collapsed })} />
        </div>
      </div>

      {/* Editor */}
      {open && (
        <div className="expand space-y-4 px-4 pb-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3">
            <span className="label">{m.kind === 'keys' ? 'Keystrokes' : MOUSE_MODE_LABEL[m.mouse.mode]}</span>
            <Segmented
              value={m.passThrough}
              onChange={(v) => set({ passThrough: v })}
              options={[
                { value: false, label: 'Block trigger', title: 'The trigger key does not reach the window you are focused on.' },
                { value: true, label: 'Pass through', title: 'The trigger key also reaches the window you are focused on.' }
              ]}
            />
            {m.type !== 'once' && (
              <NumberField label="Repeat every" suffix="ms" min={10} max={60000} value={m.loopIntervalMs} onChange={(n) => set({ loopIntervalMs: n })} />
            )}
            {m.kind === 'keys' && (
              <NumberField label="Key delay" suffix="ms" min={-1} max={5000} value={m.keyDelayMs} onChange={(n) => set({ keyDelayMs: n })} />
            )}
          </div>
          {m.kind === 'keys' ? (
            <KeysEditor macro={m} windows={windows} update={update} onRecordKeys={onRecordKeys} />
          ) : (
            <MouseEditor macro={m} update={update} />
          )}
        </div>
      )}
    </div>
  )
}
