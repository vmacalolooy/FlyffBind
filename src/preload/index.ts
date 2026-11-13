import { contextBridge, ipcRenderer } from 'electron'
import type { EngineStatus, PickResult, PointResult, Profile, RecordResult } from '../shared/types'

const api = {
  loadProfiles: (): Promise<{ profiles: Profile[]; activeId: string; folder: string }> => ipcRenderer.invoke('profiles:load'),
  openProfilesFolder: (): Promise<string> => ipcRenderer.invoke('profiles:openFolder'),
  onProfilesChanged: (cb: (profiles: Profile[]) => void) => {
    const fn = (_e: unknown, p: Profile[]) => cb(p)
    ipcRenderer.on('profiles:changed', fn)
    return (): void => {
      ipcRenderer.removeListener('profiles:changed', fn)
    }
  },
  saveProfile: (p: Profile): Promise<Profile> => ipcRenderer.invoke('profiles:save', p),
  deleteProfile: (id: string): Promise<void> => ipcRenderer.invoke('profiles:delete', id),
  setActive: (id: string): Promise<void> => ipcRenderer.invoke('profiles:setActive', id),
  exportProfile: (p: Profile): Promise<string | null> => ipcRenderer.invoke('profiles:export', p),
  importProfile: (): Promise<{ profile?: Profile; existing?: boolean; error?: string } | null> => ipcRenderer.invoke('profiles:import'),
  pickWindow: (name: string): Promise<PickResult> => ipcRenderer.invoke('window:pick', name),
  pickPoint: (label: string): Promise<PointResult> => ipcRenderer.invoke('mouse:pickPoint', label),
  recordMouse: (): Promise<RecordResult> => ipcRenderer.invoke('mouse:record'),
  checkPids: (pids: number[]): Promise<Record<number, boolean>> => ipcRenderer.invoke('window:checkPids', pids),
  appPid: (): Promise<number> => ipcRenderer.invoke('app:pid'),
  engineArm: (p: Profile): Promise<EngineStatus> => ipcRenderer.invoke('engine:arm', p),
  engineSetRunning: (on: boolean): Promise<EngineStatus> => ipcRenderer.invoke('engine:setRunning', on),
  engineStatus: (): Promise<EngineStatus> => ipcRenderer.invoke('engine:status'),
  engineHold: (on: boolean): Promise<void> => ipcRenderer.invoke('engine:hold', on),
  onEngineStatus: (cb: (s: EngineStatus) => void) => {
    const fn = (_e: unknown, s: EngineStatus) => cb(s)
    ipcRenderer.on('engine:status', fn)
    return (): void => {
      ipcRenderer.removeListener('engine:status', fn)
    }
  }
}

export type Api = typeof api
contextBridge.exposeInMainWorld('api', api)
