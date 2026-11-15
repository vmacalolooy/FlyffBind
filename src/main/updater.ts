import { app, shell } from 'electron'
import type { UpdateStatus } from '../shared/types'

/**
 * Update checks against the public GitHub releases of vmacalolooy/BINDit (configured under
 * `publish` in electron-builder.yml). Nothing downloads until the user clicks Download:
 * electron-updater then fetches the installer over HTTPS and checks its SHA-512 against the
 * release's latest.yml before installing it.
 *
 * The portable .exe can't replace itself, so for it we only report that a newer version
 * exists and link to the release page.
 */

export const RELEASES_URL = 'https://github.com/vmacalolooy/BINDit/releases'
const isPortable = () => !!process.env.PORTABLE_EXECUTABLE_FILE
const SEMVER = /^\d+\.\d+\.\d+$/

type Updater = typeof import('electron-updater').autoUpdater
let updater: Updater | null = null
let state: UpdateStatus = { status: 'idle' }
let notify: (s: UpdateStatus) => void = () => {}

const set = (s: UpdateStatus) => {
  state = s
  notify(s)
}

export function getUpdateState() {
  return state
}

export async function setupUpdater(onChange: (s: UpdateStatus) => void) {
  notify = onChange
  if (!app.isPackaged) return // dev runs never update
  updater = (await import('electron-updater')).autoUpdater
  updater.autoDownload = false // the user decides
  updater.autoInstallOnAppQuit = true // once downloaded, it installs when the app closes
  updater.on('update-available', (info) => {
    if (!SEMVER.test(info.version)) return
    set({ status: 'available', version: info.version, portable: isPortable() })
  })
  updater.on('update-not-available', () => state.status === 'checking' && set({ status: 'idle' }))
  updater.on('download-progress', (p) => set({ ...state, status: 'downloading', percent: Math.round(p.percent || 0) }))
  updater.on('update-downloaded', (info) => set({ status: 'ready', version: info.version }))
  updater.on('error', (err) => {
    console.warn('[updater]', err?.message ?? err)
    // A failed check stays quiet; a failed download is reported so the user can retry.
    if (state.status === 'downloading') set({ status: 'error', version: state.version, message: 'The download failed. Check your connection and try again.' })
    else if (state.status === 'checking') set({ status: 'idle' })
  })
  const check = () => {
    if (state.status === 'idle') set({ status: 'checking' })
    updater?.checkForUpdates().catch(() => {})
  }
  setTimeout(check, 8000)
  setInterval(check, 4 * 60 * 60 * 1000) // and every 4 hours
}

export async function downloadUpdate() {
  if (!updater || isPortable() || !['available', 'error'].includes(state.status)) return false
  set({ status: 'downloading', version: state.version, percent: 0 })
  updater.downloadUpdate().catch(() => {})
  return true
}

export function installUpdate(beforeQuit: () => void) {
  if (!updater || state.status !== 'ready') return false
  beforeQuit()
  updater.quitAndInstall(true, true) // silent install, then reopen BINDit
  return true
}

/** Open the GitHub page for a release (only ever our own repo, only a plain version number). */
export function openReleasePage(version?: string) {
  shell.openExternal(version && SEMVER.test(version) ? `${RELEASES_URL}/tag/v${version}` : `${RELEASES_URL}/latest`)
}
