import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { CHANGELOG, type ChangelogEntry, type ChangeType, compareVersions } from '../changelog'
import { Button, Modal } from './ui'
import { Wordmark } from './Wordmark'

const TAG: Record<ChangeType, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-accent/15 text-accent' },
  improved: { label: 'Improved', cls: 'bg-emerald-400/10 text-emerald-400' },
  fixed: { label: 'Fixed', cls: 'bg-amber-400/10 text-amber-300' }
}

const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

function Entry({ e, delay }: { e: ChangelogEntry; delay: number }) {
  return (
    <div className="expand rounded-lg p-4 ring-1 ring-line" style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <div className="mb-2.5 flex items-baseline gap-3">
        <span className="font-bold">{e.title}</span>
        <span className="ml-auto whitespace-nowrap text-[11px] text-muted">
          v{e.version} · {fmtDate(e.date)}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {e.items.map((it, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-zinc-300">
            <span className={`mt-0.5 min-w-[70px] shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] ${TAG[it.type].cls}`}>
              {TAG[it.type].label}
            </span>
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Patch notes. `from` = the version the user had before updating: shows everything newer
 * than it. Without `from` it shows the current version's notes, with older ones folded.
 */
export function WhatsNew({ version, from, updated, onClose }: { version: string; from?: string; updated?: boolean; onClose: () => void }) {
  const [showOlder, setShowOlder] = useState(false)
  const known = CHANGELOG.filter((e) => compareVersions(e.version, version) <= 0)
  let entries = known.filter((e) => (from ? compareVersions(e.version, from) > 0 : true))
  if (!from) entries = entries.slice(0, 1)
  if (!entries.length) entries = known.slice(0, 1)
  const older = known.filter((e) => !entries.includes(e))

  return (
    <Modal title={updated ? 'BINDit updated' : 'What’s new'} onClose={onClose} medium>
      <div className="mb-4 rounded-lg bg-tile px-3 pt-5 pb-4 text-center" style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.07), transparent 70%), #1a1a1a' }}>
        <Wordmark size={40} className="intro" />
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {updated && from && (
            <>
              <span className="rounded-full bg-hover px-2.5 py-0.5 text-xs font-semibold text-muted">v{from}</span>
              <ArrowRight size={14} className="text-muted" />
            </>
          )}
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">v{version}</span>
        </div>
        {updated && (
          <p className="mt-2.5 text-[13px] text-zinc-400">
            {entries.length > 1 ? `You’re ${entries.length} updates ahead. Here’s what changed:` : 'Here’s what changed in this update:'}
          </p>
        )}
      </div>
      <div className="flex max-h-[46vh] flex-col gap-2.5 overflow-y-auto pr-1">
        {entries.map((e, i) => (
          <Entry key={e.version} e={e} delay={i * 60} />
        ))}
        {showOlder && older.map((e, i) => <Entry key={e.version} e={e} delay={i * 60} />)}
      </div>
      <div className="mt-5 flex items-center justify-between">
        {older.length > 0 && !showOlder ? (
          <Button variant="ghost" size="sm" onClick={() => setShowOlder(true)}>
            Earlier updates ({older.length})
          </Button>
        ) : (
          <span />
        )}
        <Button variant="primary" onClick={onClose}>
          {updated ? 'Let’s go' : 'Close'}
        </Button>
      </div>
    </Modal>
  )
}
