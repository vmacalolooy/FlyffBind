import { existsSync, promises as fs, watch, type FSWatcher } from 'fs'
import { basename, dirname, join, resolve } from 'path'
import { type ExportFile, type GameWindow, type Profile, newProfile, sanitizeProfile, uid } from '../shared/types'
import { defaultProfileFile, legacyProfilesDir, linksFile, profilesDir, settingsFile } from './paths'

/**
 * Storage layout
 *  Documents\FlyffBind\Profiles\<Name>.flyffbind   one file per saved profile (shareable as-is)
 *  %APPDATA%\FlyffBind\default.flyffbind           the scratch "Default" profile
 *  %APPDATA%\FlyffBind\window-links.json           PIDs of linked windows (local to this PC)
 *  %APPDATA%\FlyffBind\settings.json               last selected profile
 *
 * Every .flyffbind file found in the Profiles folder shows up in the app, including files
 * copied there by hand. The folder is watched so the list stays current.
 */

export const PROFILE_EXT = '.flyffbind'
export const sortProfiles = (a: Profile, b: Profile) => (a.isDefault ? -1 : b.isDefault ? 1 : a.name.localeCompare(b.name))

type Link = Pick<GameWindow, 'pid' | 'lastTitle' | 'lastProcess'>
type Links = Record<string, Record<string, Link>>
interface Settings {
  activeId?: string
  migratedToFolder?: boolean
}

/** profile id -> file path, for profiles in the Profiles folder */
const index = new Map<string, string>()
let links: Links = {}

// All writes go through one queue so overlapping saves can't interleave.
let queue: Promise<unknown> = Promise.resolve()
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse((await fs.readFile(path, 'utf8')).replace(/^﻿/, '')) as T
  } catch {
    return null
  }
}

async function writeJson(path: string, data: unknown) {
  await fs.mkdir(dirname(path), { recursive: true })
  const tmp = path + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmp, path)
}

const toFile = (p: Profile): ExportFile => ({ format: 'flyffbind', version: 1, profile: sanitizeProfile(p, { keepPids: false, newIds: false }) })
const bodyOf = (raw: any) => (raw?.format === 'flyffbind' ? raw.profile : raw)

/** "DQ: farm/AOE" -> "DQ- farm-AOE" (safe Windows file name, no extension). */
export function safeFileName(name: string): string {
  const s = name
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '-')
    .replace(/[. ]+$/, '')
    .trim()
  return /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s) || !s ? 'Profile' : s.slice(0, 80)
}

async function getSettings(): Promise<Settings> {
  return (await readJson<Settings>(settingsFile())) ?? {}
}
async function patchSettings(patch: Settings) {
  await writeJson(settingsFile(), { ...(await getSettings()), ...patch })
}

function applyLinks(p: Profile): Profile {
  const l = links[p.id] ?? {}
  return { ...p, windows: p.windows.map((w) => ({ ...w, pid: l[w.id]?.pid ?? null, lastTitle: l[w.id]?.lastTitle, lastProcess: l[w.id]?.lastProcess })) }
}

function rememberLinks(p: Profile) {
  const l: Record<string, Link> = {}
  for (const w of p.windows) if (w.pid) l[w.id] = { pid: w.pid, lastTitle: w.lastTitle, lastProcess: w.lastProcess }
  links[p.id] = l
}

/** One-time move of profiles from %APPDATA%\FlyffBind\profiles into the visible Profiles folder. */
async function migrateLegacy() {
  const s = await getSettings()
  if (s.migratedToFolder) return
  const dir = legacyProfilesDir()
  if (existsSync(dir)) {
    const used = new Set<string>()
    for (const f of await fs.readdir(dir)) {
      if (!f.endsWith('.json')) continue
      const raw = await readJson<any>(join(dir, f))
      if (!raw) continue
      let p: Profile
      try {
        p = sanitizeProfile(raw, { keepPids: true, newIds: false })
      } catch {
        continue
      }
      rememberLinks(p)
      if (p.isDefault) {
        await writeJson(defaultProfileFile(), toFile(p))
      } else {
        let name = safeFileName(p.name)
        for (let n = 2; used.has(name.toLowerCase()) || existsSync(join(profilesDir(), name + PROFILE_EXT)); n++) name = `${safeFileName(p.name)} (${n})`
        used.add(name.toLowerCase())
        await writeJson(join(profilesDir(), name + PROFILE_EXT), toFile(p))
      }
    }
    await writeJson(linksFile(), links)
    // Keep the old files as a backup instead of deleting them.
    await fs.rename(dir, dir + '-backup').catch(() => {})
  }
  await patchSettings({ migratedToFolder: true })
}

/** Read every profile (Default + everything in the Profiles folder). */
export function loadAll(): Promise<{ profiles: Profile[]; activeId: string; folder: string }> {
  return serial(async () => {
    await fs.mkdir(profilesDir(), { recursive: true })
    links = (await readJson<Links>(linksFile())) ?? {}
    await migrateLegacy()

    // Scratch Default profile
    let def: Profile
    const rawDef = await readJson<any>(defaultProfileFile())
    try {
      def = sanitizeProfile(bodyOf(rawDef), { keepPids: false, newIds: false })
    } catch {
      def = newProfile('Default', true)
      await writeJson(defaultProfileFile(), toFile(def))
    }
    def.isDefault = true
    def.name = 'Default'

    // Saved profiles
    index.clear()
    const seen = new Set<string>([def.id])
    const profiles: Profile[] = [applyLinks(def)]
    const files = (await fs.readdir(profilesDir())).filter((f) => f.toLowerCase().endsWith(PROFILE_EXT)).sort()
    for (const f of files) {
      const path = join(profilesDir(), f)
      const raw = await readJson<any>(path)
      let p: Profile
      try {
        p = sanitizeProfile(bodyOf(raw), { keepPids: false, newIds: false })
      } catch {
        continue // not a profile file
      }
      p.isDefault = undefined
      // A copied file (or a hand-made one) can repeat an id: give it its own and save that.
      const body = bodyOf(raw)
      if (seen.has(p.id) || typeof body?.id !== 'string') {
        p = { ...p, id: uid() }
        await writeJson(path, toFile(p))
      }
      seen.add(p.id)
      index.set(p.id, path)
      profiles.push(applyLinks(p))
    }
    profiles.sort(sortProfiles)

    const s = await getSettings()
    const activeId = profiles.some((p) => p.id === s.activeId) ? s.activeId! : profiles[0].id
    return { profiles, activeId, folder: profilesDir() }
  })
}

/** Save a profile: Default goes to app data, others to Profiles\<Name>.flyffbind (renamed with the profile). */
export function saveProfile(p: Profile): Promise<Profile> {
  return serial(async () => {
    const clean = sanitizeProfile(p, { keepPids: true, newIds: false })
    rememberLinks(clean)
    await writeJson(linksFile(), links)
    if (clean.isDefault) {
      await writeJson(defaultProfileFile(), toFile(clean))
      return clean
    }
    const current = index.get(clean.id)
    const want = safeFileName(clean.name)
    let path = current
    if (!current || basename(current, PROFILE_EXT).replace(/ \(\d+\)$/, '') !== want) {
      path = join(profilesDir(), want + PROFILE_EXT)
      for (let n = 2; existsSync(path) && resolve(path) !== resolve(current ?? ''); n++) path = join(profilesDir(), `${want} (${n})${PROFILE_EXT}`)
    }
    await writeJson(path!, toFile(clean))
    if (current && resolve(current) !== resolve(path!)) await fs.rm(current, { force: true })
    index.set(clean.id, path!)
    return clean
  })
}

export function deleteProfile(id: string) {
  return serial(async () => {
    const path = index.get(id)
    if (path) await fs.rm(path, { force: true })
    index.delete(id)
    delete links[id]
    await writeJson(linksFile(), links)
  })
}

export const setActive = (id: string) => serial(() => patchSettings({ activeId: id }))

export async function exportTo(p: Profile, path: string) {
  await writeJson(path, toFile(p))
}

/** Read a profile file from anywhere and copy it into the Profiles folder. */
export async function importFrom(path: string, existingNames: string[]): Promise<Profile> {
  const raw = await readJson<any>(path)
  if (!raw) throw new Error('could not read the file')
  const p = sanitizeProfile(bodyOf(raw), { keepPids: false, newIds: true })
  p.isDefault = undefined
  const names = new Set(existingNames.map((n) => n.toLowerCase()))
  const base = p.name
  for (let n = 2; names.has(p.name.toLowerCase()); n++) p.name = `${base} (${n})`
  return saveProfile(p)
}

/** Call `onChange` (debounced) whenever files in the Profiles folder change. */
export function watchProfiles(onChange: () => void): FSWatcher | null {
  let t: ReturnType<typeof setTimeout> | null = null
  try {
    return watch(profilesDir(), (_e, file) => {
      if (file && !String(file).toLowerCase().endsWith(PROFILE_EXT)) return
      if (t) clearTimeout(t)
      t = setTimeout(onChange, 400)
    })
  } catch {
    return null
  }
}

/** Id of the profile loaded from this file, if it is one of ours. */
export function idForPath(path: string): string | undefined {
  for (const [id, p] of index) if (resolve(p).toLowerCase() === resolve(path).toLowerCase()) return id
  return undefined
}
