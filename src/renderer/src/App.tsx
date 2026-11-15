import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keyLabel } from '../../shared/keys'
import { type EngineStatus, type GameWindow, type Macro, type Profile, type UpdateStatus, newProfile, sanitizeProfile, uid } from '../../shared/types'
import { Header } from './components/Header'
import { KeyCaptureModal } from './components/KeyCapture'
import { MacroRow } from './components/MacroRow'
import { MacroWizard } from './components/MacroWizard'
import { Sidebar } from './components/Sidebar'
import { Tour, TourHint, tourPrefs, versionPrefs } from './components/Tour'
import { WhatsNew } from './components/WhatsNew'
import { compareVersions } from './changelog'
import { TypeTiles } from './components/TypeTiles'
import { WindowsSection } from './components/WindowsSection'
import { Button, ConfirmModal, Modal, PromptModal, SectionHeader } from './components/ui'

type ModalState =
  | { kind: 'prompt'; title: string; label: string; hint?: string; initial?: string; confirm?: string; submit: (v: string) => void }
  | { kind: 'confirm'; title: string; message: string; confirm: string; run: () => void }
  | { kind: 'wizard' }
  | { kind: 'type'; macroId: string }
  | {
      kind: 'capture'
      title: string
      hint: string
      mode: 'single' | 'sequence'
      allowMouse?: boolean
      initial?: string[]
      validate?: (k: string) => string | null
      done: (keys: string[]) => void
    }

type Toast = { text: string; tone: 'info' | 'warn' }

/** Runtime / UI-only fields that never count as unsaved changes. */
const VOLATILE = new Set(['pid', 'lastTitle', 'lastProcess', 'collapsed'])
const fingerprint = (p: Profile) => JSON.stringify(p, (k, v) => (VOLATILE.has(k) ? undefined : v))
/** What the engine cares about (everything except UI collapse state). */
const engineKey = (p: Profile) => JSON.stringify(p, (k, v) => (k === 'collapsed' ? undefined : v))

const sortProfiles = (a: Profile, b: Profile) => (a.isDefault ? -1 : b.isDefault ? 1 : a.name.localeCompare(b.name))

export default function App() {
  const [drafts, setDrafts] = useState<Profile[]>([])
  const [saved, setSaved] = useState<Record<string, Profile>>({})
  const [activeId, setActiveId] = useState('')
  const [engine, setEngine] = useState<EngineStatus>({ state: 'off' })
  const [alive, setAlive] = useState<Record<number, boolean>>({})
  const [modal, setModal] = useState<ModalState | null>(null)
  const [pickingId, setPickingId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [tourOpen, setTourOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [update, setUpdate] = useState<UpdateStatus>({ status: 'idle' })
  const [whatsNew, setWhatsNew] = useState<{ from?: string; updated?: boolean } | null>(null)
  const appPid = useRef(0)

  const startTour = useCallback(() => {
    setHintOpen(false)
    setModal(null)
    setTourOpen(true)
  }, [])
  const endTour = useCallback(() => {
    setTourOpen(false)
    tourPrefs.setDone()
  }, [])
  const dismissHint = useCallback(() => setHintOpen(false), [])
  const neverHint = useCallback(() => {
    setHintOpen(false)
    tourPrefs.setHintOff()
    setToast({ tone: 'info', text: 'Got it. You can still find “Show me around” at the bottom left.' })
  }, [])

  const profile = drafts.find((p) => p.id === activeId)
  const dirtyIds = useMemo(() => new Set(drafts.filter((d) => saved[d.id] && fingerprint(d) !== fingerprint(saved[d.id])).map((d) => d.id)), [drafts, saved])
  const dirty = !!profile && dirtyIds.has(profile.id)

  // ---------- load + engine status ----------
  useEffect(() => {
    window.api.updateStatus().then(setUpdate)
    const offUpdate = window.api.onUpdateStatus(setUpdate)
    Promise.all([window.api.loadProfiles(), window.api.appVersion()]).then(([r, version]) => {
      setAppVersion(version)
      setDrafts(r.profiles)
      setSaved(Object.fromEntries(r.profiles.map((p) => [p.id, p])))
      setActiveId(r.activeId)
      // First launch: guided tour. After an update: what's new. Otherwise a gentle nudge
      // toward the tour (unless turned off).
      const last = versionPrefs.lastSeen()
      versionPrefs.setLastSeen(version)
      if (!tourPrefs.done()) setTimeout(() => setTourOpen(true), 600)
      else if (last !== version && (!last || compareVersions(version, last) > 0)) setTimeout(() => setWhatsNew({ from: last || undefined, updated: true }), 600)
      else if (!tourPrefs.hintOff()) setTimeout(() => setHintOpen(true), 1600)
    })
    window.api.engineStatus().then(setEngine)
    window.api.appPid().then((p) => (appPid.current = p))
    const offEngine = window.api.onEngineStatus(setEngine)
    return () => {
      offEngine()
      offUpdate()
    }
  }, [])

  // The Profiles folder changed on disk (saved here, another copy of the app, or files copied in).
  const savedRef = useRef(saved)
  savedRef.current = saved
  useEffect(
    () =>
      window.api.onProfilesChanged((list) => {
        const prevSaved = savedRef.current
        setDrafts((drafts) => {
          const byId = new Map(drafts.map((d) => [d.id, d]))
          return list.map((p) => {
            const d = byId.get(p.id)
            if (!d) return p
            const s = prevSaved[p.id]
            if (s && fingerprint(d) !== fingerprint(s)) return d // keep unsaved edits
            // Keep which macros are expanded on screen.
            return { ...p, macros: p.macros.map((m) => ({ ...m, collapsed: d.macros.find((x) => x.id === m.id)?.collapsed ?? m.collapsed })) }
          })
        })
        setSaved(Object.fromEntries(list.map((p) => [p.id, p])))
        setActiveId((id) => (list.some((p) => p.id === id) ? id : list[0]?.id ?? id))
      }),
    []
  )

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  // Keep the engine armed with whatever is on screen (so you can test before saving).
  const armKey = profile ? engineKey(profile) : ''
  const profileRef = useRef(profile)
  profileRef.current = profile
  useEffect(() => {
    if (!armKey) return
    const t = setTimeout(() => profileRef.current && window.api.engineArm(profileRef.current).then(setEngine), 350)
    return () => clearTimeout(t)
  }, [armKey])

  // Ask before closing the app with unsaved changes (handled in the main process).
  useEffect(() => {
    window.onbeforeunload = dirtyIds.size ? (e) => ((e.returnValue = false), false) : null
  }, [dirtyIds])

  // Poll whether linked windows still exist.
  const pidKey = profile?.windows.map((w) => w.pid ?? 0).join(',') ?? ''
  useEffect(() => {
    const pids = pidKey.split(',').map(Number).filter((n) => n > 0)
    if (pids.length === 0) return
    const check = () => window.api.checkPids(pids).then((r) => setAlive((a) => ({ ...a, ...r })))
    check()
    const t = setInterval(check, 3000)
    return () => clearInterval(t)
  }, [pidKey])

  // ---------- state helpers ----------
  /** Edit the on-screen draft (becomes "unsaved changes"). */
  const editDraft = useCallback((id: string, fn: (p: Profile) => Profile) => {
    setDrafts((list) => list.map((p) => (p.id === id ? fn(p) : p)))
  }, [])
  const edit = (fn: (p: Profile) => Profile) => profile && editDraft(profile.id, fn)

  /** Apply a change to both draft and saved copy and persist immediately (window links, renames). */
  const editPersisted = (id: string, fn: (p: Profile) => Profile) => {
    editDraft(id, fn)
    const s = saved[id]
    if (s) {
      const next = fn(s)
      setSaved((m) => ({ ...m, [id]: next }))
      window.api.saveProfile(next)
    }
  }

  const select = (id: string) => {
    setActiveId(id)
    window.api.setActive(id)
  }

  const addProfile = async (p: Profile) => {
    const s = await window.api.saveProfile(p)
    setDrafts((l) => [...l.filter((x) => x.id !== s.id), s].sort(sortProfiles))
    setSaved((m) => ({ ...m, [s.id]: s }))
    select(s.id)
    return s
  }

  const uniqueName = (name: string) => {
    const names = new Set(drafts.map((p) => p.name.toLowerCase()))
    let n = name
    for (let i = 2; names.has(n.toLowerCase()); i++) n = `${name} (${i})`
    return n
  }

  // ---------- save / discard ----------
  const saveAs = async (name: string) => {
    if (!profile) return
    const copy = sanitizeProfile({ ...profile, name: uniqueName(name), isDefault: false }, { keepPids: true, newIds: true })
    // Start the Default scratch profile fresh (keep its window links, they're handy).
    const def = saved[profile.id] ?? profile
    const reset: Profile = { ...def, windows: profile.windows, macros: [], suspendKey: null }
    const r = await window.api.saveProfile(reset)
    setDrafts((l) => l.map((p) => (p.id === r.id ? r : p)))
    setSaved((m) => ({ ...m, [r.id]: r }))
    await addProfile(copy)
    setToast({ tone: 'info', text: `Saved as “${copy.name}”.` })
  }

  const save = async () => {
    if (!profile) return
    if (profile.isDefault) {
      setModal({
        kind: 'prompt',
        title: 'Save as new profile',
        label: 'Profile name',
        hint: 'Give this setup a name. It will appear in your profile list, and Default starts fresh.',
        confirm: 'Save profile',
        submit: saveAs
      })
      return
    }
    const s = await window.api.saveProfile(profile)
    setSaved((m) => ({ ...m, [s.id]: s }))
    setToast({ tone: 'info', text: 'Profile saved.' })
  }

  const discard = () => profile && saved[profile.id] && editDraft(profile.id, () => saved[profile.id])

  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  // ---------- validation ----------
  const hotkeyConflict = (k: string, exceptMacroId?: string): string | null => {
    if (!profile) return null
    const low = k.toLowerCase()
    if (profile.suspendKey?.toLowerCase() === low) return 'That is your Start / Stop key.'
    const other = profile.macros.find((m) => m.id !== exceptMacroId && m.hotkey.toLowerCase() === low)
    return other ? `Already used by “${other.name}”.` : null
  }

  // ---------- windows ----------
  const linkWindow = async (w: GameWindow) => {
    if (!profile) return
    const pid = profile.id
    setPickingId(w.id)
    try {
      const r = await window.api.pickWindow(w.name)
      if (r.cancelled || !r.pid) return
      if (r.pid === appPid.current) {
        setToast({ tone: 'warn', text: 'That was BINDit itself — click your game window instead.' })
        return
      }
      editPersisted(pid, (p) => ({
        ...p,
        windows: p.windows.map((x) => (x.id === w.id ? { ...x, pid: r.pid!, lastTitle: r.title, lastProcess: r.process } : x))
      }))
      setAlive((a) => ({ ...a, [r.pid!]: true }))
      const notFx = r.process && !/^firefox\.exe$/i.test(r.process)
      setToast(notFx ? { tone: 'warn', text: `${w.name} linked to ${r.process} — that's not Firefox, double-check it.` } : { tone: 'info', text: `${w.name} → PID ${r.pid}` })
    } finally {
      setPickingId(null)
    }
  }

  // ---------- macros ----------
  const updateMacro = (id: string) => (fn: (m: Macro) => Macro) => edit((p) => ({ ...p, macros: p.macros.map((x) => (x.id === id ? fn(x) : x)) }))

  if (!profile) {
    return <div className="flex h-full items-center justify-center text-muted">Loading…</div>
  }

  const running = engine.profileId === profile.id && engine.state === 'running'
  const unlinkedUsed = profile.macros.some(
    (m) => m.enabled && m.kind === 'keys' && m.actions.some((a) => profile.windows.find((w) => w.id === a.windowId)?.pid == null)
  )

  return (
    <div className="flex h-full">
      <Sidebar
        profiles={drafts}
        activeId={activeId}
        dirtyIds={dirtyIds}
        engine={engine}
        onSelect={select}
        onOpenFolder={() => window.api.openProfilesFolder()}
        tourAttention={hintOpen}
        onTour={startTour}
        appVersion={appVersion}
        update={update}
        onWhatsNew={() => setWhatsNew({})}
        onNew={() =>
          setModal({
            kind: 'prompt',
            title: 'New profile',
            label: 'Profile name',
            confirm: 'Create',
            submit: (name) => addProfile(newProfile(uniqueName(name)))
          })
        }
        onImport={async () => {
          const r = await window.api.importProfile()
          if (!r) return
          if (r.error || !r.profile) return setToast({ tone: 'warn', text: r.error ?? 'Import failed.' })
          if (r.existing) return select(r.profile.id)
          setDrafts((l) => [...l.filter((p) => p.id !== r.profile!.id), r.profile!].sort(sortProfiles))
          setSaved((m) => ({ ...m, [r.profile!.id]: r.profile! }))
          select(r.profile.id)
          setToast({ tone: 'info', text: `Imported “${r.profile.name}”. Link your windows to start using it.` })
        }}
        onRename={(p) =>
          setModal({
            kind: 'prompt',
            title: 'Rename profile',
            label: 'Profile name',
            initial: p.name,
            submit: (name) => editPersisted(p.id, (x) => ({ ...x, name }))
          })
        }
        onDuplicate={(p) => addProfile(sanitizeProfile({ ...p, name: uniqueName(`${p.name} copy`), isDefault: false }, { keepPids: true, newIds: true }))}
        onExport={async (p) => {
          const path = await window.api.exportProfile(p)
          if (path) setToast({ tone: 'info', text: `Exported to ${path}` })
        }}
        onDelete={(p) =>
          setModal({
            kind: 'confirm',
            title: 'Delete profile',
            message: `Delete “${p.name}”? This can't be undone — export it first if you want a backup.`,
            confirm: 'Delete',
            run: async () => {
              await window.api.deleteProfile(p.id)
              const rest = drafts.filter((x) => x.id !== p.id)
              setDrafts(rest)
              setSaved(({ [p.id]: _, ...m }) => m)
              if (p.id === activeId) select(rest[0].id)
            }
          })
        }
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Header
          profile={profile}
          dirty={dirty}
          engine={engine}
          onSave={save}
          onDiscard={discard}
          onToggleRunning={async () => {
            if (engine.profileId !== profile.id) await window.api.engineArm(profile)
            setEngine(await window.api.engineSetRunning(!running))
          }}
          onSetKey={() =>
            setModal({
              kind: 'capture',
              title: 'Start / Stop key',
              hint: 'Press the key that starts and stops all macros (same as the Start / Stop button).',
              mode: 'single',
              allowMouse: true,
              validate: (k) => {
                const m = profile.macros.find((x) => x.hotkey.toLowerCase() === k.toLowerCase())
                return m ? `Already used by macro “${m.name}”.` : null
              },
              done: ([k]) => k && edit((p) => ({ ...p, suspendKey: k }))
            })
          }
          onClearKey={() => edit((p) => ({ ...p, suspendKey: null }))}
        />

        <div className="space-y-10 px-10 pt-8 pb-12">
          <WindowsSection
            windows={profile.windows}
            alive={alive}
            pickingId={pickingId}
            onAdd={() =>
              setModal({
                kind: 'prompt',
                title: 'Add window',
                label: 'Character / window name',
                hint: 'One window per account, e.g. Templar, Seraph or DPS.',
                confirm: 'Add',
                submit: (name) => edit((p) => ({ ...p, windows: [...p.windows, { id: uid(), name, pid: null }] }))
              })
            }
            onRename={(w) =>
              setModal({
                kind: 'prompt',
                title: 'Rename window',
                label: 'Character / window name',
                initial: w.name,
                submit: (name) => edit((p) => ({ ...p, windows: p.windows.map((x) => (x.id === w.id ? { ...x, name } : x)) }))
              })
            }
            onDelete={(w) => {
              const used = profile.macros.filter((m) => m.actions.some((a) => a.windowId === w.id)).length
              setModal({
                kind: 'confirm',
                title: 'Delete window',
                message: used ? `Delete “${w.name}”? It will also be removed from ${used} macro(s).` : `Delete “${w.name}”?`,
                confirm: 'Delete',
                run: () =>
                  edit((p) => ({
                    ...p,
                    windows: p.windows.filter((x) => x.id !== w.id),
                    macros: p.macros.map((m) => ({ ...m, actions: m.actions.filter((a) => a.windowId !== w.id) }))
                  }))
              })
            }}
            onLink={linkWindow}
            onUnlink={(w) => editPersisted(profile.id, (p) => ({ ...p, windows: p.windows.map((x) => (x.id === w.id ? { ...x, pid: null, lastTitle: undefined, lastProcess: undefined } : x)) }))}
          />

          <section>
            <SectionHeader title="Macros" count={profile.macros.length}>
              {profile.macros.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allCollapsed = profile.macros.every((m) => m.collapsed)
                    edit((p) => ({ ...p, macros: p.macros.map((m) => ({ ...m, collapsed: !allCollapsed })) }))
                  }}
                >
                  {profile.macros.every((m) => m.collapsed) ? 'Expand all' : 'Collapse all'}
                </Button>
              )}
              <Button data-tour="add-macro" variant="primary" size="sm" onClick={() => setModal({ kind: 'wizard' })}>
                <Plus size={14} /> Add macro
              </Button>
            </SectionHeader>
            {unlinkedUsed && <p className="mb-3 text-xs text-amber-300">Some keystroke macros target windows that aren't linked yet — those are skipped until you link them.</p>}
            {profile.macros.length === 0 ? (
              <button
                onClick={() => setModal({ kind: 'wizard' })}
                className="tap group/new flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-line py-10 text-sm text-muted hover:border-accent hover:bg-accent/5 hover:text-accent"
              >
                <Plus size={20} className="transition-transform duration-300 group-hover/new:rotate-90 group-hover/new:scale-125" />
                Create your first macro
              </button>
            ) : (
              <div className="space-y-2">
                {profile.macros.map((m, idx) => (
                  <MacroRow
                    key={m.id}
                    tourAnchor={idx === 0}
                    macro={m}
                    windows={profile.windows}
                    conflict={m.enabled && hotkeyConflict(m.hotkey, m.id) ? 'Key conflict' : null}
                    update={updateMacro(m.id)}
                    onDelete={() =>
                      setModal({
                        kind: 'confirm',
                        title: 'Delete macro',
                        message: `Delete “${m.name}” (${keyLabel(m.hotkey)})?`,
                        confirm: 'Delete',
                        run: () => edit((p) => ({ ...p, macros: p.macros.filter((x) => x.id !== m.id) }))
                      })
                    }
                    onRename={() =>
                      setModal({
                        kind: 'prompt',
                        title: 'Rename macro',
                        label: 'Macro name',
                        initial: m.name,
                        submit: (name) => updateMacro(m.id)((x) => ({ ...x, name }))
                      })
                    }
                    onChangeHotkey={() =>
                      setModal({
                        kind: 'capture',
                        title: `Trigger key · ${m.name}`,
                        hint: 'Press the new trigger key (or key combo).',
                        mode: 'single',
                        allowMouse: true,
                        validate: (k) => hotkeyConflict(k, m.id),
                        done: ([k]) => k && updateMacro(m.id)((x) => ({ ...x, hotkey: k }))
                      })
                    }
                    onChangeType={() => setModal({ kind: 'type', macroId: m.id })}
                    onRecordKeys={(actionId) => {
                      const a = m.actions.find((x) => x.id === actionId)
                      const wName = profile.windows.find((w) => w.id === a?.windowId)?.name ?? 'window'
                      setModal({
                        kind: 'capture',
                        title: `Keys for ${wName}`,
                        hint: `Press the keys to send to ${wName}, in order.`,
                        mode: 'sequence',
                        initial: a?.keys ?? [],
                        done: (keys) => updateMacro(m.id)((x) => ({ ...x, actions: x.actions.map((y) => (y.id === actionId ? { ...y, keys } : y)) }))
                      })
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ---------- modals ---------- */}
      {modal?.kind === 'prompt' && (
        <PromptModal
          title={modal.title}
          label={modal.label}
          hint={modal.hint}
          initial={modal.initial}
          confirm={modal.confirm}
          onClose={() => setModal(null)}
          onSubmit={(v) => {
            setModal(null)
            modal.submit(v)
          }}
        />
      )}
      {modal?.kind === 'confirm' && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          confirm={modal.confirm}
          onClose={() => setModal(null)}
          onConfirm={() => {
            setModal(null)
            modal.run()
          }}
        />
      )}
      {modal?.kind === 'capture' && (
        <KeyCaptureModal
          title={modal.title}
          hint={modal.hint}
          mode={modal.mode}
          allowMouse={modal.allowMouse}
          initial={modal.initial}
          validate={modal.validate}
          onClose={() => setModal(null)}
          onDone={(keys) => {
            setModal(null)
            modal.done(keys)
          }}
        />
      )}
      {modal?.kind === 'wizard' && (
        <MacroWizard
          validateKey={(k) => hotkeyConflict(k)}
          onClose={() => setModal(null)}
          onCreate={(m) => {
            // Keystroke macros start with one row per window so you only have to record keys.
            const ready = m.kind === 'keys' ? { ...m, actions: profile.windows.map((w) => ({ id: uid(), windowId: w.id, keys: [] })) } : m
            edit((p) => ({ ...p, macros: [...p.macros.map((x) => ({ ...x, collapsed: true })), ready] }))
            setModal(null)
          }}
        />
      )}
      {modal?.kind === 'type' && (
        <Modal title="Behavior" onClose={() => setModal(null)} wide>
          <TypeTiles
            value={profile.macros.find((m) => m.id === modal.macroId)?.type}
            onPick={(t) => {
              updateMacro(modal.macroId)((x) => ({ ...x, type: t }))
              setModal(null)
            }}
          />
        </Modal>
      )}

      {whatsNew && appVersion && <WhatsNew version={appVersion} from={whatsNew.from} updated={whatsNew.updated} onClose={() => setWhatsNew(null)} />}
      {tourOpen && <Tour onClose={endTour} />}
      {hintOpen && !tourOpen && <TourHint onStart={startTour} onDismiss={dismissHint} onNever={neverHint} />}

      {toast && (
        <div
          className={`toast fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm shadow-2xl ring-1 ${
            toast.tone === 'warn' ? 'bg-amber-950 text-amber-200 ring-amber-500/40' : 'bg-tile text-zinc-100 ring-line'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
