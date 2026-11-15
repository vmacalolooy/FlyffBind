import { Crosshair, Pencil, Plus, Trash2, Unlink } from 'lucide-react'
import type { GameWindow } from '../../../shared/types'
import { Menu, SectionHeader } from './ui'

export function WindowsSection({
  windows,
  alive,
  pickingId,
  onAdd,
  onRename,
  onDelete,
  onLink,
  onUnlink
}: {
  windows: GameWindow[]
  alive: Record<number, boolean>
  pickingId: string | null
  onAdd: () => void
  onRename: (w: GameWindow) => void
  onDelete: (w: GameWindow) => void
  onLink: (w: GameWindow) => void
  onUnlink: (w: GameWindow) => void
}) {
  const pidCount = new Map<number, number>()
  windows.forEach((w) => w.pid && pidCount.set(w.pid, (pidCount.get(w.pid) ?? 0) + 1))

  return (
    <section data-tour="windows">
      <SectionHeader title="Windows" count={windows.length} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {windows.map((w, i) => {
          const linked = w.pid != null
          const dead = linked && alive[w.pid!] === false
          const dup = linked && (pidCount.get(w.pid!) ?? 0) > 1
          const notFirefox = linked && !!w.lastProcess && !/^firefox\.exe$/i.test(w.lastProcess)
          const picking = pickingId === w.id
          const warn = dead ? 'Window closed — link it again' : dup ? 'Shares a PID with another window' : notFirefox ? `Not Firefox (${w.lastProcess})` : null
          const dot = picking ? 'bg-accent animate-pulse' : !linked ? 'bg-zinc-600' : dead ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-emerald-400'
          return (
            <div key={w.id} className="lift group rounded-lg bg-tile p-3 hover:bg-hover/60">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-300 ${dot}`} />
                <span className="flex-1 truncate font-semibold">{w.name}</span>
                <Menu
                  items={[
                    { label: 'Rename', icon: Pencil, onClick: () => onRename(w) },
                    { label: 'Unlink', icon: Unlink, onClick: () => onUnlink(w), hidden: !linked },
                    { label: 'Delete', icon: Trash2, onClick: () => onDelete(w), danger: true }
                  ]}
                />
              </div>
              <div className="mt-1 flex h-5 items-center pl-4 text-xs" title={w.lastTitle ? `${w.lastProcess} · ${w.lastTitle}` : undefined}>
                {picking ? (
                  <span className="text-accent">Click the window… (Esc cancels)</span>
                ) : warn ? (
                  <span className={dead ? 'text-red-400' : 'text-amber-400'}>{warn}</span>
                ) : linked ? (
                  <span className="text-muted">PID {w.pid}</span>
                ) : (
                  <span className="text-muted">Not linked</span>
                )}
              </div>
              <button
                data-tour={i === 0 ? 'link' : undefined}
                onClick={() => onLink(w)}
                disabled={pickingId !== null}
                className={`tap btn mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold disabled:opacity-40 ${
                  !linked || dead ? 'btn-primary bg-accent text-black' : 'btn-subtle bg-hover text-zinc-300 hover:text-white'
                }`}
              >
                <Crosshair size={13} /> {linked ? 'Re-link' : 'Link'}
              </button>
            </div>
          )
        })}
        <button
          data-tour="add-window"
          onClick={onAdd}
          className="tap group/add flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line text-xs font-semibold text-muted hover:border-accent hover:bg-accent/5 hover:text-accent"
        >
          <Plus size={18} className="transition-transform duration-300 group-hover/add:rotate-90 group-hover/add:scale-125" />
          Add window
        </button>
      </div>
      {windows.length === 0 && (
        <p className="mt-3 text-xs text-muted">
          Add one window per account (e.g. Templar, Seraph, DPS), then link each to its own Firefox window.
        </p>
      )}
    </section>
  )
}
