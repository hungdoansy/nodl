import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { createRunner, setNodeModulesPath } from './executor/runner'
import { transpile } from './executor/transpiler'
import { installPackage, removePackage, listPackages, searchPackages, getNodeModulesPath } from './executor/package-manager'
import { IPC } from '../../shared/types'
import type { RunCodePayload, PersistedState, AppSettings } from '../../shared/types'

let mainWindow: BrowserWindow | null = null

// --- Window state persistence ---
interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

const windowStateFile = join(app.getPath('userData'), 'nodl-window-state.json')

function loadWindowState(): WindowState {
  try {
    if (existsSync(windowStateFile)) {
      return JSON.parse(readFileSync(windowStateFile, 'utf-8')) as WindowState
    }
  } catch {
    // Fall through to defaults
  }
  return { width: 1200, height: 800, isMaximized: false }
}

function saveWindowState(): void {
  if (!mainWindow) return
  try {
    const isMaximized = mainWindow.isMaximized()
    const bounds = isMaximized ? mainWindow.getNormalBounds() : mainWindow.getBounds()
    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized
    }
    writeFileSync(windowStateFile, JSON.stringify(state), 'utf-8')
  } catch {
    // Silently fail
  }
}

function createWindow(): void {
  const savedState = loadWindowState()

  mainWindow = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    ...(savedState.x !== undefined && savedState.y !== undefined
      ? { x: savedState.x, y: savedState.y }
      : {}),
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 10 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#18181b' // zinc-900
  })

  if (savedState.isMaximized) {
    mainWindow.maximize()
  }

  // Save window state on changes
  mainWindow.on('close', saveWindowState)

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

// --- Settings persistence ---
const settingsFilePath = join(userDataPath, 'nodl-settings.json')

function loadSettings(): AppSettings | null {
  try {
    if (existsSync(settingsFilePath)) {
      const data = readFileSync(settingsFilePath, 'utf-8')
      return JSON.parse(data) as AppSettings
    }
  } catch {
    // Corrupt file — return null
  }
  return null
}

function saveSettings(settings: AppSettings): void {
  try {
    writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8')
  } catch {
    // Silently fail
  }
}

ipcMain.on(IPC.SAVE_SETTINGS, (_event, settings: AppSettings) => {
  saveSettings(settings)
})

ipcMain.handle(IPC.LOAD_SETTINGS, () => {
  return loadSettings()
})

// --- Package management ---
ipcMain.handle(IPC.INSTALL_PACKAGE, (_event, name: string) => {
  return installPackage(name)
})

ipcMain.handle(IPC.REMOVE_PACKAGE, (_event, name: string) => {
  return removePackage(name)
})

ipcMain.handle(IPC.LIST_PACKAGES, () => {
  return listPackages()
})

ipcMain.handle(IPC.SEARCH_PACKAGES, (_event, query: string) => {
  return searchPackages(query)
})

// --- Code execution ---
// Set NODE_PATH so worker processes can resolve installed packages
setNodeModulesPath(getNodeModulesPath())

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

// --- App menu ---
function createAppMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            {
              label: 'Settings...',
              accelerator: 'CmdOrCtrl+,',
              click: () => mainWindow?.webContents.send(IPC.MENU_TOGGLE_SETTINGS)
            },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send(IPC.MENU_NEW_TAB)
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => mainWindow?.webContents.send(IPC.MENU_CLOSE_TAB)
        },
        { type: 'separator' },
        {
          label: 'Run Code',
          accelerator: 'CmdOrCtrl+Enter',
          click: () => mainWindow?.webContents.send(IPC.MENU_RUN_CODE)
        },
        ...(isMac ? [] : [
          { type: 'separator' as const },
          {
            label: 'Settings...',
            accelerator: 'CmdOrCtrl+,',
            click: () => mainWindow?.webContents.send(IPC.MENU_TOGGLE_SETTINGS)
          },
          { type: 'separator' as const },
          { role: 'quit' as const }
        ])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Theme',
          click: () => mainWindow?.webContents.send(IPC.MENU_TOGGLE_THEME)
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }])
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// --- App lifecycle ---
app.whenReady().then(() => {
  createAppMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
