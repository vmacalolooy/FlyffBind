import { Circle, Crosshair, Info, MousePointerClick, Move, RotateCcw, X } from 'lucide-react'
import { type Macro, type MouseStep, uid } from '../../../shared/types'
import { Button, IconButton, NumberField, Segmented } from './ui'

type Update = (fn: (m: Macro) => Macro) => void

const setMouse = (update: Update, patch: Partial<Macro['mouse']>) => update((m) => ({ ...m, mouse: { ...m.mouse, ...patch } }))

/** Small SVG drawing of a recorded path, with press points marked. */
function PathPreview({ steps }: { steps: MouseStep[] }) {
  const xs = steps.map((s) => s.x)
  const ys = steps.map((s) => s.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const w = Math.max(40, Math.max(...xs) - minX)
  const h = Math.max(40, Math.max(...ys) - minY)
  const pad = Math.max(w, h) * 0.06
  const r = Math.max(w, h) * 0.018
  return (
    <svg viewBox={`${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`} className="h-28 w-48 shrink-0 rounded-md bg-black" preserveAspectRatio="xMidYMid meet">
      <polyline
        points={steps.map((s) => `${s.x},${s.y}`).join(' ')}
        fill="none"
        stroke="#00b8fc"
        strokeOpacity={0.7}
        strokeWidth={r * 0.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {steps
        .filter((s) => s.type === 'down' || s.type === 'click')
        .map((s) => (
          <circle key={s.id} cx={s.x} cy={s.y} r={r} fill={s.button === 'R' ? '#f59e0b' : '#ffffff'} />
        ))}
    </svg>
  )
}

function RecordedPath({ macro: m, update }: { macro: Macro; update: Update }) {
  const steps = m.mouse.steps
  const record = async () => {
    const r = await window.api.recordMouse()
    if (r.steps?.length) setMouse(update, { steps: r.steps })
  }
  if (steps.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-md bg-black/40 px-4 py-4">
        <Button variant="primary" onClick={record}>
          <Circle size={12} fill="currentColor" /> Record path
        </Button>
        <p className="text-xs leading-relaxed text-muted">
          FlyffBind hides itself and records your mouse. Move and click as you want it replayed, then press <span className="kbd">Esc</span> to finish.
        </p>
      </div>
    )
  }
  const total = steps.reduce((t, s) => t + s.delayMs, 0) / m.mouse.speed
  const clicks = steps.filter((s) => s.type === 'down').length
  const moves = steps.filter((s) => s.type === 'move').length
  return (
    <div className="flex items-center gap-5 rounded-md bg-black/40 p-3">
      <PathPreview steps={steps} />
      <div className="flex-1 space-y-1 text-sm">
        <div>
          <span className="text-2xl font-bold">{(total / 1000).toFixed(1)}</span>
          <span className="ml-1 text-muted">sec</span>
        </div>
        <div className="text-xs text-muted">
          {clicks} click{clicks === 1 ? '' : 's'} · {moves} moves
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button size="sm" onClick={record}>
          <Circle size={10} fill="currentColor" className="text-red-500" /> Re-record
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMouse(update, { steps: [] })}>
          <RotateCcw size={12} /> Clear
        </Button>
      </div>
    </div>
  )
}

const ACTIONS = [
  { v: 'L1', label: 'Left click' },
  { v: 'R1', label: 'Right click' },
  { v: 'L2', label: 'Double click' },
  { v: 'M1', label: 'Middle click' },
  { v: 'move', label: 'Move only' }
]
const stepAction = (s: MouseStep) => (s.type === 'move' ? 'move' : `${s.button}${s.count}`)

function ClickPoints({ macro: m, update }: { macro: Macro; update: Update }) {
  const steps = m.mouse.steps.filter((s) => s.type === 'click' || s.type === 'move')
  const setStep = (id: string, patch: Partial<MouseStep>) =>
    update((x) => ({ ...x, mouse: { ...x.mouse, steps: x.mouse.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) } }))

  const pick = async (id: string | null, type: MouseStep['type']) => {
    const n = id ? steps.findIndex((s) => s.id === id) + 1 : steps.length + 1
    const r = await window.api.pickPoint(`point #${n}`)
    if (r.cancelled || r.x == null || r.y == null) return
    if (id) setStep(id, { x: r.x, y: r.y })
    else {
      const step: MouseStep = { id: uid(), type, button: 'L', count: 1, x: r.x, y: r.y, delayMs: steps.length ? 150 : 0 }
      update((x) => ({ ...x, mouse: { ...x.mouse, steps: [...x.mouse.steps.filter((s) => s.type === 'click' || s.type === 'move'), step] } }))
    }
  }

  return (
    <div>
      {steps.length > 0 && (
        <div className="mb-1 grid grid-cols-[28px_140px_150px_1fr_28px] items-center gap-3 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span>#</span>
          <span>Action</span>
          <span>Position</span>
          <span>Wait before</span>
          <span />
        </div>
      )}
      <div className="space-y-1">
        {steps.map((s, i) => (
          <div key={s.id} className="group/row grid grid-cols-[28px_140px_150px_1fr_28px] items-center gap-3 rounded-md px-1 py-1 hover:bg-hover/40">
            <span className="text-xs font-bold text-muted">{i + 1}</span>
            <select
              className="input py-1.5"
              value={stepAction(s)}
              onChange={(e) => {
                const v = e.target.value
                if (v === 'move') setStep(s.id, { type: 'move' })
                else setStep(s.id, { type: 'click', button: v[0] as MouseStep['button'], count: v[1] === '2' ? 2 : 1 })
              }}
            >
              {ACTIONS.map((a) => (
                <option key={a.v} value={a.v}>
                  {a.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => pick(s.id, s.type)}
              title="Pick this spot again"
              className="flex items-center gap-2 rounded-md bg-tile px-2.5 py-1.5 text-left text-sm tabular-nums transition hover:bg-hover"
            >
              <Crosshair size={13} className="shrink-0 text-accent" />
              {s.x}, {s.y}
            </button>
            <NumberField value={s.delayMs} min={0} max={600000} suffix="ms" onChange={(n) => setStep(s.id, { delayMs: n })} />
            <IconButton
              title="Remove step"
              className="opacity-0 group-hover/row:opacity-100 hover:text-red-400"
              onClick={() => update((x) => ({ ...x, mouse: { ...x.mouse, steps: x.mouse.steps.filter((y) => y.id !== s.id) } }))}
            >
              <X size={14} />
            </IconButton>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" variant={steps.length ? 'subtle' : 'primary'} onClick={() => pick(null, 'click')}>
          <MousePointerClick size={13} /> Add click point
        </Button>
        <Button size="sm" variant="ghost" onClick={() => pick(null, 'move')}>
          <Move size={13} /> Add move
        </Button>
        {steps.length === 0 && <span className="text-xs text-muted">FlyffBind hides — click the spot on screen to add it.</span>}
      </div>
    </div>
  )
}

export function MouseEditor({ macro: m, update }: { macro: Macro; update: Update }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            className="accent-[#00b8fc]"
            checked={m.mouse.restoreCursor}
            onChange={(e) => setMouse(update, { restoreCursor: e.target.checked })}
          />
          Return cursor afterwards
        </label>
        {m.mouse.mode === 'recorded' && (
          <span className="flex items-center gap-2 text-xs text-muted">
            Speed
            <Segmented
              value={m.mouse.speed}
              onChange={(v) => setMouse(update, { speed: v })}
              options={[0.5, 1, 2, 4].map((v) => ({ value: v, label: `${v}×` }))}
            />
          </span>
        )}
      </div>
      {m.mouse.mode === 'recorded' ? <RecordedPath macro={m} update={update} /> : <ClickPoints macro={m} update={update} />}
      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <Info size={12} /> Mouse macros move your real cursor and click on whatever window is under it.
      </p>
    </div>
  )
}
