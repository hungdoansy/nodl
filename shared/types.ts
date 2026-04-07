/** IPC channel names */
export const IPC = {
  RUN_CODE: 'ipc:run-code',
  STOP_EXECUTION: 'ipc:stop-execution',
  OUTPUT_ENTRY: 'ipc:output-entry',
  EXECUTION_DONE: 'ipc:execution-done',
  SAVE_STATE: 'ipc:save-state',
  LOAD_STATE: 'ipc:load-state',
  INSTALL_PACKAGE: 'ipc:install-package',
  REMOVE_PACKAGE: 'ipc:remove-package',
  LIST_PACKAGES: 'ipc:list-packages',
  SEARCH_PACKAGES: 'ipc:search-packages'
} as const

/** Installed package info */
export interface InstalledPackage {
  name: string
  version: string
}

/** npm search result */
export interface PackageSearchResult {
  name: string
  description: string
  version: string
  date: string
}

/** Result of install/remove operation */
export interface PackageOperationResult {
  success: boolean
  name: string
  version?: string
  error?: string
}

/** Persisted app state */
export interface PersistedState {
  version: number
  tabs: Array<{
    id: string
    name: string
    language: 'javascript' | 'typescript'
    code: string
    createdAt: number
    updatedAt: number
  }>
  activeTabId: string
}

/** Console methods we capture */
export type ConsoleMethod = 'log' | 'warn' | 'error' | 'info' | 'debug' | 'table' | 'clear'

/** A single console output entry */
export interface OutputEntry {
  id: string
  method: ConsoleMethod
  args: unknown[]
  timestamp: number
}

/** Result sent when execution completes */
export interface ExecutionResult {
  success: boolean
  duration: number
  error?: string
  lastExpressionResult?: unknown
}

/** Message from child process to main */
export interface WorkerMessage {
  type: 'console' | 'result' | 'error'
  entry?: OutputEntry
  result?: ExecutionResult
}

/** Payload sent to run code */
export interface RunCodePayload {
  code: string
  language: 'javascript' | 'typescript'
  timeout?: number
}

/** ElectronAPI exposed via preload */
export interface ElectronAPI {
  runCode: (payload: RunCodePayload) => void
  stopExecution: () => void
  onOutputEntry: (callback: (entry: OutputEntry) => void) => () => void
  onExecutionDone: (callback: (result: ExecutionResult) => void) => () => void
  saveState: (state: PersistedState) => void
  loadState: () => Promise<PersistedState | null>
  installPackage: (name: string) => Promise<PackageOperationResult>
  removePackage: (name: string) => Promise<PackageOperationResult>
  listPackages: () => Promise<InstalledPackage[]>
  searchPackages: (query: string) => Promise<PackageSearchResult[]>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
