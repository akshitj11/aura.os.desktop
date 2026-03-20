import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const state = reactive({
    general: {
      language: 'English',
      launchOnStartup: true
    },
    appearance: {
      theme: 'Dark',
      transparency: 0.8,
      accentColor: '#CDC6F7'
    },
    ai: {
      keys: {
        openrouter: '',
        google: '',
        sarvam: '',
        ollamaBaseURL: 'http://localhost:11434/api'
      },
      models: [],
      roles: {
        chat: '',
        tools: '',
        summary: '',
        vision: ''
      },
      tts: {
        provider: 'sarvam',
        speaker: 'shubh',
        edgeVoice: 'hi-IN-MadhurNeural',
        pitch: 0,
        pace: 1.0,
        loudness: 1.0
      },
      systemPrompt:
        'You are Aura, a helpful AI assistant embedded in Aura OS — a creative desktop environment. Be concise, warm, and helpful. You can include emotion hints like [emotion:thinking], [emotion:happy], [emotion:surprised] in your responses to express your emotional state.'
    },
    about: {
      version: '1.0.0'
    }
  })

  // ── Persistence ────────────────────────────────────────────
  async function loadState() {
    if (!window.api || !window.api.auraState) return
    const saved = await window.api.auraState.load()
    if (saved && saved.settings) {
      if (saved.settings.general) state.general = { ...state.general, ...saved.settings.general }
      if (saved.settings.appearance)
        state.appearance = { ...state.appearance, ...saved.settings.appearance }
      if (saved.settings.ai) {
        if (saved.settings.ai.keys) state.ai.keys = { ...state.ai.keys, ...saved.settings.ai.keys }
        if (saved.settings.ai.models) state.ai.models = saved.settings.ai.models
        if (saved.settings.ai.roles)
          state.ai.roles = { ...state.ai.roles, ...saved.settings.ai.roles }
        if (saved.settings.ai.tts) state.ai.tts = { ...state.ai.tts, ...saved.settings.ai.tts }
        if (saved.settings.ai.systemPrompt) state.ai.systemPrompt = saved.settings.ai.systemPrompt
      }
    }

    if (window.api.auraKeys) {
      const encryptedKeys = await window.api.auraKeys.getAll()
      if (encryptedKeys) {
        state.ai.keys = { ...state.ai.keys, ...encryptedKeys }
      }
    }
  }

  function saveState() {
    if (!window.api || !window.api.auraState) return
    const stateToSave = JSON.parse(JSON.stringify(state))
    
    if (stateToSave.ai && stateToSave.ai.keys) {
      const { openrouter, google, sarvam, ...rest } = stateToSave.ai.keys
      stateToSave.ai.keys = rest
    }
    
    window.api.auraState.save('settings', stateToSave)
  }

  // Auto-save on any change
  watch(
    state,
    () => {
      saveState()
    },
    { deep: true }
  )

  // Load on init
  loadState()

  // ── Actions ────────────────────────────────────────────────
  function setSetting(category, key, value) {
    if (state[category]) {
      state[category][key] = value
    }
  }

  async function setApiKey(provider, value) {
    if (window.api && window.api.auraKeys) {
      await window.api.auraKeys.set(provider, value)
      state.ai.keys[provider] = value
    }
  }

  return {
    state,
    setSetting,
    loadState,
    setApiKey
  }
})
