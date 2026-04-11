import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../../shared/types'
import type {
  ElectronAPI, RunCodePayload, OutputEntry, ExecutionResult,
  PersistedState, AppSettings, PackageOperationResult, InstalledPackage, PackageSearchResult, UpdateInfo, TypeDefInfo
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

  saveSettings(settings: AppSettings) {
    ipcRenderer.send(IPC.SAVE_SETTINGS, settings)
  },

  loadSettings(): Promise<AppSettings | null> {
    return ipcRenderer.invoke(IPC.LOAD_SETTINGS)
  },

  onMenuNewTab(callback: () => void) {
    const handler = () => callback()
    ipcRenderer.on(IPC.MENU_NEW_TAB, handler)
    return () => { ipcRenderer.removeListener(IPC.MENU_NEW_TAB, handler) }
  },

  onMenuCloseTab(callback: () => void) {
    const handler = () => callback()
    ipcRenderer.on(IPC.MENU_CLOSE_TAB, handler)
    return () => { ipcRenderer.removeListener(IPC.MENU_CLOSE_TAB, handler) }
  },

  onMenuRunCode(callback: () => void) {
    const handler = () => callback()
    ipcRenderer.on(IPC.MENU_RUN_CODE, handler)
    return () => { ipcRenderer.removeListener(IPC.MENU_RUN_CODE, handler) }
  },

  onMenuToggleSettings(callback: () => void) {
    const handler = () => callback()
    ipcRenderer.on(IPC.MENU_TOGGLE_SETTINGS, handler)
    return () => { ipcRenderer.removeListener(IPC.MENU_TOGGLE_SETTINGS, handler) }
  },

  onMenuToggleTheme(callback: () => void) {
    const handler = () => callback()
    ipcRenderer.on(IPC.MENU_TOGGLE_THEME, handler)
    return () => { ipcRenderer.removeListener(IPC.MENU_TOGGLE_THEME, handler) }
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
  },

  checkForUpdates(): Promise<UpdateInfo> {
    return ipcRenderer.invoke(IPC.CHECK_FOR_UPDATES)
  },

  openExternal(url: string) {
    ipcRenderer.send(IPC.OPEN_EXTERNAL, url)
  },

  checkPackageUpdates(packages: { name: string; version: string }[]): Promise<Record<string, string>> {
    return ipcRenderer.invoke(IPC.CHECK_PACKAGE_UPDATES, packages)
  },

  getPackagePaths(): Promise<{ npmPath: string; packagesDir: string }> {
    return ipcRenderer.invoke(IPC.GET_PACKAGE_PATHS)
  },

  getTypeDefs(): Promise<TypeDefInfo[]> {
    return ipcRenderer.invoke(IPC.GET_TYPE_DEFS)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
