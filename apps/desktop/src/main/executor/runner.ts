import { fork, type ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import type { OutputEntry, ExecutionResult, RunCodePayload, WorkerMessage } from '../../../shared/types'

// In dev, electron-vite wipes out/main/ on rebuild, so we build worker.cjs
// to out/worker/ instead. In production build, it's copied alongside main.
// Uses .cjs extension so Node.js treats it as CommonJS even with "type": "module".
// In packaged app, worker.cjs is asar-unpacked so it can be forked.
// Must check unpacked path FIRST — Node's asar patch makes existsSync return
// true for files inside .asar, but child_process.fork can't spawn from asar.
function resolveWorkerPath(): string {
  const isAsar = __dirname.includes('app.asar')

  if (isAsar) {
    // Production: __dirname is inside app.asar, but worker is unpacked
    const unpackedPath = join(__dirname.replace('app.asar', 'app.asar.unpacked'), 'worker.cjs')
    if (existsSync(unpackedPath)) return unpackedPath
  }

  // Dev: worker is built to out/worker/
  const devPath = join(__dirname, '..', 'worker', 'worker.cjs')
  if (existsSync(devPath)) return devPath

  // Fallback: same dir as main
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
      let gotResult = false
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
          gotResult = true
          cleanup()
          callbacks.onDone({
            ...msg.result,
            duration: Date.now() - startTime
          })
        } else if (msg.type === 'error') {
          gotResult = true
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
        if (stopped || gotResult) return
        cleanup()
        if (code !== 0) {
          callbacks.onDone({
            success: false,
            duration: Date.now() - startTime,
            error: `Process exited with code ${code}`
          })
        } else {
          // Exit 0 but no result/error message — synthetic completion
          callbacks.onDone({
            success: true,
            duration: Date.now() - startTime
          })
        }
      })

      // Send code to worker
      child.send({ code: payload.code, language: payload.language })

      // Execution timeout
      const timeout = payload.timeout ?? DEFAULT_TIMEOUT
      timeoutId = setTimeout(() => {
        if (!stopped && !gotResult && child && !child.killed) {
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
