import { spawn, type ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import { dirname } from 'path'
import type { EngineStatus, Profile } from '../shared/types'
import { generateScript } from './ahkGenerator'
import { ahkExe, engineScript } from './paths'

type Listener = (s: EngineStatus) => void

/**
 * Keeps the generated AHK script for the selected profile "armed" at all times:
 * - stopped: every macro hotkey is suspended, only the Start/Stop key is live
 * - running: macros are live
 * The Start/Stop button and the Start/Stop key flip the same state.
 */
export class Engine {
  private proc: ChildProcess | null = null
  private status: EngineStatus = { state: 'off' }
  private profile: Profile | null = null
  private running = false
  private held = false
  private seq = 0

  constructor(private onStatus: Listener) {}

  getStatus() {
    return this.status
  }

  private set(s: EngineStatus) {
    this.status = s
    this.onStatus(s)
  }

  /** (Re)load a profile, keeping the current running/stopped state unless the profile changed. */
  async arm(profile: Profile) {
    if (this.profile && this.profile.id !== profile.id) this.running = false
    this.profile = profile
    await this.launch()
  }

  async setRunning(on: boolean) {
    this.running = on
    await this.launch()
  }

  disarm() {
    this.profile = null
    this.running = false
    this.kill()
    this.set({ state: 'off' })
  }

  /** Pause all hotkeys while the user records keys / mouse in the app, then re-arm. */
  async hold(on: boolean) {
    if (on === this.held) return
    this.held = on
    if (on) this.kill()
    else await this.launch()
  }

  private async launch() {
    const profile = this.profile
    if (!profile || this.held) return
    const my = ++this.seq
    this.kill()
    const path = engineScript()
    await fs.mkdir(dirname(path), { recursive: true })
    await fs.writeFile(path, '﻿' + generateScript(profile, { running: this.running }), 'utf8')
    if (my !== this.seq || this.held) return // superseded while writing

    const proc = spawn(ahkExe(), ['/ErrorStdOut', path], { windowsHide: true })
    this.proc = proc
    let errText = ''
    const started = Date.now()
    this.set({ state: this.running ? 'running' : 'stopped', profileId: profile.id })

    const onData = (d: Buffer) => {
      for (const line of d.toString('utf8').split(/\r?\n/)) {
        const t = line.trim()
        if (this.proc !== proc) return
        if (t === 'RUNNING' || t === 'STOPPED') {
          this.running = t === 'RUNNING'
          this.set({ state: this.running ? 'running' : 'stopped', profileId: profile.id })
        } else if (t) errText += t + '\n'
      }
    }
    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', onData)
    proc.on('error', (e) => {
      if (this.proc !== proc) return
      this.proc = null
      this.set({ state: 'error', profileId: profile.id, message: `Could not start AutoHotkey: ${e.message}` })
    })
    proc.on('exit', (code) => {
      if (this.proc !== proc) return // replaced or intentionally killed
      this.proc = null
      this.running = false
      if (errText || (code !== 0 && Date.now() - started < 3000)) {
        this.set({ state: 'error', profileId: profile.id, message: errText.trim() || `Engine exited (code ${code})` })
      } else {
        this.set({ state: 'off' })
      }
    })
  }

  private kill() {
    const p = this.proc
    this.proc = null
    if (p && p.exitCode === null) p.kill()
  }

  dispose() {
    this.kill()
  }
}
