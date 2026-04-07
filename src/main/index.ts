import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { createRunner } from './executor/runner'
import { IPC } from '../../shared/types'
import type { RunCodePayload } from '../../shared/types'

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

// --- Code execution ---
let runner = createRunner()

ipcMain.on(IPC.RUN_CODE, (_event, payload: RunCodePayload) => {
  if (!mainWindow) return

  runner.stop() // kill any running execution
  runner = createRunner()

  runner.run(payload, {
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
