import { fork, type ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import type { OutputEntry, ExecutionResult, RunCodePayload, WorkerMessage } from '../../../shared/types'

// In dev, electron-vite wipes out/main/ on rebuild, so we build worker.cjs
// to out/worker/ instead. In production build, it's copied alongside main.
// Uses .cjs extension so Node.js treats it as CommonJS even with "type": "module".
function resolveWorkerPath(): string {
  // Try out/worker/ first (dev-safe location)
  const devPath = join(__dirname, '..', 'worker', 'worker.cjs')
  if (existsSync(devPath)) return devPath
  // Fallback: same dir as main (production build)
  return join(__dirname, 'worker.cjs')
}

const WORKER_PATH = resolveWorkerPath()
const DEFAULT_TIMEOUT = 5000

let nodeModulesPath = ''

export function setNodeModulesPath(path: string): void {
  nodeModulesPath = path
}

interface RunnerCallbacks {
  onOutput: (entry: OutputEntry) => void
  onDone: (result: ExecutionResult) => void
}

export interface Runner {
  run: (payload: RunCodePayload, callbacks: RunnerCallbacks) => void
  stop: () => void
}

export function createRunner(): Runner {
  let child: ChildProcess | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  function cleanup(): void {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (child && !child.killed) {
      child.kill('SIGKILL')
    }
    child = null
  }

  return {
    run(payload: RunCodePayload, callbacks: RunnerCallbacks) {
      stopped = false
      const startTime = Date.now()

      child = fork(WORKER_PATH, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: {
          ...process.env,
          NODE_PATH: nodeModulesPath || process.env.NODE_PATH || ''
        }
      })

      // Forward worker stderr to main process stderr for debugging
      child.stderr?.on('data', (data: Buffer) => {
        console.error('[worker]', data.toString().trim())
      })

      child.on('message', (msg: WorkerMessage) => {
        if (stopped) return

        if (msg.type === 'console' && msg.entry) {
          callbacks.onOutput(msg.entry)
        } else if (msg.type === 'result' && msg.result) {
          cleanup()
          callbacks.onDone({
            ...msg.result,
            duration: Date.now() - startTime
          })
        } else if (msg.type === 'error') {
          cleanup()
          callbacks.onDone({
            success: false,
            duration: Date.now() - startTime,
            error: msg.result?.error || 'Unknown error'
          })
        }
      })

      child.on('error', (err) => {
        if (stopped) return
        cleanup()
        callbacks.onDone({
          success: false,
          duration: Date.now() - startTime,
          error: err.message
        })
      })

      child.on('exit', (code) => {
        if (stopped) return
        if (code !== 0 && child) {
          cleanup()
          callbacks.onDone({
            success: false,
            duration: Date.now() - startTime,
            error: `Process exited with code ${code}`
          })
        }
      })

      // Send code to worker
      child.send({ code: payload.code, language: payload.language })

      // Execution timeout
      const timeout = payload.timeout ?? DEFAULT_TIMEOUT
      timeoutId = setTimeout(() => {
        if (!stopped && child && !child.killed) {
          cleanup()
          callbacks.onOutput({
            id: `timeout-${Date.now()}`,
            method: 'error',
            args: [`Execution timed out after ${timeout}ms`],
            timestamp: Date.now()
          })
          callbacks.onDone({
            success: false,
            duration: timeout,
            error: `Execution timed out after ${timeout}ms`
          })
        }
      }, timeout)
    },

    stop() {
      stopped = true
      cleanup()
    }
  }
}
