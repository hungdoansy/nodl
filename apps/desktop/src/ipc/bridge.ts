import type {
  ElectronAPI, RunCodePayload, OutputEntry, ExecutionResult,
  PersistedState, AppSettings, PackageOperationResult, InstalledPackage, PackageSearchResult, UpdateInfo
} from '../../shared/types'

function getAPI(): ElectronAPI | null {
  return window.electronAPI ?? null
}

export function runCode(payload: RunCodePayload): void {
  getAPI()?.runCode(payload)
}

export function stopExecution(): void {
  getAPI()?.stopExecution()
}

export function onOutputEntry(callback: (entry: OutputEntry) => void): () => void {
  return getAPI()?.onOutputEntry(callback) ?? (() => {})
}

export function onExecutionDone(callback: (result: ExecutionResult) => void): () => void {
  return getAPI()?.onExecutionDone(callback) ?? (() => {})
}

export function saveState(state: PersistedState): void {
  getAPI()?.saveState(state)
}

export async function loadState(): Promise<PersistedState | null> {
  return (await getAPI()?.loadState()) ?? null
}

export function saveSettings(settings: AppSettings): void {
  getAPI()?.saveSettings(settings)
}

export async function loadSettings(): Promise<AppSettings | null> {
  return (await getAPI()?.loadSettings()) ?? null
}

export function onMenuNewTab(callback: () => void): () => void {
  return getAPI()?.onMenuNewTab(callback) ?? (() => {})
}

export function onMenuCloseTab(callback: () => void): () => void {
  return getAPI()?.onMenuCloseTab(callback) ?? (() => {})
}

export function onMenuRunCode(callback: () => void): () => void {
  return getAPI()?.onMenuRunCode(callback) ?? (() => {})
}

export function onMenuToggleSettings(callback: () => void): () => void {
  return getAPI()?.onMenuToggleSettings(callback) ?? (() => {})
}

export function onMenuToggleTheme(callback: () => void): () => void {
  return getAPI()?.onMenuToggleTheme(callback) ?? (() => {})
}

export async function installPackage(name: string): Promise<PackageOperationResult> {
  return (await getAPI()?.installPackage(name)) ?? { success: false, name, error: 'API not available' }
}

export async function removePackage(name: string): Promise<PackageOperationResult> {
  return (await getAPI()?.removePackage(name)) ?? { success: false, name, error: 'API not available' }
}

export async function listPackages(): Promise<InstalledPackage[]> {
  return (await getAPI()?.listPackages()) ?? []
}

export async function searchPackages(query: string): Promise<PackageSearchResult[]> {
  return (await getAPI()?.searchPackages(query)) ?? []
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  return (await getAPI()?.checkForUpdates()) ?? { available: false, version: '', url: '' }
}

export function openExternal(url: string): void {
  getAPI()?.openExternal(url)
}

export async function checkPackageUpdates(packages: { name: string; version: string }[]): Promise<Record<string, string>> {
  return (await getAPI()?.checkPackageUpdates(packages)) ?? {}
}

export async function getPackagePaths(): Promise<{ npmPath: string; packagesDir: string }> {
  return (await getAPI()?.getPackagePaths()) ?? { npmPath: 'unknown', packagesDir: 'unknown' }
}
