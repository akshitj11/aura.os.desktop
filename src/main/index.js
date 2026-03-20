import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { handleChat, handleSTT, handleVoiceConvo } from './ai-service.js'
import { PluginManager } from './plugin-system/plugin-manager.js'
import { getKey, setKey, deleteKey, getAllKeys, migrateLegacyKeys } from './lib/keyStore.js'

// Initialize plugin manager
const pluginManager = new PluginManager()

function createWindow() {
  // Determine icon path for each platform
  let winIcon = undefined
  if (process.platform === 'darwin') {
    winIcon = join(__dirname, '../../build/icon.icns')
  } else if (process.platform === 'win32') {
    winIcon = join(__dirname, '../../build/icon.ico')
  } else if (process.platform === 'linux') {
    winIcon = join(__dirname, '../../build/icon.png')
  }
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    menuBarVisible: false,
    show: false,
    autoHideMenuBar: true,
    icon: winIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // ── Key Management ─────────────────────────────────────────
  await migrateLegacyKeys()

  ipcMain.handle('key:get', async (_, provider) => {
    return await getKey(provider)
  })

  ipcMain.handle('key:set', async (_, provider, value) => {
    await setKey(provider, value)
    return true
  })

  ipcMain.handle('key:delete', async (_, provider) => {
    await deleteKey(provider)
    return true
  })

  ipcMain.handle('key:getAll', async () => {
    return await getAllKeys()
  })

  // ── State Persistence ──────────────────────────────────────
  const STATE_PATH = path.join(app.getPath('userData'), 'aura-state.json')

  ipcMain.handle('state:load', async () => {
    try {
      const data = await fs.readFile(STATE_PATH, 'utf-8')
      return JSON.parse(data)
    } catch (e) {
      return {} // return empty if file doesn't exist or error
    }
  })

  ipcMain.handle('state:save', async (_, key, value) => {
    try {
      let current = {}
      try {
        const fileContent = await fs.readFile(STATE_PATH, 'utf-8')
        current = JSON.parse(fileContent)
      } catch (e) {
        // file doesn't exist or is invalid, start fresh
      }

      current[key] = value
      await fs.writeFile(STATE_PATH, JSON.stringify(current, null, 2))
      return true
    } catch (e) {
      console.error('Failed to save state:', e)
      return false
    }
  })

  // ── AI Chat ───────────────────────────────────────────────
  ipcMain.handle('aura:chat', async (event, payload) => {
    await handleChat({
      messages: payload.messages,
      role: payload.role || 'chat',
      settings: payload.settings,
      sender: event.sender
    })
  })

  // ── Speech-to-Text ────────────────────────────────────────
  ipcMain.handle('aura:stt', async (_, payload) => {
    return await handleSTT({
      audioBase64: payload.audioBase64,
      sarvamKey: payload.sarvamKey,
      languageCode: payload.languageCode
    })
  })

  // ── Edge TTS ──────────────────────────────────────────────
  ipcMain.handle('aura:edge:tts', async (_, payload) => {
    const { handleEdgeTTS } = await import('./ai-service.js')
    return await handleEdgeTTS({
      text: payload.text,
      voice: payload.voice
    })
  })

  // ── Sarvam TTS ────────────────────────────────────────────
  ipcMain.handle('aura:sarvam:tts', async (_, payload) => {
    const { handleTTS } = await import('./ai-service.js')
    return await handleTTS({
      text: payload.text,
      sarvamKey: payload.sarvamKey,
      languageCode: 'en-IN',
      speaker: payload.speaker
    })
  })

  // ── Voice-to-Voice Conversation ───────────────────────────
  ipcMain.handle('aura:voice:convo', async (event, payload) => {
    await handleVoiceConvo({
      audioBase64: payload.audioBase64,
      settings: payload.settings,
      messages: payload.messages || [],
      sender: event.sender
    })
  })

  // ── Question System ───────────────────────────────────────
  ipcMain.handle('aura:question:respond', async (_, payload) => {
    const { questionManager } = await import('./question-manager.js')
    questionManager.resolveQuestion(payload.questionId, payload.response)
  })

  // ── Browser Agent ─────────────────────────────────────────
  ipcMain.handle('aura:browser:agent', async (event, payload) => {
    const { runBrowserAgent } = await import('./browser-agent.js')
    const { resolveModel } = await import('./ai-service.js')
    return await runBrowserAgent({
      task: payload.task,
      startUrl: payload.startUrl,
      headless: payload.headless || false,
      settings: payload.settings,
      resolveModel,
      sender: event.sender
    })
  })

  // ── Plugin System ─────────────────────────────────────────
  // Initialize plugins
  pluginManager.initialize().catch((err) => {
    console.error('[Main] Failed to initialize plugins:', err)
  })

  // Plugin IPC handlers
  ipcMain.handle('plugin:list', async () => {
    return pluginManager.getInstalledPlugins().map((p) => ({
      id: p.id,
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description,
      author: p.manifest.author,
      enabled: p.enabled,
      loaded: p.loaded,
      error: p.error
    }))
  })

  ipcMain.handle('plugin:enable', async (_, pluginId) => {
    try {
      await pluginManager.enablePlugin(pluginId)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('plugin:disable', async (_, pluginId) => {
    try {
      await pluginManager.disablePlugin(pluginId)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('plugin:install', async () => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Plugin Folder',
      buttonLabel: 'Install Plugin'
    })

    if (result.canceled || !result.filePaths.length) {
      return { success: false, canceled: true }
    }

    const sourcePath = result.filePaths[0]
    return await pluginManager.installPlugin(sourcePath)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Shutdown plugins
  pluginManager.shutdown().catch((err) => {
    console.error('[Main] Failed to shutdown plugins:', err)
  })

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
