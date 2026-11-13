import { Copy, Download, FileDown, FolderOpen, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import type { EngineStatus, Profile } from '../../../shared/types'
import { IconButton, Menu } from './ui'

export function Sidebar({
  profiles,
  activeId,
  dirtyIds,
  engine,
  onSelect,
  onOpenFolder,
  onNew,
  onImport,
  onRename,
  onDuplicate,
  onExport,
  onDelete
}: {
  onOpenFolder: () => void
  profiles: Profile[]
  activeId: string
  dirtyIds: Set<string>
  engine: EngineStatus
  onSelect: (id: string) => void
  onNew: () => void
  onImport: () => void
  onRename: (p: Profile) => void
  onDuplicate: (p: Profile) => void
  onExport: (p: Profile) => void
  onDelete: (p: Profile) => void
}) {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-panel">
      <div className="flex items-center gap-2 px-5 pt-6 pb-8">
        <Zap size={18} className="text-accent" fill="currentColor" />
        <span className="text-base font-extrabold tracking-[0.18em]">FLYFFBIND</span>
      </div>
      <div className="flex items-center justify-between px-5 pb-2">
        <span className="label">Profiles</span>
        <div className="-mr-1.5 flex">
          <IconButton title="Import a profile file (e.g. from a friend)" onClick={onImport}>
            <FileDown size={15} />
          </IconButton>
          <IconButton title="Open the Profiles folder (Documents\FlyffBind\Profiles)" onClick={onOpenFolder}>
            <FolderOpen size={15} />
          </IconButton>
          <IconButton title="New profile" onClick={onNew}>
            <Plus size={16} />
          </IconButton>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {profiles.map((p) => {
          const active = p.id === activeId
          const running = engine.profileId === p.id && engine.state === 'running'
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`group relative flex cursor-pointer items-center gap-2 rounded-md py-2 pl-3 pr-1 text-sm transition ${
                active ? 'bg-tile text-zinc-100' : 'text-zinc-400 hover:bg-tile/60 hover:text-zinc-100'
              }`}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent" />}
              <span className="flex-1 truncate font-medium">{p.name}</span>
              {dirtyIds.has(p.id) && <span title="Unsaved changes" className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
              {running && <span title="Running" className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />}
              <div className="opacity-0 transition group-hover:opacity-100">
                <Menu
                  items={[
                    { label: 'Rename', icon: Pencil, onClick: () => onRename(p), hidden: p.isDefault },
                    { label: 'Duplicate', icon: Copy, onClick: () => onDuplicate(p) },
                    { label: 'Export / share', icon: Download, onClick: () => onExport(p) },
                    { label: 'Delete', icon: Trash2, onClick: () => onDelete(p), danger: true, hidden: p.isDefault }
                  ]}
                />
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
