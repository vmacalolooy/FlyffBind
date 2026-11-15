import { AlertTriangle, CheckCircle2, Download, ExternalLink, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { UpdateStatus } from '../../../shared/types'
import { Button } from './ui'

/**
 * Small card above "Show me around". Nothing downloads until the user asks:
 *   available   → Download update / What's in it / Later
 *   downloading → progress bar
 *   ready       → Restart & update (or it installs when BINDit closes)
 */
export function UpdateCard({ update, macrosRunning }: { update: UpdateStatus; macrosRunning: boolean }) {
  const [hiddenFor, setHiddenFor] = useState<string | null>(null)
  const [restarting, setRestarting] = useState(false)
  const v = update.version
  if (!v || !['available', 'downloading', 'ready', 'error'].includes(update.status)) return null
  if (update.status === 'available' && hiddenFor === v) return null

  const shell = (tone: 'accent' | 'green' | 'amber', children: React.ReactNode) => (
    <div
      className={`expand mb-2 rounded-lg p-3 ring-1 ${
        tone === 'green' ? 'bg-emerald-400/[.07] ring-emerald-400/40' : tone === 'amber' ? 'bg-amber-400/[.07] ring-amber-400/40' : 'bg-accent/[.07] ring-accent/40'
      }`}
    >
      {children}
    </div>
  )

  if (update.status === 'available') {
    return shell(
      'accent',
      <>
        <div className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Sparkles size={13} className="text-accent" /> BINDit v{v} is out
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-muted">
          {update.portable ? 'Download the new portable version from the release page.' : 'Download it now. It installs when you restart.'}
        </p>
        <div className="mt-2.5 flex flex-col gap-1.5">
          {update.portable ? (
            <Button size="sm" variant="primary" onClick={() => window.api.openRelease(v)}>
              <ExternalLink size={12} /> Get v{v}
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={() => window.api.downloadUpdate()}>
              <Download size={12} /> Download update
            </Button>
          )}
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => window.api.openRelease(v)}>
              What’s in it
            </Button>
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => setHiddenFor(v)}>
              Later
            </Button>
          </div>
        </div>
      </>
    )
  }

  if (update.status === 'downloading') {
    const pct = update.percent ?? 0
    return shell(
      'accent',
      <>
        <div className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Download size={13} className="text-accent" /> Downloading v{v}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
          <i className="block h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-muted">{pct}% · you can keep using BINDit</p>
      </>
    )
  }

  if (update.status === 'error') {
    return shell(
      'amber',
      <>
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-300">
          <AlertTriangle size={13} /> Update didn’t download
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-muted">{update.message}</p>
        <Button size="sm" variant="subtle" className="mt-2 w-full" onClick={() => window.api.downloadUpdate()}>
          Try again
        </Button>
      </>
    )
  }

  return shell(
    'green',
    <>
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-400">
        <CheckCircle2 size={13} /> v{v} is ready
      </div>
      <p className="mt-1 text-[11.5px] leading-snug text-muted">
        {macrosRunning ? 'Restarting stops your macros for a moment.' : 'Takes a few seconds.'} Or it installs when you close BINDit.
      </p>
      <Button
        size="sm"
        variant="primary"
        className="mt-2 w-full !bg-emerald-400"
        disabled={restarting}
        onClick={async () => {
          setRestarting(true)
          await window.api.installUpdate()
        }}
      >
        {restarting ? 'Restarting…' : 'Restart & update'}
      </Button>
    </>
  )
}
