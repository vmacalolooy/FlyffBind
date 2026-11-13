import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { newMacro, newProfile } from '../shared/types'

const root = mkdtempSync(join(tmpdir(), 'flyffbind-test-'))
const appData = join(root, 'AppData', 'FlyffBind')
const docs = join(root, 'Documents')
vi.mock('electron', () => ({
  app: { getPath: (n: string) => (n === 'documents' ? docs : appData), isPackaged: false, getAppPath: () => root }
}))

const store = await import('./profileStore')
const folder = join(docs, 'FlyffBind', 'Profiles')
afterAll(() => rmSync(root, { recursive: true, force: true }))

describe('profileStore', () => {
  it('migrates old %APPDATA% profiles into the visible Profiles folder', async () => {
    const legacy = join(appData, 'profiles')
    mkdirSync(legacy, { recursive: true })
    const def = { ...newProfile('Default', true), windows: [{ id: 'w1', name: 'Templar', pid: 4242 }] }
    const dq = newProfile('DailyQuest')
    dq.windows = [{ id: 'w2', name: 'Seraph', pid: 777, lastProcess: 'firefox.exe' }]
    dq.macros = [newMacro('AOE', 'Tab', 'hold')]
    writeFileSync(join(legacy, def.id + '.json'), JSON.stringify(def))
    writeFileSync(join(legacy, dq.id + '.json'), JSON.stringify(dq))

    const r = await store.loadAll()
    expect(r.folder).toBe(folder)
    expect(r.profiles.map((p) => p.name)).toEqual(['Default', 'DailyQuest'])
    expect(readdirSync(folder)).toEqual(['DailyQuest.flyffbind'])
    expect(existsSync(legacy + '-backup')).toBe(true)
    // PIDs survive locally but are not written into the shareable file
    expect(r.profiles[1].windows[0].pid).toBe(777)
    expect(r.profiles[0].windows[0].pid).toBe(4242)
    expect(readFileSync(join(folder, 'DailyQuest.flyffbind'), 'utf8')).not.toContain('777')
  })

  it('loads files dropped into the folder, giving copies their own id', async () => {
    const original = readFileSync(join(folder, 'DailyQuest.flyffbind'), 'utf8')
    writeFileSync(join(folder, 'DailyQuest - copy.flyffbind'), original)
    writeFileSync(join(folder, 'notes.txt'), 'not a profile')
    writeFileSync(join(folder, 'broken.flyffbind'), '{nope')
    const r = await store.loadAll()
    const dqs = r.profiles.filter((p) => p.name === 'DailyQuest')
    expect(dqs).toHaveLength(2)
    expect(new Set(dqs.map((p) => p.id)).size).toBe(2)
  })

  it('renames the file with the profile and deletes it with the profile', async () => {
    const r = await store.loadAll()
    const p = r.profiles.find((x) => !x.isDefault)!
    await store.saveProfile({ ...p, name: 'Farm: AOE/Heal' })
    expect(readdirSync(folder)).toContain('Farm- AOE-Heal.flyffbind')
    await store.deleteProfile(p.id)
    expect(readdirSync(folder)).not.toContain('Farm- AOE-Heal.flyffbind')
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

  it('imports a file from elsewhere into the folder', async () => {
    const shared = join(root, 'friend.flyffbind')
    const friend = newProfile('Friend Setup')
    friend.windows = [{ id: 'fw', name: 'Knight', pid: 99999 }]
    writeFileSync(shared, JSON.stringify({ format: 'flyffbind', version: 1, profile: friend }))
    const p = await store.importFrom(shared, [])
    expect(p.id).not.toBe(friend.id)
    expect(p.windows[0].pid).toBeNull()
    expect(readdirSync(folder)).toContain('Friend Setup.flyffbind')
  })
})
