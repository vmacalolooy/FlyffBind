import { Keyboard, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { keyLabel } from '../../../shared/keys'
import { type GameWindow, type Macro, type MacroAction, uid } from '../../../shared/types'
import { IconButton } from './ui'

/** One row per target window: window picker + recorded key chips. */
export function KeysEditor({
  macro: m,
  windows,
  update,
  onRecordKeys
}: {
  macro: Macro
  windows: GameWindow[]
  update: (fn: (m: Macro) => Macro) => void
  onRecordKeys: (actionId: string) => void
}) {
  const [drag, setDrag] = useState<{ action: string; index: number } | null>(null)
  const setAction = (id: string, patch: Partial<MacroAction>) =>
    update((x) => ({ ...x, actions: x.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))
  const used = new Set(m.actions.map((a) => a.windowId))
  const nextWindow = windows.find((w) => !used.has(w.id)) ?? windows[0]
  const winName = (id: string) => windows.find((w) => w.id === id)?.name

  const moveKey = (a: MacroAction, from: number, to: number) => {
    if (from === to) return
    const keys = [...a.keys]
    const [k] = keys.splice(from, 1)
    keys.splice(to, 0, k)
    setAction(a.id, { keys })
  }

  return (
    <div>
      <div className="space-y-1">
        {m.actions.map((a) => (
          <div key={a.id} className="group/row flex items-center gap-3 rounded-md px-1 py-1 hover:bg-hover/40">
            <select className="input w-36 shrink-0 py-1.5 text-sm font-semibold" value={a.windowId} onChange={(e) => setAction(a.id, { windowId: e.target.value })}>
              {!winName(a.windowId) && <option value={a.windowId}>(deleted window)</option>}
              {windows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {a.keys.map((k, i) => (
                <span
                  key={i}
                  draggable
                  onDragStart={() => setDrag({ action: a.id, index: i })}
                  onDragOver={(e) => drag?.action === a.id && e.preventDefault()}
                  onDrop={() => {
                    if (drag?.action === a.id) moveKey(a, drag.index, i)
                    setDrag(null)
                  }}
                  onDragEnd={() => setDrag(null)}
                  className="kbd pop group cursor-grab py-1 active:cursor-grabbing"
                  title="Drag to reorder"
                >
                  {keyLabel(k)}
                  <button
                    onClick={() => setAction(a.id, { keys: a.keys.filter((_, j) => j !== i) })}
                    className="-mr-1 hidden rounded text-muted hover:text-red-400 group-hover:inline"
                    title="Remove key"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <button
                onClick={() => onRecordKeys(a.id)}
                className={`tap inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
                  a.keys.length ? 'text-muted hover:text-accent' : 'bg-accent/10 text-accent hover:bg-accent/20'
                }`}
              >
                <Keyboard size={12} /> {a.keys.length ? 'Edit' : 'Record keys'}
              </button>
            </div>
            <IconButton
              title="Remove this window"
              onClick={() => update((x) => ({ ...x, actions: x.actions.filter((y) => y.id !== a.id) }))}
              className="opacity-0 group-hover/row:opacity-100 hover:text-red-400"
            >
              <X size={14} />
            </IconButton>
          </div>
        ))}
      </div>
      <button
        disabled={!nextWindow}
        onClick={() => nextWindow && update((x) => ({ ...x, actions: [...x.actions, { id: uid(), windowId: nextWindow.id, keys: [] }] }))}
        className="tap mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-accent/5 hover:text-accent disabled:hover:text-muted"
      >
        <Plus size={13} /> {nextWindow ? 'Add window' : 'Add a window above first'}
      </button>
    </div>
  )
}
