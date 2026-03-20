import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  auraKeys: {
    get: (provider) => ipcRenderer.invoke('key:get', provider),
    set: (provider, value) => ipcRenderer.invoke('key:set', provider, value),
    delete: (provider) => ipcRenderer.invoke('key:delete', provider),
    getAll: () => ipcRenderer.invoke('key:getAll')
  },
  auraState: {
    load: () => ipcRenderer.invoke('state:load'),
    save: (key, value) => ipcRenderer.invoke('state:save', key, value)
  },
  auraChat: {
    send: (payload) => ipcRenderer.invoke('aura:chat', payload),
    onToken: (cb) => ipcRenderer.on('aura:chat:token', (_, token) => cb(token)),
    onToolCall: (cb) => ipcRenderer.on('aura:chat:toolcall', (_, data) => cb(data)),
    onToolResult: (cb) => ipcRenderer.on('aura:chat:toolresult', (_, data) => cb(data)),
    onDone: (cb) => ipcRenderer.on('aura:chat:done', (_, data) => cb(data)),
    onError: (cb) => ipcRenderer.on('aura:chat:error', (_, err) => cb(err)),
    stop: () => ipcRenderer.send('aura:chat:stop'),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('aura:chat:token')
      ipcRenderer.removeAllListeners('aura:chat:toolcall')
      ipcRenderer.removeAllListeners('aura:chat:toolresult')
      ipcRenderer.removeAllListeners('aura:chat:done')
      ipcRenderer.removeAllListeners('aura:chat:error')
    }
  },
  auraStt: {
    transcribe: (payload) => ipcRenderer.invoke('aura:stt', payload)
  },
  auraVoice: {
    convo: (payload) => ipcRenderer.invoke('aura:voice:convo', payload),
    onStatus: (cb) => ipcRenderer.on('aura:voice:status', (_, s) => cb(s)),
    onTranscript: (cb) => ipcRenderer.on('aura:voice:transcript', (_, t) => cb(t)),
    onAiText: (cb) => ipcRenderer.on('aura:voice:aitext', (_, t) => cb(t)),
    onAudio: (cb) => ipcRenderer.on('aura:voice:audio', (_, a) => cb(a)),
    onError: (cb) => ipcRenderer.on('aura:voice:error', (_, e) => cb(e)),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('aura:voice:status')
      ipcRenderer.removeAllListeners('aura:voice:transcript')
      ipcRenderer.removeAllListeners('aura:voice:aitext')
      ipcRenderer.removeAllListeners('aura:voice:audio')
      ipcRenderer.removeAllListeners('aura:voice:error')
    }
  },
  auraQuestion: {
    onAsk: (cb) => ipcRenderer.on('aura:question:ask', (_, data) => cb(data)),
    respond: (payload) => ipcRenderer.invoke('aura:question:respond', payload),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('aura:question:ask')
    }
  },
  auraPlugins: {
    list: () => ipcRenderer.invoke('plugin:list'),
    enable: (pluginId) => ipcRenderer.invoke('plugin:enable', pluginId),
    disable: (pluginId) => ipcRenderer.invoke('plugin:disable', pluginId),
    install: () => ipcRenderer.invoke('plugin:install')
  },
  auraBrowserAgent: {
    run: (payload) => ipcRenderer.invoke('aura:browser:agent', payload),
    onStatus: (cb) => ipcRenderer.on('aura:browser:agent:status', (_, data) => cb(data)),
    onDone: (cb) => ipcRenderer.on('aura:browser:agent:done', (_, data) => cb(data)),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('aura:browser:agent:status')
      ipcRenderer.removeAllListeners('aura:browser:agent:done')
    }
  },
  // Generic event listener for tool events
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_, data) => callback(data))
  },
  send: (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  auraSTT: (payload) => ipcRenderer.invoke('aura:stt', payload),
  edgeTTS: (payload) => ipcRenderer.invoke('aura:edge:tts', payload),
  sarvamTTS: (payload) => ipcRenderer.invoke('aura:sarvam:tts', payload)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
