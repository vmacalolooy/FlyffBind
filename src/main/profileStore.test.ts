import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { newMacro, newProfile } from '../shared/types'

const root = mkdtempSync(join(tmpdir(), 'bindit-test-'))
const roaming = join(root, 'AppData')
const appData = join(roaming, 'BINDit')
const docs = join(root, 'Documents')
vi.mock('electron', () => ({
  app: {
    getPath: (n: string) => (n === 'documents' ? docs : n === 'appData' ? roaming : appData),
    isPackaged: false,
    getAppPath: () => root
  }
}))

const store = await import('./profileStore')
const folder = join(docs, 'BINDit', 'Profiles')
afterAll(() => rmSync(root, { recursive: true, force: true }))

describe('profileStore', () => {
  it('copies data from the FlyffBind-era folders on first launch, keeping the originals', async () => {
    const oldData = join(roaming, 'FlyffBind')
    const oldProfiles = join(docs, 'FlyffBind', 'Profiles')
    mkdirSync(oldData, { recursive: true })
    mkdirSync(oldProfiles, { recursive: true })
    const def = { ...newProfile('Default', true), windows: [{ id: 'w1', name: 'Templar', pid: null }] }
    const dq = newProfile('DailyQuest')
    dq.windows = [{ id: 'w2', name: 'Seraph', pid: null }]
    dq.macros = [newMacro('AOE', 'Tab', 'hold')]
    writeFileSync(join(oldData, 'default.flyffbind'), JSON.stringify({ format: 'flyffbind', version: 1, profile: def }))
    writeFileSync(join(oldData, 'window-links.json'), JSON.stringify({ [dq.id]: { w2: { pid: 777, lastProcess: 'firefox.exe' } }, [def.id]: { w1: { pid: 4242 } } }))
    writeFileSync(join(oldData, 'settings.json'), JSON.stringify({ activeId: dq.id, migratedToFolder: true }))
    writeFileSync(join(oldProfiles, 'DailyQuest.flyffbind'), JSON.stringify({ format: 'flyffbind', version: 1, profile: dq }))

    const r = await store.loadAll()
    expect(r.folder).toBe(folder)
    expect(r.profiles.map((p) => p.name)).toEqual(['Default', 'DailyQuest'])
    expect(r.activeId).toBe(dq.id)
    expect(readdirSync(folder)).toEqual(['DailyQuest.bindit'])
    // originals untouched
    expect(existsSync(join(oldProfiles, 'DailyQuest.flyffbind'))).toBe(true)
    expect(existsSync(join(oldData, 'window-links.json'))).toBe(true)
    // PIDs survive locally but are not written into the shareable file
    expect(r.profiles[1].windows[0].pid).toBe(777)
    expect(r.profiles[0].windows[0].pid).toBe(4242)
    expect(r.profiles[1].macros).toHaveLength(1)
  })

  it('saves in the new format, without PIDs', async () => {
    const r = await store.loadAll()
    const p = r.profiles.find((x) => !x.isDefault)!
    await store.saveProfile(p)
    const raw = JSON.parse(readFileSync(join(folder, 'DailyQuest.bindit'), 'utf8'))
    expect(raw.format).toBe('bindit')
    expect(JSON.stringify(raw)).not.toContain('777')
  })

  it('loads files dropped into the folder (old and new extension), giving copies their own id', async () => {
    const original = readFileSync(join(folder, 'DailyQuest.bindit'), 'utf8')
    writeFileSync(join(folder, 'DailyQuest - copy.flyffbind'), original)
    writeFileSync(join(folder, 'notes.txt'), 'not a profile')
    writeFileSync(join(folder, 'broken.bindit'), '{nope')
    const r = await store.loadAll()
    const dqs = r.profiles.filter((p) => p.name === 'DailyQuest')
    expect(dqs).toHaveLength(2)
    expect(new Set(dqs.map((p) => p.id)).size).toBe(2)
  })

  it('renames the file with the profile and deletes it with the profile', async () => {
    const r = await store.loadAll()
    const p = r.profiles.find((x) => !x.isDefault)!
    await store.saveProfile({ ...p, name: 'Farm: AOE/Heal' })
    expect(readdirSync(folder)).toContain('Farm- AOE-Heal.bindit')
    await store.deleteProfile(p.id)
    expect(readdirSync(folder)).not.toContain('Farm- AOE-Heal.bindit')
  })

  it('keeps the Default scratch profile out of the shared folder and remembers the selection', async () => {
    const r = await store.loadAll()
    const def = r.profiles.find((p) => p.isDefault)!
    await store.saveProfile({ ...def, macros: [newMacro('X', 'F1', 'once')] })
    await store.setActive(def.id)
    expect(readdirSync(folder).some((f) => f.startsWith('Default'))).toBe(false)
    const again = await store.loadAll()
    expect(again.activeId).toBe(def.id)
    expect(again.profiles.find((p) => p.isDefault)!.macros).toHaveLength(1)
  })

  it('imports a file from elsewhere (old FlyffBind format too) into the folder', async () => {
    const shared = join(root, 'friend.flyffbind')
    const friend = newProfile('Friend Setup')
    friend.windows = [{ id: 'fw', name: 'Knight', pid: 99999 }]
    writeFileSync(shared, JSON.stringify({ format: 'flyffbind', version: 1, profile: friend }))
    const p = await store.importFrom(shared, [])
    expect(p.id).not.toBe(friend.id)
    expect(p.windows[0].pid).toBeNull()
    expect(readdirSync(folder)).toContain('Friend Setup.bindit')
  })
})
