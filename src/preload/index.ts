import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../../shared/types'
import type {
  ElectronAPI, RunCodePayload, OutputEntry, ExecutionResult,
  PersistedState, PackageOperationResult, InstalledPackage, PackageSearchResult
} from '../../shared/types'

const api: ElectronAPI = {
  runCode(payload: RunCodePayload) {
    ipcRenderer.send(IPC.RUN_CODE, payload)
  },

  stopExecution() {
    ipcRenderer.send(IPC.STOP_EXECUTION)
  },

  onOutputEntry(callback: (entry: OutputEntry) => void) {
    const handler = (_event: Electron.IpcRendererEvent, entry: OutputEntry) => callback(entry)
    ipcRenderer.on(IPC.OUTPUT_ENTRY, handler)
    return () => { ipcRenderer.removeListener(IPC.OUTPUT_ENTRY, handler) }
  },

  onExecutionDone(callback: (result: ExecutionResult) => void) {
    const handler = (_event: Electron.IpcRendererEvent, result: ExecutionResult) => callback(result)
    ipcRenderer.on(IPC.EXECUTION_DONE, handler)
    return () => { ipcRenderer.removeListener(IPC.EXECUTION_DONE, handler) }
  },

  saveState(state: PersistedState) {
    ipcRenderer.send(IPC.SAVE_STATE, state)
  },

  loadState(): Promise<PersistedState | null> {
    return ipcRenderer.invoke(IPC.LOAD_STATE)
  },

  installPackage(name: string): Promise<PackageOperationResult> {
    return ipcRenderer.invoke(IPC.INSTALL_PACKAGE, name)
  },

  removePackage(name: string): Promise<PackageOperationResult> {
    return ipcRenderer.invoke(IPC.REMOVE_PACKAGE, name)
  },

  listPackages(): Promise<InstalledPackage[]> {
    return ipcRenderer.invoke(IPC.LIST_PACKAGES)
  },

  searchPackages(query: string): Promise<PackageSearchResult[]> {
    return ipcRenderer.invoke(IPC.SEARCH_PACKAGES, query)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
