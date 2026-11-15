import { ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from './ui'

// ════════════════════════════════════════════════════════════════════════════
// Guided tour (spotlight + speech bubble) and the launch-time "Show me around"
// nudge. Same pattern as DemonRoll.
// ════════════════════════════════════════════════════════════════════════════

interface Step {
  /** value of a data-tour="…" attribute; no target = centred card */
  target?: string
  title: string
  text: ReactNode
  /** skip this step when its target isn't on screen (e.g. no macros yet) */
  optional?: boolean
  last?: boolean
}

const STEPS: Step[] = [
  {
    title: 'Welcome to BINDit',
    text: (
      <>
        BINDit plays your macros in <b>several Flyff windows at once</b>, in the background, so you never have to switch windows.
        <br />
        <br />
        Setup takes about two minutes. We’ll go one step at a time.
      </>
    )
  },
  {
    target: 'add-window',
    title: 'Step 1 · Add your characters',
    text: (
      <>
        Click <b>Add window</b> once for each account you play, e.g. <b>Templar</b>, <b>Seraph</b>, <b>DPS</b>.
        <br />
        Each account needs its <b>own Firefox profile</b> (run <b>firefox -P</b> to make them).
      </>
    )
  },
  {
    target: 'link',
    optional: true,
    title: 'Link each window',
    text: (
      <>
        Click <b>Link</b>, then click that character’s Firefox window. The dot turns <b>green</b> when it’s linked.
        <br />
        Restarted Firefox? The dot turns red, so just link it again.
      </>
    )
  },
  {
    target: 'add-macro',
    title: 'Step 2 · Create a macro',
    text: (
      <>
        Click <b>Add macro</b>, press the key that should trigger it and give it a name. Then choose:
        <br />• what it does: <b>Keystrokes</b>, <b>Recorded Path</b> or <b>Click Points</b>
        <br />• how it repeats: <b>No Repeat</b>, <b>Repeat While Holding</b> or <b>Toggle</b>
      </>
    )
  },
  {
    target: 'macro',
    optional: true,
    title: 'Fine-tune it',
    text: (
      <>
        Click a macro to open it. Choose which keys each window gets and how fast it repeats.
        <br />
        <b>Pass through</b> also sends the trigger key to the game you’re playing; <b>Block trigger</b> keeps it for BINDit only. The switch turns a
        macro on or off.
      </>
    )
  },
  {
    target: 'startkey',
    title: 'Step 3 · Your on/off key',
    text: (
      <>
        Set a <b>Start / Stop key</b> to turn every macro on or off <b>from inside the game</b>, without coming back here.
      </>
    )
  },
  {
    target: 'start',
    title: 'Step 4 · Start',
    text: (
      <>
        Click <b>Start</b> (or press your key). The dot turns <b>green</b> while macros are live.
        <br />
        Changes apply straight away, even before you save.
      </>
    )
  },
  {
    target: 'save',
    title: 'Save it for next time',
    text: (
      <>
        <b>Default</b> is a scratch space. Click <b>Save as…</b> to keep your setup as a named profile.
        <br />
        An amber dot means unsaved changes. <b>Ctrl+S</b> saves.
      </>
    )
  },
  {
    target: 'profile-tools',
    title: 'Share with friends',
    text: (
      <>
        Every profile is a file in <b>Documents\BINDit\Profiles</b>. Send one with a profile’s <b>⋯ → Export / share</b>; friends load it with{' '}
        <b>Import</b>. Your window links are never included.
      </>
    )
  },
  {
    title: 'You’re all set',
    text: (
      <>
        That’s everything. Want this tour again? Click <b>Show me around</b> at the bottom left.
      </>
    ),
    last: true
  }
]

const find = (target?: string) => (target ? document.querySelector<HTMLElement>(`[data-tour="${target}"]`) : null)

export function Tour({ onClose }: { onClose: () => void }) {
  // Decide once, at the start, which optional steps apply to this setup.
  const steps = useMemo(() => STEPS.filter((s) => !s.optional || find(s.target)), [])
  const [i, setI] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const holeRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const step = steps[i]

  const close = useCallback(() => {
    setLeaving(true)
    setTimeout(onClose, 200)
  }, [onClose])

  const go = useCallback(
    (n: number) => {
      if (n >= steps.length) close()
      else if (n >= 0) setI(n)
    },
    [steps.length, close]
  )

  const position = useCallback(() => {
    const root = rootRef.current
    const hole = holeRef.current
    const card = cardRef.current
    if (!root || !hole || !card) return
    const target = find(step.target)
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cw = Math.min(360, vw - 32)
    card.style.width = `${cw}px`
    const ch = card.offsetHeight
    card.dataset.arrow = ''

    if (!target) {
      root.classList.add('dim')
      hole.style.opacity = '0'
      card.style.left = `${(vw - cw) / 2}px`
      card.style.top = `${Math.max(16, (vh - ch) / 2)}px`
      return
    }
    root.classList.remove('dim')
    const r = target.getBoundingClientRect()
    const pad = 8
    const box = { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 }
    Object.assign(hole.style, { opacity: '1', left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` })

    const gap = 16
    const cx = r.left + r.width / 2
    let left: number
    let top: number
    let arrow: string
    if (box.y + box.h + gap + ch < vh - 8) {
      top = box.y + box.h + gap
      arrow = 'up'
    } else if (box.y - gap - ch > 8) {
      top = box.y - gap - ch
      arrow = 'down'
    } else {
      arrow = ''
      top = 0
    }
    if (arrow) {
      left = Math.min(vw - cw - 16, Math.max(16, cx - cw / 2))
      card.style.setProperty('--arrow-x', `${Math.min(cw - 24, Math.max(24, cx - left))}px`)
    } else if (box.x + box.w + gap + cw < vw - 8) {
      left = box.x + box.w + gap
      arrow = 'left'
      top = Math.min(vh - ch - 16, Math.max(16, r.top + r.height / 2 - ch / 2))
      card.style.setProperty('--arrow-y', `${Math.min(ch - 24, Math.max(24, r.top + r.height / 2 - top))}px`)
    } else {
      left = Math.max(16, box.x - gap - cw)
      arrow = 'right'
      top = Math.min(vh - ch - 16, Math.max(16, r.top + r.height / 2 - ch / 2))
      card.style.setProperty('--arrow-y', `${Math.min(ch - 24, Math.max(24, r.top + r.height / 2 - top))}px`)
    }
    card.dataset.arrow = arrow
    card.style.left = `${left}px`
    card.style.top = `${top}px`
  }, [step])

  // Move to the step's target, then keep following it while the page scrolls it into view.
  useLayoutEffect(() => {
    const target = find(step.target)
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    position()
    const card = cardRef.current
    card?.classList.remove('in')
    void card?.offsetWidth
    card?.classList.add('in')
    const timers = [150, 400, 700].map((ms) => setTimeout(position, ms))
    requestAnimationFrame(() => card?.querySelector<HTMLButtonElement>('.btn-primary')?.focus({ preventScroll: true }))
    return () => timers.forEach(clearTimeout)
  }, [i, position, step])

  useEffect(() => {
    let raf = 0
    const onMove = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(position)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') go(i + 1)
      else if (e.key === 'ArrowLeft') go(i - 1)
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('resize', onMove)
    document.addEventListener('scroll', onMove, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onMove)
      document.removeEventListener('scroll', onMove, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [position, close, go, i])

  return (
    <div ref={rootRef} className={`tour ${leaving ? 'leaving' : ''}`}>
      <div ref={holeRef} className="tour-hole" />
      <div ref={cardRef} className="tour-card" role="dialog" aria-live="polite">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            {i + 1} of {steps.length}
          </span>
          {!step.last && (
            <button className="text-xs text-muted transition-colors hover:text-zinc-100" onClick={close}>
              Skip tour
            </button>
          )}
        </div>
        <div className="mt-2 text-lg font-bold">{step.title}</div>
        <div className="tour-text mt-1.5 text-sm leading-relaxed text-zinc-300">{step.text}</div>
        <div className="mt-4 flex items-center gap-1.5">
          <div className="tour-dots mr-auto flex gap-1">
            {steps.map((_, k) => (
              <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />
            ))}
          </div>
          {i > 0 && !step.last && (
            <Button size="sm" variant="ghost" onClick={() => go(i - 1)}>
              <ArrowLeft size={13} /> Back
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={() => go(i + 1)}>
            {step.last ? 'Let’s go' : i === 0 ? 'Show me' : 'Next'}
            {!step.last && <ArrowRight size={13} />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Launch nudge ─────────────────────────────────────────────────────────────

export const TOUR_HINT_MS = 150000

/** Callout next to "Show me around", with a countdown bar. */
export function TourHint({ onStart, onDismiss, onNever }: { onStart: () => void; onDismiss: () => void; onNever: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const [leaving, setLeaving] = useState(false)

  const leave = useCallback((then: () => void) => {
    setLeaving(true)
    setTimeout(then, 200)
  }, [])

  useLayoutEffect(() => {
    const place = () => {
      const btn = document.getElementById('tourBtn')
      const card = ref.current
      if (!btn || !card) return
      const r = btn.getBoundingClientRect()
      card.style.left = `${r.right + 18}px`
      card.style.top = `${Math.min(window.innerHeight - card.offsetHeight - 12, Math.max(12, r.bottom - card.offsetHeight + 8))}px`
    }
    place()
    window.addEventListener('resize', place)
    requestAnimationFrame(() => {
      if (barRef.current) {
        barRef.current.style.transitionDuration = `${TOUR_HINT_MS}ms`
        barRef.current.style.width = '0%'
      }
    })
    const t = setTimeout(() => leave(onDismiss), TOUR_HINT_MS)
    return () => {
      window.removeEventListener('resize', place)
      clearTimeout(t)
    }
  }, [leave, onDismiss])

  return (
    <div ref={ref} className={`tour-hint ${leaving ? 'leaving' : ''}`} role="status">
      <span className="hint-arrow">
        <ArrowLeft size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">New here, or need a refresher?</div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-zinc-400">
          Take the <b className="text-zinc-100">2-minute tour</b>. It shows you where everything is, step by step.
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="primary" onClick={() => leave(onStart)}>
            <HelpCircle size={13} /> Show me around
          </Button>
          <Button size="sm" variant="ghost" onClick={() => leave(onDismiss)}>
            Not now
          </Button>
          <button
            className="ml-auto text-[11px] text-muted underline underline-offset-2 transition-colors hover:text-zinc-100"
            onClick={() => leave(onNever)}
          >
            Don’t show again
          </button>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-hover">
        <i ref={barRef} className="hint-timer" style={{ width: '100%' }} />
      </div>
    </div>
  )
}

// ── Remembered choices (per PC) ─────────────────────────────────────────────

const KEY_DONE = 'bindit.tourDone'
const KEY_HINT_OFF = 'bindit.tourHintOff'
const read = (k: string) => {
  try {
    return localStorage.getItem(k) === '1'
  } catch {
    return false
  }
}
const write = (k: string) => {
  try {
    localStorage.setItem(k, '1')
  } catch {
    /* storage unavailable: the tour just shows again next time */
  }
}
const KEY_LAST_VERSION = 'bindit.lastSeenVersion'
/** Last app version whose patch notes this PC has seen. */
export const versionPrefs = {
  lastSeen: () => {
    try {
      return localStorage.getItem(KEY_LAST_VERSION) ?? ''
    } catch {
      return ''
    }
  },
  setLastSeen: (v: string) => {
    try {
      localStorage.setItem(KEY_LAST_VERSION, v)
    } catch {
      /* storage unavailable */
    }
  }
}
export const tourPrefs = {
  done: () => read(KEY_DONE),
  setDone: () => write(KEY_DONE),
  hintOff: () => read(KEY_HINT_OFF),
  setHintOff: () => write(KEY_HINT_OFF)
}
