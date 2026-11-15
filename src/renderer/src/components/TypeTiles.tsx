import { ArrowRight, Keyboard, MousePointer2, MousePointerClick, RotateCw, ToggleRight, type LucideIcon } from 'lucide-react'
import type { MacroKind, MacroType, MouseMode } from '../../../shared/types'
import { MACRO_TYPE_LABEL } from '../../../shared/types'

export const TYPE_ICON: Record<MacroType, LucideIcon> = {
  once: ArrowRight,
  hold: RotateCw,
  toggle: ToggleRight
}

export type ActionChoice = { kind: MacroKind; mode?: MouseMode }

interface Tile<T> {
  value: T
  label: string
  desc: string
  icon: LucideIcon
}

/** Big G HUB style picker tiles. */
function Tiles<T>({ tiles, isSelected, onPick }: { tiles: Tile<T>[]; isSelected: (v: T) => boolean; onPick: (v: T) => void }) {
  return (
    <div className="grid grid-cols-3 gap-5">
      {tiles.map((t) => {
        const sel = isSelected(t.value)
        return (
          <button key={t.label} onClick={() => onPick(t.value)} className="tile group flex flex-col items-center gap-3 text-center">
            <span
              className={`tap tile-art flex aspect-[4/3] w-full items-center justify-center rounded-md ${
                sel ? 'bg-accent/15 text-accent ring-1 ring-accent' : 'bg-tile text-zinc-100 group-hover:bg-hover'
              }`}
            >
              <t.icon size={30} strokeWidth={1.5} />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.12em]">{t.label}</span>
            <span className="text-[11px] leading-snug text-muted">{t.desc}</span>
          </button>
        )
      })}
    </div>
  )
}

const TYPE_TILES: Tile<MacroType>[] = [
  { value: 'once', label: MACRO_TYPE_LABEL.once, desc: 'Plays once each time you press the key.', icon: TYPE_ICON.once },
  { value: 'hold', label: MACRO_TYPE_LABEL.hold, desc: 'Loops while the key is held down.', icon: TYPE_ICON.hold },
  { value: 'toggle', label: MACRO_TYPE_LABEL.toggle, desc: 'Press to start looping, press again to stop.', icon: TYPE_ICON.toggle }
]

export function TypeTiles({ value, onPick }: { value?: MacroType; onPick: (t: MacroType) => void }) {
  return <Tiles tiles={TYPE_TILES} isSelected={(v) => v === value} onPick={onPick} />
}

const ACTION_TILES: Tile<ActionChoice>[] = [
  { value: { kind: 'keys' }, label: 'Keystrokes', desc: 'Send keys to your game windows in the background.', icon: Keyboard },
  { value: { kind: 'mouse', mode: 'recorded' }, label: 'Recorded Path', desc: 'Record your mouse moves and clicks, then replay them.', icon: MousePointer2 },
  { value: { kind: 'mouse', mode: 'points' }, label: 'Click Points', desc: 'Pick spots on screen to click, one after another.', icon: MousePointerClick }
]

export function ActionTiles({ value, onPick }: { value?: ActionChoice; onPick: (a: ActionChoice) => void }) {
  return <Tiles tiles={ACTION_TILES} isSelected={(v) => !!value && v.kind === value.kind && v.mode === value.mode} onPick={onPick} />
}
