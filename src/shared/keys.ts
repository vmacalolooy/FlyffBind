// Mapping between browser KeyboardEvent.code values and AutoHotkey v1 key names,
// plus human-friendly labels. Punctuation uses scan codes so generated scripts never
// need AHK escaping (e.g. the backtick key is SC029).

const CODE_TO_AHK: Record<string, string> = {
  Tab: 'Tab', Space: 'Space', Enter: 'Enter', Escape: 'Esc', Backspace: 'Backspace',
  Delete: 'Del', Insert: 'Ins', Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  CapsLock: 'CapsLock', ScrollLock: 'ScrollLock', Pause: 'Pause', PrintScreen: 'PrintScreen',
  NumLock: 'NumLock', ContextMenu: 'AppsKey',
  NumpadAdd: 'NumpadAdd', NumpadSubtract: 'NumpadSub', NumpadMultiply: 'NumpadMult',
  NumpadDivide: 'NumpadDiv', NumpadDecimal: 'NumpadDot', NumpadEnter: 'NumpadEnter',
  Backquote: 'SC029', Minus: 'SC00C', Equal: 'SC00D', BracketLeft: 'SC01A', BracketRight: 'SC01B',
  Backslash: 'SC02B', Semicolon: 'SC027', Quote: 'SC028', Comma: 'SC033', Period: 'SC034', Slash: 'SC035',
  ShiftLeft: 'LShift', ShiftRight: 'RShift', ControlLeft: 'LControl', ControlRight: 'RControl',
  AltLeft: 'LAlt', AltRight: 'RAlt', MetaLeft: 'LWin', MetaRight: 'RWin'
}

const AHK_LABEL: Record<string, string> = {
  SC029: '`', SC00C: '-', SC00D: '=', SC01A: '[', SC01B: ']', SC02B: '\\', SC027: ';', SC028: "'",
  SC033: ',', SC034: '.', SC035: '/', NumpadSub: 'Num -', NumpadAdd: 'Num +', NumpadMult: 'Num *',
  NumpadDiv: 'Num /', NumpadDot: 'Num .', NumpadEnter: 'Num Enter', XButton1: 'Mouse 4',
  XButton2: 'Mouse 5', MButton: 'Middle Click', LControl: 'L Ctrl', RControl: 'R Ctrl',
  LShift: 'L Shift', RShift: 'R Shift', LAlt: 'L Alt', RAlt: 'R Alt', LWin: 'Win', RWin: 'R Win',
  PgUp: 'Page Up', PgDn: 'Page Down', AppsKey: 'Menu'
}

export const MODIFIER_CODES = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'])

export function codeToAhk(code: string): string | null {
  if (CODE_TO_AHK[code]) return CODE_TO_AHK[code]
  let m = /^Key([A-Z])$/.exec(code)
  if (m) return m[1].toLowerCase()
  m = /^Digit([0-9])$/.exec(code)
  if (m) return m[1]
  m = /^Numpad([0-9])$/.exec(code)
  if (m) return 'Numpad' + m[1]
  m = /^F([0-9]{1,2})$/.exec(code)
  if (m && +m[1] >= 1 && +m[1] <= 24) return 'F' + m[1]
  return null
}

/** Mouse buttons we allow as hotkeys (never left/right click). */
export function mouseButtonToAhk(button: number): string | null {
  return button === 1 ? 'MButton' : button === 3 ? 'XButton1' : button === 4 ? 'XButton2' : null
}

export interface Mods { ctrl: boolean; alt: boolean; shift: boolean; win: boolean }

export function withMods(key: string, mods: Mods): string {
  return (mods.ctrl ? '^' : '') + (mods.alt ? '!' : '') + (mods.shift ? '+' : '') + (mods.win ? '#' : '') + key
}

export function splitMods(k: string): { mods: string; key: string } {
  const m = /^([\^!+#]*)(.*)$/.exec(k)!
  return { mods: m[1], key: m[2] }
}

export function isMouseKey(k: string): boolean {
  return /^(XButton1|XButton2|MButton)$/.test(splitMods(k).key)
}

export function keyLabel(k: string): string {
  const { mods, key } = splitMods(k)
  const parts: string[] = []
  if (mods.includes('^')) parts.push('Ctrl')
  if (mods.includes('!')) parts.push('Alt')
  if (mods.includes('+')) parts.push('Shift')
  if (mods.includes('#')) parts.push('Win')
  parts.push(AHK_LABEL[key] ?? (key.length === 1 ? key.toUpperCase() : key))
  return parts.join(' + ')
}
