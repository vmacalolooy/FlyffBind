export type MacroType = 'once' | 'hold' | 'toggle'
/** keys = keystrokes sent to background windows; mouse = cursor moves / clicks on screen */
export type MacroKind = 'keys' | 'mouse'
export type MouseMode = 'recorded' | 'points'
export type MouseButton = 'L' | 'R' | 'M'

export interface MouseStep {
  id: string
  /** click = full click (points mode); down/up = recorded press/release (allows drags) */
  type: 'move' | 'click' | 'down' | 'up'
  button: MouseButton
  /** Screen coordinates */
  x: number
  y: number
  /** Wait before performing this step */
  delayMs: number
  /** 1 = single click, 2 = double click (click steps only) */
  count: 1 | 2
}

export interface MouseConfig {
  mode: MouseMode
  steps: MouseStep[]
  /** Playback speed for recorded paths: 1 = real time, 2 = twice as fast */
  speed: number
  /** Put the cursor back where it was after the macro finishes */
  restoreCursor: boolean
}

export const MAX_MOUSE_STEPS = 6000

export interface GameWindow {
  id: string
  /** Friendly name, e.g. "Templar" */
  name: string
  /** Runtime process id. Changes every time Firefox restarts; stripped on export. */
  pid: number | null
  lastTitle?: string
  lastProcess?: string
}

export interface MacroAction {
  id: string
  windowId: string
  /** AHK key names, e.g. ["2", "8", "z"] or ["+1", "F1"] */
  keys: string[]
}

export interface Macro {
  id: string
  name: string
  /** AHK hotkey, e.g. "Tab", "XButton1", "+F1", "SC029" */
  hotkey: string
  type: MacroType
  kind: MacroKind
  mouse: MouseConfig
  enabled: boolean
  /** false = swallow the key (default), true = also let it reach the active window */
  passThrough: boolean
  /** Delay between repeats for hold/toggle macros */
  loopIntervalMs: number
  /** Delay between individual key presses (AHK SetKeyDelay) */
  keyDelayMs: number
  collapsed: boolean
  actions: MacroAction[]
}

export interface Profile {
  version: 1
  id: string
  name: string
  /** The scratch "Default" profile: saving it asks for a name and creates a new profile. */
  isDefault?: boolean
  /** Hotkey that starts / stops every macro in this profile (same as the Start/Stop button) */
  suspendKey: string | null
  windows: GameWindow[]
  macros: Macro[]
}

/** off = no engine process; stopped = armed, only the start/stop key is live; running = macros live */
export type EngineState = 'off' | 'stopped' | 'running' | 'error'

export interface EngineStatus {
  state: EngineState
  profileId?: string
  message?: string
}

export interface PickResult {
  cancelled?: boolean
  pid?: number
  process?: string
  title?: string
}

export interface PointResult {
  cancelled?: boolean
  x?: number
  y?: number
}

export interface RecordResult {
  cancelled?: boolean
  steps?: MouseStep[]
}

export interface ExportFile {
  format: 'bindit' | 'flyffbind'
  version: 1
  profile: Profile
}

export const MACRO_TYPE_LABEL: Record<MacroType, string> = {
  once: 'No Repeat',
  hold: 'Repeat While Holding',
  toggle: 'Toggle'
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export const MACRO_KIND_LABEL: Record<MacroKind, string> = {
  keys: 'Keystrokes',
  mouse: 'Mouse'
}

export const MOUSE_MODE_LABEL: Record<MouseMode, string> = {
  recorded: 'Recorded Path',
  points: 'Click Points'
}

export function newProfile(name = 'Default', isDefault = false): Profile {
  return { version: 1, id: uid(), name, isDefault: isDefault || undefined, suspendKey: null, windows: [], macros: [] }
}

export function defaultMouse(mode: MouseMode = 'points'): MouseConfig {
  return { mode, steps: [], speed: 1, restoreCursor: mode === 'points' }
}

export function newMacro(name: string, hotkey: string, type: MacroType, kind: MacroKind = 'keys', mode: MouseMode = 'points'): Macro {
  return {
    id: uid(),
    name,
    hotkey,
    type,
    kind,
    mouse: defaultMouse(mode),
    enabled: true,
    passThrough: false,
    loopIntervalMs: type === 'hold' ? 200 : 400,
    keyDelayMs: 10,
    collapsed: false,
    actions: []
  }
}

/** A key name we are willing to put into a generated script: optional modifiers + alphanumeric key name. */
export const KEY_RE = /^[\^!+#]*[A-Za-z0-9]+$/

export function isValidKey(k: unknown): k is string {
  return typeof k === 'string' && KEY_RE.test(k)
}

const num = (v: unknown, def: number, min: number, max: number): number => {
  const n = typeof v === 'number' && isFinite(v) ? Math.round(v) : def
  return Math.min(max, Math.max(min, n))
}
const str = (v: unknown, def: string): string => (typeof v === 'string' && v.trim() ? v.slice(0, 60) : def)

const int = (v: unknown, min: number, max: number) => (typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : 0)

export function sanitizeMouse(raw: any, newIds: boolean): MouseConfig {
  const mode: MouseMode = raw?.mode === 'recorded' ? 'recorded' : 'points'
  const steps: MouseStep[] = (Array.isArray(raw?.steps) ? raw.steps : [])
    .slice(0, MAX_MOUSE_STEPS)
    .filter((s: any) => s && ['move', 'click', 'down', 'up'].includes(s.type))
    .map((s: any) => ({
      id: newIds || typeof s.id !== 'string' ? uid() : s.id,
      type: s.type,
      button: s.button === 'R' || s.button === 'M' ? s.button : 'L',
      x: int(s.x, -32000, 32000),
      y: int(s.y, -32000, 32000),
      delayMs: int(s.delayMs, 0, 600000),
      count: s.count === 2 ? 2 : 1
    }))
  const speed = typeof raw?.speed === 'number' && isFinite(raw.speed) ? Math.min(10, Math.max(0.1, raw.speed)) : 1
  return { mode, steps, speed, restoreCursor: raw?.restoreCursor !== false }
}

/**
 * Normalize untrusted profile data (imported files, older saves) into a valid Profile.
 * Drops invalid keys/references rather than failing.
 */
export function sanitizeProfile(raw: any, opts: { keepPids: boolean; newIds: boolean }): Profile {
  if (!raw || typeof raw !== 'object') throw new Error('Not a profile')
  const idMap = new Map<string, string>()
  const windows: GameWindow[] = (Array.isArray(raw.windows) ? raw.windows : []).map((w: any, i: number) => {
    const oldId = typeof w?.id === 'string' ? w.id : `w${i}`
    const id = opts.newIds ? uid() : oldId
    idMap.set(oldId, id)
    const pid = opts.keepPids && Number.isInteger(w?.pid) && w.pid > 0 ? w.pid : null
    return {
      id,
      name: str(w?.name, `Window ${i + 1}`),
      pid,
      lastTitle: pid && typeof w?.lastTitle === 'string' ? w.lastTitle : undefined,
      lastProcess: pid && typeof w?.lastProcess === 'string' ? w.lastProcess : undefined
    }
  })
  const macros: Macro[] = (Array.isArray(raw.macros) ? raw.macros : [])
    .filter((m: any) => isValidKey(m?.hotkey))
    .map((m: any, i: number) => {
      const type: MacroType = ['once', 'hold', 'toggle'].includes(m.type) ? m.type : 'once'
      return {
        id: opts.newIds || typeof m.id !== 'string' ? uid() : m.id,
        name: str(m.name, `Macro ${i + 1}`),
        hotkey: m.hotkey,
        type,
        kind: m.kind === 'mouse' ? 'mouse' : 'keys',
        mouse: sanitizeMouse(m.mouse, opts.newIds),
        enabled: m.enabled !== false,
        passThrough: m.passThrough === true,
        loopIntervalMs: num(m.loopIntervalMs, type === 'hold' ? 200 : 400, 10, 60000),
        keyDelayMs: num(m.keyDelayMs, 10, -1, 5000),
        collapsed: m.collapsed === true,
        actions: (Array.isArray(m.actions) ? m.actions : [])
          .filter((a: any) => typeof a?.windowId === 'string' && idMap.has(a.windowId))
          .map((a: any) => ({
            id: opts.newIds || typeof a.id !== 'string' ? uid() : a.id,
            windowId: idMap.get(a.windowId)!,
            keys: (Array.isArray(a.keys) ? a.keys : []).filter(isValidKey)
          }))
      }
    })
  return {
    version: 1,
    id: opts.newIds || typeof raw.id !== 'string' ? uid() : raw.id,
    name: str(raw.name, 'Imported profile'),
    isDefault: opts.keepPids && raw.isDefault === true ? true : undefined,
    suspendKey: isValidKey(raw.suspendKey) ? raw.suspendKey : null,
    windows,
    macros
  }
}
