// In-memory stand-in for the Electron preload API, used only when the renderer is
// opened in a plain browser (UI preview). The real app always has window.api.
import type { Api } from '../../preload'
import { newProfile, uid, type EngineStatus, type MouseStep, type Profile, type UpdateStatus } from '../../shared/types'

export function installMockApi() {
  const profiles = new Map<string, Profile>()
  const d = newProfile('Default', true)
  profiles.set(d.id, d)
  let status: EngineStatus = { state: 'off' }
  let armed: Profile | null = null
  const listeners = new Set<(s: EngineStatus) => void>()
  const emit = (s: EngineStatus) => {
    status = s
    listeners.forEach((l) => l(s))
  }
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  let nextPid = 14200
  // Preview only: pretend a newer version is published a moment after start.
  let update: UpdateStatus = { status: 'idle' }
  const updateListeners = new Set<(s: UpdateStatus) => void>()
  const emitUpdate = (s: UpdateStatus) => {
    update = s
    updateListeners.forEach((l) => l(s))
  }
  setTimeout(() => emitUpdate({ status: 'available', version: '1.3.0' }), 2500)
  const api: Api = {
    loadProfiles: async () => ({ profiles: [...profiles.values()], activeId: d.id, folder: 'Documents\\BINDit\\Profiles' }),
    openProfilesFolder: async () => '',
    onProfilesChanged: () => () => {},
    saveProfile: async (p) => (profiles.set(p.id, p), p),
    deleteProfile: async (id) => void profiles.delete(id),
    setActive: async () => {},
    exportProfile: async () => null,
    importProfile: async () => null,
    pickWindow: async () => {
      await wait(600)
      return { pid: (nextPid += 37), process: 'firefox.exe', title: 'Flyff Universe — Mozilla Firefox' }
    },
    pickPoint: async () => {
      await wait(400)
      return { x: 300 + Math.round(Math.random() * 1200), y: 200 + Math.round(Math.random() * 600) }
    },
    recordMouse: async () => {
      await wait(600)
      const steps: MouseStep[] = []
      for (let i = 0; i < 80; i++) {
        const t = i / 80
        const x = Math.round(400 + 600 * t)
        const y = Math.round(500 - 250 * Math.sin(t * Math.PI))
        steps.push({ id: uid(), type: 'move', button: 'L', x, y, delayMs: 16, count: 1 })
        if (i === 30 || i === 70) {
          steps.push({ id: uid(), type: 'down', button: 'L', x, y, delayMs: 40, count: 1 })
          steps.push({ id: uid(), type: 'up', button: 'L', x, y, delayMs: 60, count: 1 })
        }
      }
      return { steps }
    },
    checkPids: async (pids) => Object.fromEntries(pids.map((p) => [p, true])),
    appPid: async () => 1,
    appVersion: async () => '1.2.0',
    updateStatus: async () => update,
    downloadUpdate: async () => {
      // simulate a download in the UI preview
      let p = 0
      const t = setInterval(() => {
        p += 20
        emitUpdate(p >= 100 ? { status: 'ready', version: '1.3.0' } : { status: 'downloading', version: '1.3.0', percent: p })
        if (p >= 100) clearInterval(t)
      }, 400)
      return true
    },
    installUpdate: async () => true,
    openRelease: async () => {},
    onUpdateStatus: (cb) => {
      updateListeners.add(cb)
      return () => {
        updateListeners.delete(cb)
      }
    },
    engineArm: async (p) => {
      if (armed?.id !== p.id) emit({ state: 'stopped', profileId: p.id })
      armed = p
      return status
    },
    engineSetRunning: async (on) => (emit({ state: on ? 'running' : 'stopped', profileId: armed?.id }), status),
    engineStatus: async () => status,
    engineHold: async () => {},
    onEngineStatus: (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    }
  }
  ;(window as any).api = api
}
