// Patch notes shown in "What's new". Newest first. Add an entry with every release
// (same version number as package.json) before building it.

export type ChangeType = 'new' | 'improved' | 'fixed'

export interface ChangelogEntry {
  version: string
  date: string // YYYY-MM-DD
  title: string
  items: { type: ChangeType; text: string }[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-11-16',
    title: 'Updates on your terms',
    items: [
      { type: 'new', text: 'BINDit now tells you when a new version is out. You choose when to download it, and it installs with one click on Restart & update.' },
      { type: 'new', text: 'What’s new: see what changed after every update, or any time from the version link at the bottom left.' },
      { type: 'improved', text: 'New app icon: the silver B from the BINDit logo, on your desktop, taskbar and Start menu.' },
      { type: 'improved', text: 'The logo is now a clean silver gradient.' },
      { type: 'improved', text: 'The project moved to github.com/vmacalolooy/BINDit (old links still work).' }
    ]
  },
  {
    version: '1.1.0',
    date: '2026-11-14',
    title: 'FlyffBind is now BINDit',
    items: [
      { type: 'new', text: 'New name and logo. Your FlyffBind profiles and settings are copied over automatically on first launch.' },
      { type: 'new', text: 'Show me around: a step-by-step guided tour, at the bottom left.' },
      { type: 'improved', text: 'Buttons, switches, tiles and menus press, spring and glow, so everything feels more responsive.' },
      { type: 'improved', text: 'Profiles are saved as .bindit files. Older .flyffbind files still open and import.' }
    ]
  },
  {
    version: '1.0.0',
    date: '2026-11-13',
    title: 'First release',
    items: [
      { type: 'new', text: 'Send keystrokes to several Flyff windows in the background: No Repeat, Repeat While Holding and Toggle macros.' },
      { type: 'new', text: 'Mouse macros: record a path or pick click points on screen.' },
      { type: 'new', text: 'Profiles saved in Documents, shareable with friends through Export and Import.' },
      { type: 'new', text: 'One Start / Stop key that turns every macro on or off from inside the game.' }
    ]
  }
]

/** -1 / 0 / 1 for plain x.y.z version strings. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0) ? 1 : -1
  return 0
}
