import { Play, Save, Square, Undo2, X } from 'lucide-react'
import { keyLabel } from '../../../shared/keys'
import type { EngineStatus, Profile } from '../../../shared/types'
import { Button, IconButton } from './ui'

export function Header({
  profile,
  dirty,
  engine,
  onSave,
  onDiscard,
  onToggleRunning,
  onSetKey,
  onClearKey
}: {
  profile: Profile
  dirty: boolean
  engine: EngineStatus
  onSave: () => void
  onDiscard: () => void
  onToggleRunning: () => void
  onSetKey: () => void
  onClearKey: () => void
}) {
  const mine = engine.profileId === profile.id
  const running = mine && engine.state === 'running'
  const error = engine.state === 'error'

  return (
    <header className="px-10 pt-8">
      {/* Profile + save */}
      <div className="flex items-end gap-4">
        <div className="min-w-0">
          <div className="label">{profile.isDefault ? 'Default profile' : 'Profile'}</div>
          <h1 className="mt-1 truncate text-3xl font-bold tracking-wide">{profile.name}</h1>
        </div>
        {dirty && <span className="mb-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">Unsaved changes</span>}
        <div className="ml-auto flex items-center gap-2 pb-0.5">
          {dirty && (
            <Button variant="ghost" onClick={onDiscard} title="Throw away changes since the last save">
              <Undo2 size={14} /> Discard
            </Button>
          )}
          <Button variant={dirty ? 'primary' : 'subtle'} onClick={onSave} disabled={!dirty && !profile.isDefault} title="Save (Ctrl+S)">
            <Save size={14} /> {profile.isDefault ? 'Save as…' : 'Save'}
          </Button>
        </div>
      </div>
      {profile.isDefault && <p className="mt-1 text-xs text-muted">Scratch space — use Save as… to keep this setup as its own named profile.</p>}

      {/* Start / stop */}
      <div className="mt-6 flex items-center gap-4 rounded-lg bg-tile px-4 py-3">
        <span className={`h-2.5 w-2.5 rounded-full ${running ? 'bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400/60' : error ? 'bg-red-500' : 'bg-zinc-600'}`} />
        <div className="min-w-0">
          <div className={`text-sm font-bold uppercase tracking-[0.14em] ${running ? 'text-emerald-400' : error ? 'text-red-400' : 'text-zinc-300'}`}>
            {running ? 'Running' : error ? 'Error' : 'Stopped'}
          </div>
          <div className="truncate text-xs text-muted">
            {running ? 'Your macros are live.' : profile.suspendKey ? `Press ${keyLabel(profile.suspendKey)} or Start to turn macros on.` : 'Press Start to turn macros on.'}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="label">Start / Stop key</span>
          <button onClick={onSetKey} className="kbd py-1 hover:ring-1 hover:ring-accent" title="Set a key that starts and stops all macros">
            {profile.suspendKey ? keyLabel(profile.suspendKey) : 'Set key'}
          </button>
          {profile.suspendKey && (
            <IconButton title="Remove start / stop key" className="h-6 w-6" onClick={onClearKey}>
              <X size={12} />
            </IconButton>
          )}
        </div>
        <Button variant={running ? 'danger' : 'primary'} onClick={onToggleRunning} className="w-28">
          {running ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />} {running ? 'Stop' : 'Start'}
        </Button>
      </div>
      {error && engine.message && <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-red-500/10 p-2 text-xs text-red-300">{engine.message}</pre>}
    </header>
  )
}
