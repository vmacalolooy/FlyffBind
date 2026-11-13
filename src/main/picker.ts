import { spawn, type ChildProcess } from 'child_process'
import { join } from 'path'
import { type MouseStep, type PickResult, type PointResult, type RecordResult, MAX_MOUSE_STEPS, uid } from '../shared/types'
import { ahkDir, ahkExe, pickerScript } from './paths'

let active: ChildProcess | null = null

/** Run one of the helper scripts and collect its stdout. Only one helper runs at a time. */
function runHelper(script: string, args: string[]): Promise<string> {
  active?.kill()
  return new Promise((resolve) => {
    const proc = spawn(ahkExe(), ['/ErrorStdOut', script, ...args], { windowsHide: true })
    active = proc
    let out = ''
    proc.stdout.on('data', (d) => (out += d.toString('utf8')))
    proc.stderr.on('data', (d) => (out += d.toString('utf8')))
    proc.on('error', () => resolve(''))
    proc.on('close', () => {
      if (active === proc) active = null
      resolve(out.replace(/^﻿/, ''))
    })
  })
}

const firstJson = (out: string) => {
  const line = out.split(/\r?\n/).find((l) => l.trim().startsWith('{'))
  try {
    return JSON.parse(line ?? '')
  } catch {
    return null
  }
}

/** The user clicks a window; resolve with its PID. */
export async function pickWindow(windowName: string): Promise<PickResult> {
  const r = firstJson(await runHelper(pickerScript(), ['window', windowName.slice(0, 60)]))
  if (r && Number.isInteger(r.pid) && r.pid > 0) return { pid: r.pid, process: r.process, title: r.title }
  return { cancelled: true }
}

/** The user clicks a spot on screen; resolve with its screen coordinates. */
export async function pickPoint(label: string): Promise<PointResult> {
  const r = firstJson(await runHelper(pickerScript(), ['point', label.slice(0, 60)]))
  if (r && Number.isInteger(r.x) && Number.isInteger(r.y)) return { x: r.x, y: r.y }
  return { cancelled: true }
}

/** Parse recorder.ahk output lines: "<m|d|u>,<L|R|M|->,x,y,dt". Exported for tests. */
export function parseRecording(out: string): MouseStep[] {
  const steps: MouseStep[] = []
  for (const line of out.split(/\r?\n/)) {
    const m = /^([mdu]),([LRM-]),(-?\d+),(-?\d+),(\d+)$/.exec(line.trim())
    if (!m) continue
    steps.push({
      id: uid(),
      type: m[1] === 'm' ? 'move' : m[1] === 'd' ? 'down' : 'up',
      button: m[2] === 'R' || m[2] === 'M' ? m[2] : 'L',
      x: +m[3],
      y: +m[4],
      delayMs: Math.min(600000, +m[5]),
      count: 1
    })
    if (steps.length >= MAX_MOUSE_STEPS) break
  }
  return steps
}

/** Record the user's mouse movement and clicks until they press Esc. */
export async function recordMouse(): Promise<RecordResult> {
  const steps = parseRecording(await runHelper(join(ahkDir(), 'recorder.ahk'), []))
  return steps.length ? { steps } : { cancelled: true }
}

/** Which PIDs still exist. */
export function checkPids(pids: number[]): Record<number, boolean> {
  const out: Record<number, boolean> = {}
  for (const pid of pids) {
    try {
      process.kill(pid, 0)
      out[pid] = true
    } catch (e: any) {
      out[pid] = e?.code === 'EPERM'
    }
  }
  return out
}
