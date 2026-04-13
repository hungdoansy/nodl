/** IPC channel names */
export const IPC = {
  RUN_CODE: 'ipc:run-code',
  STOP_EXECUTION: 'ipc:stop-execution',
  OUTPUT_ENTRY: 'ipc:output-entry',
  EXECUTION_DONE: 'ipc:execution-done',
  SAVE_STATE: 'ipc:save-state',
  LOAD_STATE: 'ipc:load-state',
  SAVE_SETTINGS: 'ipc:save-settings',
  LOAD_SETTINGS: 'ipc:load-settings',
  MENU_NEW_TAB: 'ipc:menu-new-tab',
  MENU_CLOSE_TAB: 'ipc:menu-close-tab',
  MENU_RUN_CODE: 'ipc:menu-run-code',
  MENU_TOGGLE_SETTINGS: 'ipc:menu-toggle-settings',
  MENU_TOGGLE_THEME: 'ipc:menu-toggle-theme',
  INSTALL_PACKAGE: 'ipc:install-package',
  REMOVE_PACKAGE: 'ipc:remove-package',
  LIST_PACKAGES: 'ipc:list-packages',
  SEARCH_PACKAGES: 'ipc:search-packages',
  CHECK_FOR_UPDATES: 'ipc:check-for-updates',
  OPEN_EXTERNAL: 'ipc:open-external',
  CHECK_PACKAGE_UPDATES: 'ipc:check-package-updates',
  GET_PACKAGE_PATHS: 'ipc:get-package-paths',
  GET_TYPE_DEFS: 'ipc:get-type-defs',
  LOAD_TAB_INDEX: 'ipc:load-tab-index',
  SAVE_TAB_INDEX: 'ipc:save-tab-index',
  LOAD_TAB_CONTENT: 'ipc:load-tab-content',
  SAVE_TAB_CONTENT: 'ipc:save-tab-content',
  DELETE_TAB_CONTENT: 'ipc:delete-tab-content'
} as const

export interface UpdateInfo {
  available: boolean
  version: string
  url: string
}

/** App settings */
export type ThemeMode = 'dark' | 'light' | 'system'

export interface AppSettings {
  // Editor
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  // Execution
  autoRunEnabled: boolean
  autoRunDelay: number
  executionTimeout: number
  // Appearance
  theme: ThemeMode
}

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  autoRunEnabled: false,
  autoRunDelay: 300,
  executionTimeout: 5,
  theme: 'dark'
}

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

/** Type definition info for a package */
export interface TypeDefInfo {
  packageName: string
  filePath: string
  content: string
}

/** Result of install/remove operation */
export interface PackageOperationResult {
  success: boolean
  name: string
  version?: string
  error?: string
}

/** Persisted app state (legacy single-file format) */
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

/** Per-tab metadata stored in the index (code lives in its own file) */
export interface TabMeta {
  name: string
  language: 'javascript' | 'typescript'
  createdAt: number
  updatedAt: number
}

/** Index file listing all tabs — code is stored in per-tab files under tabs/<id>.ts */
export interface TabIndex {
  version: number
  order: string[]
  activeTabId: string
  meta: Record<string, TabMeta>
}

/** Console methods we capture */
export type ConsoleMethod = 'log' | 'warn' | 'error' | 'info' | 'debug' | 'table' | 'clear' | 'assert' | 'time' | 'timeEnd' | 'count' | 'countReset' | 'trace' | 'dir' | 'group' | 'groupEnd'

/** A single console output entry */
export interface OutputEntry {
  id: string
  method: ConsoleMethod
  args: unknown[]
  timestamp: number
  /** 1-based source line that produced this entry (if known) */
  line?: number
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
  saveSettings: (settings: AppSettings) => void
  loadSettings: () => Promise<AppSettings | null>
  onMenuNewTab: (callback: () => void) => () => void
  onMenuCloseTab: (callback: () => void) => () => void
  onMenuRunCode: (callback: () => void) => () => void
  onMenuToggleSettings: (callback: () => void) => () => void
  onMenuToggleTheme: (callback: () => void) => () => void
  installPackage: (name: string) => Promise<PackageOperationResult>
  removePackage: (name: string) => Promise<PackageOperationResult>
  listPackages: () => Promise<InstalledPackage[]>
  searchPackages: (query: string) => Promise<PackageSearchResult[]>
  checkForUpdates: () => Promise<UpdateInfo>
  openExternal: (url: string) => void
  checkPackageUpdates: (packages: { name: string; version: string }[]) => Promise<Record<string, string>>
  getPackagePaths: () => Promise<{ npmPath: string; packagesDir: string; userDataDir: string }>
  getTypeDefs: () => Promise<TypeDefInfo[]>
  loadTabIndex: () => Promise<TabIndex | null>
  saveTabIndex: (index: TabIndex) => void
  loadTabContent: (id: string) => Promise<string | null>
  saveTabContent: (id: string, code: string) => void
  deleteTabContent: (id: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
