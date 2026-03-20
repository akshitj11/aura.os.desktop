import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/ipc-types.js'

const api = {
  auraKeys: {
    get: (provider) => ipcRenderer.invoke(IPC_CHANNELS.KEY_GET, provider),
    set: (provider, value) => ipcRenderer.invoke(IPC_CHANNELS.KEY_SET, provider, value),
    delete: (provider) => ipcRenderer.invoke(IPC_CHANNELS.KEY_DELETE, provider),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.KEY_GET_ALL)
  },
  auraState: {
    load: () => ipcRenderer.invoke(IPC_CHANNELS.STATE_LOAD),
    save: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.STATE_SAVE, key, value)
  },
  auraChat: {
    send: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AURA_CHAT, payload),
    onToken: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_CHAT_TOKEN, (_, token) => cb(token)),
    onToolCall: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_CHAT_TOOLCALL, (_, data) => cb(data)),
    onToolResult: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_CHAT_TOOLRESULT, (_, data) => cb(data)),
    onDone: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_CHAT_DONE, (_, data) => cb(data)),
    onError: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_CHAT_ERROR, (_, err) => cb(err)),
    stop: () => ipcRenderer.send(IPC_CHANNELS.AURA_CHAT_STOP),
    removeListeners: () => {
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_CHAT_TOKEN)
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_CHAT_TOOLCALL)
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_CHAT_TOOLRESULT)
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_CHAT_DONE)
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_CHAT_ERROR)
    }
  },
  auraStt: {
    transcribe: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AURA_STT, payload)
  },
  auraVoice: {
    convo: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AURA_VOICE_CONVO, payload),
    onStatus: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_VOICE_STATUS, (_, s) => cb(s)),
    onTranscript: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_VOICE_TRANSCRIPT, (_, t) => cb(t)),
    onAiText: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_VOICE_AITEXT, (_, t) => cb(t)),
    onAudio: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_VOICE_AUDIO, (_, a) => cb(a)),
    onError: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_VOICE_ERROR, (_, e) => cb(e)),
    removeListeners: () => {
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_VOICE_STATUS)
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_VOICE_TRANSCRIPT)
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_VOICE_AITEXT)
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_VOICE_AUDIO)
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_VOICE_ERROR)
    }
  },
  auraQuestion: {
    onAsk: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_QUESTION_ASK, (_, data) => cb(data)),
    respond: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AURA_QUESTION_RESPOND, payload),
    removeListeners: () => {
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_QUESTION_ASK)
    }
  },
  auraPlugins: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_LIST),
    enable: (pluginId) => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_ENABLE, pluginId),
    disable: (pluginId) => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_DISABLE, pluginId),
    install: () => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_INSTALL)
  },
  auraBrowserAgent: {
    run: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AURA_BROWSER_AGENT, payload),
    onStatus: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_BROWSER_AGENT_STATUS, (_, data) => cb(data)),
    onDone: (cb) => ipcRenderer.on(IPC_CHANNELS.AURA_BROWSER_AGENT_DONE, (_, data) => cb(data)),
    removeListeners: () => {
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_BROWSER_AGENT_STATUS)
      ipcRenderer.removeAllListeners(IPC_CHANNELS.AURA_BROWSER_AGENT_DONE)
    }
  },
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_, data) => callback(data))
  },
  send: (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  auraSTT: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AURA_STT, payload),
  edgeTTS: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AURA_EDGE_TTS, payload),
  sarvamTTS: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AURA_SARVAM_TTS, payload)
}

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
