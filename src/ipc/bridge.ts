import type { ElectronAPI, RunCodePayload, OutputEntry, ExecutionResult, PersistedState } from '../../shared/types'

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
