import { describe, expect, it } from 'vitest'
import { generateScript, hotkeyName, renderKeys, windowVarNames } from './ahkGenerator'
import { parseRecording } from './picker'
import { newMacro, sanitizeProfile, type Profile } from '../shared/types'

// Equivalent of AnkouRun.ahk's Tab macro (repeat while holding, 3 windows)
function ankouRun(): Profile {
  const tab = newMacro('Ankou Run', 'Tab', 'hold')
  tab.actions = [
    { id: 'a1', windowId: 'psy', keys: ['6', '7'] },
    { id: 'a2', windowId: 'two', keys: ['2', '8', 'z'] },
    { id: 'a3', windowId: 'kn', keys: ['8', '7'] }
  ]
  const x1 = newMacro('Mouse 4', 'XButton1', 'once')
  x1.actions = [{ id: 'a4', windowId: 'two', keys: ['9', 'z'] }]
  return {
    version: 1,
    id: 'p1',
    name: 'Ankou "Run"',
    suspendKey: 'F12',
    windows: [
      { id: 'psy', name: 'Psykeeper', pid: 1111 },
      { id: 'two', name: 'PidTwo', pid: 2222 },
      { id: 'kn', name: 'Knight', pid: null }
    ],
    macros: [tab, x1]
  }
}

describe('ahkGenerator', () => {
  it('renders keys with {Blind} so held Ctrl/Alt/Shift are not disturbed', () => {
    expect(renderKeys(['2', '8', 'z'])).toBe('{Blind}{2}{8}{z}')
    expect(renderKeys(['+1', 'F1', 'SC029'])).toBe('+{1}{F1}{SC029}')
    expect(renderKeys(['bad key', '"'])).toBe('')
  })

  it('builds unique, safe window variable names', () => {
    const p = ankouRun()
    p.windows.push({ id: 'dup', name: 'Psy keeper!', pid: null }, { id: 'dup2', name: 'Psykeeper', pid: null })
    const v = windowVarNames(p)
    expect(v.get('psy')).toBe('PID_Psykeeper')
    expect(v.get('dup')).toBe('PID_Psy_keeper')
    expect(v.get('dup2')).toBe('PID_Psykeeper_2')
  })

  it('applies block / pass-through prefixes', () => {
    expect(hotkeyName({ hotkey: 'Tab', passThrough: false })).toBe('$Tab')
    expect(hotkeyName({ hotkey: 'Tab', passThrough: true })).toBe('~$Tab')
    expect(hotkeyName({ hotkey: 'XButton1', passThrough: false })).toBe('XButton1')
  })

  it('generates hold, once and toggle keystroke macros', () => {
    const p = ankouRun()
    const t = newMacro('Loop RM', 'NumpadSub', 'toggle')
    t.actions = [{ id: 'a5', windowId: 'psy', keys: ['1', '2', '5'] }]
    p.macros.push(t)
    const s = generateScript(p, { running: true })
    expect(s).toContain('PID_Psykeeper := 1111')
    expect(s).toContain('PID_Knight := 0')
    expect(s).toContain('Hotkey, % "$Tab", M0_Down')
    expect(s).toContain('SendTo(PID_PidTwo, "{Blind}{2}{8}{z}")')
    expect(s).toContain('if (A_IsSuspended || !GetKeyState("Tab", "P"))')
    expect(s).toContain('Hotkey, % "XButton1", M1_Down')
    expect(s).toContain('Hotkey, % "$NumpadSub", M2_Down, T2')
    expect(s).toContain('SetTimer, M2_Run, 400')
    expect(s).toContain('Hotkey, % "$F12", FB_StartStop')
    expect(s).toContain('Menu, Tray, Tip, % "FlyffBind - Ankou ""Run"""')
    expect(s).not.toContain('Suspend, On')
    expect(s).toMatchSnapshot()
  })

  it('starts suspended when the profile is armed but stopped', () => {
    const s = generateScript(ankouRun(), { running: false })
    expect(s).toContain('Suspend, On\r\nFB_Out("STOPPED")')
  })

  it('generates click-point and recorded mouse macros', () => {
    const p = ankouRun()
    const pts = newMacro('Loot', 'F1', 'toggle', 'mouse', 'points')
    pts.mouse.steps = [
      { id: 's1', type: 'click', button: 'L', x: 100, y: 200, delayMs: 0, count: 1 },
      { id: 's2', type: 'click', button: 'R', x: 300, y: 400, delayMs: 150, count: 2 },
      { id: 's3', type: 'move', button: 'L', x: 5, y: 6, delayMs: 0, count: 1 }
    ]
    const rec = newMacro('Path', 'F2', 'once', 'mouse', 'recorded')
    rec.mouse.speed = 2
    rec.mouse.steps = parseRecording('m,-,10,10,0\nd,L,10,10,40\nm,-,20,30,16\nu,L,20,30,100\ngarbage\n')
    p.macros = [pts, rec]
    const s = generateScript(p)
    // points: restore cursor, abort check between steps, double right click
    expect(s).toContain('MouseGetPos, M0_X, M0_Y')
    expect(s).toContain('Click, 100, 200, Left, 1')
    expect(s).toContain('Sleep, 150\r\nif (A_IsSuspended || !M0_On)\r\n    return\r\nClick, 300, 400, Right, 2')
    expect(s).toContain('MouseMove, 5, 6, 0')
    expect(s).toContain('MouseMove, %M0_X%, %M0_Y%, 0')
    // recorded: drag with halved delays, releases button if cut short
    expect(rec.mouse.steps).toHaveLength(4)
    expect(s).toContain('Sleep, 20\r\nif (A_IsSuspended)\r\n    return\r\nClick, 10, 10, Left, Down')
    expect(s).toContain('Click, 20, 30, Left, Up')
    expect(s).toContain('if GetKeyState("LButton")\r\n    Click, Left, Up')
    expect(s).not.toContain('MouseGetPos, M1_X')
  })

  it('skips disabled macros and hotkeys that clash with the start/stop key', () => {
    const p = ankouRun()
    p.macros[0].enabled = false
    p.macros[1].hotkey = 'F12'
    const s = generateScript(p)
    expect(s).not.toContain('M0_Down')
    expect(s).not.toContain('M1_Down')
  })

  it('sanitizes imported profiles and strips PIDs', () => {
    const raw = JSON.parse(JSON.stringify(ankouRun()))
    raw.isDefault = true
    raw.macros.push({ name: 'evil', hotkey: 'Tab::\nRun calc', type: 'once', actions: [] })
    raw.macros[0].actions[0].keys.push('}{Run calc')
    raw.macros[1].kind = 'mouse'
    raw.macros[1].mouse = { mode: 'points', steps: [{ type: 'click', x: 'x', y: 5, delayMs: -4 }, { type: 'nope' }] }
    const p = sanitizeProfile(raw, { keepPids: false, newIds: true })
    expect(p.isDefault).toBeUndefined()
    expect(p.windows.every((w) => w.pid === null)).toBe(true)
    expect(p.macros).toHaveLength(2)
    expect(p.macros[0].kind).toBe('keys')
    expect(p.macros[0].actions[0].keys).toEqual(['6', '7'])
    expect(p.macros[0].actions[0].windowId).toBe(p.windows[0].id)
    expect(p.macros[1].mouse.steps).toEqual([expect.objectContaining({ type: 'click', x: 0, y: 5, delayMs: 0, button: 'L', count: 1 })])
    expect(p.id).not.toBe('p1')
  })
})
