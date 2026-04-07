import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { createRunner } from './executor/runner'
import { transpile } from './executor/transpiler'
import { IPC } from '../../shared/types'
import type { RunCodePayload, PersistedState } from '../../shared/types'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#18181b' // zinc-900
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// --- Persistence ---
const userDataPath = app.getPath('userData')
const stateFilePath = join(userDataPath, 'nodl-state.json')

function loadPersistedState(): PersistedState | null {
  try {
    if (existsSync(stateFilePath)) {
      const data = readFileSync(stateFilePath, 'utf-8')
      return JSON.parse(data) as PersistedState
    }
  } catch {
    // Corrupt file — return null, app will use defaults
  }
  return null
}

function savePersistedState(state: PersistedState): void {
  try {
    const dir = join(userDataPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf-8')
  } catch {
    // Silently fail — non-critical
  }
}

ipcMain.on(IPC.SAVE_STATE, (_event, state: PersistedState) => {
  savePersistedState(state)
})

ipcMain.handle(IPC.LOAD_STATE, () => {
  return loadPersistedState()
})

// --- Code execution ---
let runner = createRunner()

ipcMain.on(IPC.RUN_CODE, (_event, payload: RunCodePayload) => {
  if (!mainWindow) return

  runner.stop() // kill any running execution
  runner = createRunner()

  // Transpile TS to JS if needed
  let codeToRun = payload.code
  if (payload.language === 'typescript') {
    const result = transpile(payload.code, 'ts')
    if (result.errors.length > 0) {
      for (const err of result.errors) {
        mainWindow.webContents.send(IPC.OUTPUT_ENTRY, {
          id: `transpile-err-${Date.now()}-${err.line}`,
          method: 'error',
          args: [`TypeScript error (line ${err.line}): ${err.message}`],
          timestamp: Date.now()
        })
      }
      mainWindow.webContents.send(IPC.EXECUTION_DONE, {
        success: false,
        duration: 0,
        error: 'Transpilation failed'
      })
      return
    }
    codeToRun = result.js
  }

  runner.run({ ...payload, code: codeToRun }, {
    onOutput(entry) {
      mainWindow?.webContents.send(IPC.OUTPUT_ENTRY, entry)
    },
    onDone(result) {
      mainWindow?.webContents.send(IPC.EXECUTION_DONE, result)
    }
  })
})

ipcMain.on(IPC.STOP_EXECUTION, () => {
  runner.stop()
})

// --- App lifecycle ---
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
