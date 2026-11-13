import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { dirname, join, resolve } from 'path'
import { type Profile, sanitizeProfile } from '../shared/types'
import { Engine } from './engine'
import { profilesDir } from './paths'
import { checkPids, pickPoint, pickWindow, recordMouse } from './picker'
import * as store from './profileStore'

let win: BrowserWindow | null = null
/** Names of saved profiles, for import name-collision handling. */
const savedNames = new Map<string, string>()

const engine = new Engine((s) => win?.webContents.send('engine:status', s))

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 920,
    minHeight: 620,
    backgroundColor: '#000000',
    title: 'FlyffBind',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  // The app never navigates away from its own page.
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win?.webContents.getURL()) e.preventDefault()
  })
  // No camera, microphone, notifications etc. are ever needed.
  win.webContents.session.setPermissionRequestHandler((_wc, _perm, cb) => cb(false))
  win.webContents.session.setPermissionCheckHandler(() => false)
  // The renderer blocks unload while there are unsaved changes; ask before quitting.
  win.webContents.on('will-prevent-unload', (e) => {
    const choice = dialog.showMessageBoxSync(win!, {
      type: 'warning',
      buttons: ['Quit without saving', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Unsaved changes',
      message: 'You have unsaved changes.',
      detail: 'Quit FlyffBind and lose them?'
    })
    if (choice === 0) e.preventDefault()
  })
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
  win.on('closed', () => (win = null))
}

/** Minimise the app while the user clicks somewhere else on screen, then bring it back. */
async function whileHidden<T>(fn: () => Promise<T>): Promise<T> {
  await engine.hold(true)
  win?.minimize()
  try {
    return await fn()
  } finally {
    if (win) {
      win.restore()
      win.focus()
    }
    await engine.hold(false)
  }
}

function registerIpc() {
  ipcMain.handle('profiles:load', async () => {
    const res = await store.loadAll()
    savedNames.clear()
    res.profiles.forEach((p) => savedNames.set(p.id, p.name))
    return res
  })

  ipcMain.handle('profiles:openFolder', () => shell.openPath(profilesDir()))

  ipcMain.handle('profiles:save', async (_e, p: Profile) => {
    const saved = await store.saveProfile(p)
    savedNames.set(saved.id, saved.name)
    return saved
  })

  ipcMain.handle('profiles:delete', async (_e, id: string) => {
    savedNames.delete(id)
    await store.deleteProfile(id)
  })

  ipcMain.handle('profiles:setActive', (_e, id: string) => store.setActive(id))

  ipcMain.handle('profiles:export', async (_e, p: Profile) => {
    if (!win) return null
    const safe = p.name.replace(/[\\/:*?"<>|]/g, '_')
    const r = await dialog.showSaveDialog(win, {
      title: 'Export profile to share',
      defaultPath: join(app.getPath('desktop'), `${safe}.flyffbind`),
      filters: [{ name: 'FlyffBind profile', extensions: ['flyffbind'] }]
    })
    if (r.canceled || !r.filePath) return null
    await store.exportTo(p, r.filePath)
    return r.filePath
  })

  ipcMain.handle('profiles:import', async () => {
    if (!win) return null
    const r = await dialog.showOpenDialog(win, {
      title: 'Import profile',
      defaultPath: profilesDir(),
      properties: ['openFile'],
      filters: [
        { name: 'FlyffBind profile', extensions: ['flyffbind', 'json'] },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    if (r.canceled || !r.filePaths[0]) return null
    try {
      // Already in the Profiles folder: it's loaded already, just select it.
      if (resolve(dirname(r.filePaths[0])).toLowerCase() === resolve(profilesDir()).toLowerCase()) {
        const all = await store.loadAll()
        const id = store.idForPath(r.filePaths[0])
        const existing = all.profiles.find((p) => p.id === id)
        if (existing) return { profile: existing, existing: true }
      }
      const p = await store.importFrom(r.filePaths[0], [...savedNames.values()])
      savedNames.set(p.id, p.name)
      return { profile: p }
    } catch (e: any) {
      return { error: `That file is not a valid FlyffBind profile (${e?.message ?? e}).` }
    }
  })

  ipcMain.handle('window:pick', (_e, name: string) => whileHidden(() => pickWindow(name)))
  ipcMain.handle('mouse:pickPoint', (_e, label: string) => whileHidden(() => pickPoint(label)))
  ipcMain.handle('mouse:record', () => whileHidden(() => recordMouse()))

  ipcMain.handle('window:checkPids', (_e, pids: number[]) => checkPids(pids.filter((n) => Number.isInteger(n) && n > 0)))
  ipcMain.handle('app:pid', () => process.pid)

  ipcMain.handle('engine:arm', async (_e, p: Profile) => {
    // Re-validate before this becomes AutoHotkey code (keys, names and numbers are all checked).
    await engine.arm(sanitizeProfile(p, { keepPids: true, newIds: false }))
    return engine.getStatus()
  })
  ipcMain.handle('engine:setRunning', async (_e, on: boolean) => {
    await engine.setRunning(on)
    return engine.getStatus()
  })
  ipcMain.handle('engine:status', () => engine.getStatus())
  ipcMain.handle('engine:hold', (_e, on: boolean) => engine.hold(on))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
  app.whenReady().then(() => {
    registerIpc()
    createWindow()
    // Files added, changed or removed in the Profiles folder show up in the app right away.
    store.loadAll().then(() =>
      store.watchProfiles(async () => {
        const res = await store.loadAll()
        res.profiles.forEach((p) => savedNames.set(p.id, p.name))
        win?.webContents.send('profiles:changed', res.profiles)
      })
    )
  })
  app.on('before-quit', () => engine.dispose())
  app.on('window-all-closed', () => {
    engine.dispose()
    app.quit()
  })
}
