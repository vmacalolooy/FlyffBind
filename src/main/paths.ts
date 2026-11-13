import { app } from 'electron'
import { join } from 'path'

/** Folder holding AutoHotkeyU64.exe and the helper scripts (bundled as extraResources when packaged). */
export function ahkDir(): string {
  return app.isPackaged ? join(process.resourcesPath, 'ahk') : join(app.getAppPath(), 'resources', 'ahk')
}

export const ahkExe = () => join(ahkDir(), 'AutoHotkeyU64.exe')
export const pickerScript = () => join(ahkDir(), 'picker.ahk')

/** Private app data (%APPDATA%\FlyffBind): settings, window links, scratch Default profile, engine script. */
export const dataDir = () => app.getPath('userData')
/** Where saved profiles live, one shareable .flyffbind file each: Documents\FlyffBind\Profiles */
export const profilesDir = () => join(app.getPath('documents'), 'FlyffBind', 'Profiles')
/** Pre-1.1 location of profiles (migrated on first launch). */
export const legacyProfilesDir = () => join(dataDir(), 'profiles')
export const defaultProfileFile = () => join(dataDir(), 'default.flyffbind')
export const linksFile = () => join(dataDir(), 'window-links.json')
export const settingsFile = () => join(dataDir(), 'settings.json')
export const engineScript = () => join(dataDir(), 'engine', 'FlyffBind-engine.ahk')
