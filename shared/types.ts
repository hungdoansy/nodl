/** IPC channel names */
export const IPC = {
  RUN_CODE: 'ipc:run-code',
  STOP_EXECUTION: 'ipc:stop-execution',
  OUTPUT_ENTRY: 'ipc:output-entry',
  EXECUTION_DONE: 'ipc:execution-done'
} as const

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
