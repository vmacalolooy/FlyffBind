import { Check } from 'lucide-react'
import { useState } from 'react'
import { keyLabel } from '../../../shared/keys'
import { type Macro, newMacro } from '../../../shared/types'
import { KeyRecorder } from './KeyCapture'
import { type ActionChoice, ActionTiles, TypeTiles } from './TypeTiles'
import { Button, Modal } from './ui'

const STEPS = ['Trigger', 'Name', 'Action', 'Behavior']

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center justify-end gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
      {STEPS.map((s, i) => {
        const n = i + 1
        const done = n < step
        const cur = n === step
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className={`h-px w-4 ${done || cur ? 'bg-accent/60' : 'bg-line'}`} />}
            <span className={`flex items-center gap-1.5 ${cur ? 'text-zinc-100' : done ? 'text-accent' : 'text-muted'}`}>
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                  cur ? 'bg-accent text-black' : done ? 'bg-accent/20 text-accent' : 'bg-tile'
                }`}
              >
                {done ? <Check size={10} strokeWidth={3} /> : n}
              </span>
              {s}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Trigger key -> name -> action (keys / mouse) -> behavior (no repeat / hold / toggle). */
export function MacroWizard({ validateKey, onCreate, onClose }: { validateKey: (k: string) => string | null; onCreate: (m: Macro) => void; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [hotkey, setHotkey] = useState('')
  const [name, setName] = useState('')
  const [action, setAction] = useState<ActionChoice | undefined>()

  const summary = (
    <div className="mb-5 flex items-center gap-2 text-xs text-muted">
      Trigger <span className="kbd">{keyLabel(hotkey)}</span>
      {step > 2 && name && (
        <>
          <span className="opacity-50">·</span>
          <span className="font-semibold text-zinc-300">{name}</span>
        </>
      )}
    </div>
  )

  return (
    <Modal title="New macro" header={<Stepper step={step} />} onClose={step === 1 ? undefined : onClose} wide={step >= 3} medium>
      {step === 1 && (
        <KeyRecorder
          hint="Press the key (or key combo) that will trigger this macro."
          mode="single"
          allowMouse
          initial={hotkey ? [hotkey] : []}
          validate={validateKey}
          onDone={([k]) => {
            if (!k) return
            setHotkey(k)
            setStep(2)
          }}
          onCancel={onClose}
        />
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) setStep(3)
          }}
        >
          {summary}
          <label className="label mb-2 block">Macro name</label>
          <input autoFocus className="input w-full" placeholder="e.g. Ankou Run" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="mt-6 flex justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" variant="primary" disabled={!name.trim()}>
              Next
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <>
          {summary}
          <p className="label mb-5 text-center text-zinc-200">What should this macro do?</p>
          <ActionTiles
            value={action}
            onPick={(a) => {
              setAction(a)
              setStep(4)
            }}
          />
          <div className="mt-6">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>
        </>
      )}

      {step === 4 && action && (
        <>
          {summary}
          <p className="label mb-5 text-center text-zinc-200">Select a type of macro you want to create</p>
          <TypeTiles onPick={(t) => onCreate(newMacro(name.trim(), hotkey, t, action.kind, action.mode))} />
          <div className="mt-6">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
