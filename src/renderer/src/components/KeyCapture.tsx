import { Keyboard, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { codeToAhk, keyLabel, MODIFIER_CODES, mouseButtonToAhk, withMods } from '../../../shared/keys'
import { Button, Modal } from './ui'

interface RecorderProps {
  hint: string
  /** single = capture one key and finish; sequence = append keys until Done */
  mode: 'single' | 'sequence'
  allowMouse?: boolean
  initial?: string[]
  /** Return a warning string for a captured key (e.g. already used). */
  validate?: (key: string) => string | null
  onDone: (keys: string[]) => void
  onCancel: () => void
  cancelLabel?: string
}

/**
 * Records keys (and optionally Mouse 4/5 / middle click). Pauses the macro engine while
 * mounted so the user's own hotkeys don't fire or get swallowed during recording.
 */
export function KeyRecorder({ hint, mode, allowMouse, initial = [], validate, onDone, onCancel, cancelLabel = 'Cancel' }: RecorderProps) {
  const [keys, setKeys] = useState<string[]>(initial)
  const [warn, setWarn] = useState<string | null>(null)
  const nonModPressed = useRef(false)
  const keysRef = useRef(keys)
  keysRef.current = keys
  const cb = useRef({ validate, onDone })
  cb.current = { validate, onDone }

  useEffect(() => {
    window.api.engineHold(true)
    return () => {
      window.api.engineHold(false)
    }
  }, [])

  useEffect(() => {
    const accept = (k: string) => {
      const w = cb.current.validate?.(k) ?? null
      setWarn(w)
      if (mode === 'single') {
        setKeys([k])
        if (!w) cb.current.onDone([k])
      } else {
        setKeys((prev) => [...prev, k].slice(0, 40))
      }
    }
    const mods = (e: KeyboardEvent | MouseEvent) => ({ ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, win: e.metaKey })

    const down = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.repeat) return
      if (MODIFIER_CODES.has(e.code)) {
        nonModPressed.current = false
        return
      }
      const k = codeToAhk(e.code)
      if (!k) return setWarn(`That key (${e.code}) isn't supported.`)
      nonModPressed.current = true
      accept(withMods(k, mods(e)))
    }
    // A modifier pressed and released on its own becomes the key itself (e.g. "LAlt").
    const up = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (MODIFIER_CODES.has(e.code) && !nonModPressed.current) {
        const k = codeToAhk(e.code)
        if (k) accept(k)
      }
      if (MODIFIER_CODES.has(e.code)) nonModPressed.current = false
    }
    const mouse = (e: MouseEvent) => {
      if (!allowMouse) return
      const k = mouseButtonToAhk(e.button)
      if (!k) return
      e.preventDefault()
      accept(withMods(k, mods(e)))
    }
    const block = (e: MouseEvent) => e.button >= 3 && e.preventDefault()
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    window.addEventListener('mousedown', mouse, true)
    window.addEventListener('mouseup', block, true)
    window.addEventListener('auxclick', block, true)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
      window.removeEventListener('mousedown', mouse, true)
      window.removeEventListener('mouseup', block, true)
      window.removeEventListener('auxclick', block, true)
    }
  }, [mode, allowMouse])

  return (
    <div>
      <div className="flex flex-col items-center gap-4 pt-2 text-center">
        <div className="pulse-ring flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/50">
          <Keyboard size={24} />
        </div>
        <p className="text-sm text-zinc-200">{hint}</p>
        <div className="flex min-h-[34px] max-w-full flex-wrap items-center justify-center gap-1.5">
          {keys.length === 0 ? (
            <span className="text-xs text-muted">Waiting for input…</span>
          ) : (
            keys.map((k, i) => (
              <span key={i} className="kbd px-2.5 py-1 text-sm">
                {keyLabel(k)}
              </span>
            ))
          )}
        </div>
        {warn && <p className="text-xs text-amber-400">{warn}</p>}
        {allowMouse && <p className="text-[11px] text-muted">Mouse 4, Mouse 5 and middle click work too.</p>}
      </div>
      <div className="mt-6 flex items-center justify-between gap-2">
        {mode === 'sequence' ? (
          <Button variant="ghost" size="sm" onClick={() => setKeys((k) => k.slice(0, -1))} disabled={keys.length === 0}>
            <Undo2 size={13} /> Undo
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          {(mode === 'sequence' || warn) && (
            <Button variant="primary" onClick={() => cb.current.onDone(keysRef.current)} disabled={keys.length === 0 && mode === 'single'}>
              {mode === 'single' ? 'Use anyway' : 'Done'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function KeyCaptureModal({ title, ...rest }: Omit<RecorderProps, 'onCancel'> & { title: string; onClose: () => void }) {
  return (
    <Modal title={title}>
      <KeyRecorder {...rest} onCancel={rest.onClose} />
    </Modal>
  )
}
