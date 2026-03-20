export const IPC_CHANNELS = {
  STATE_LOAD: 'state:load',
  STATE_SAVE: 'state:save',
  
  KEY_GET: 'key:get',
  KEY_SET: 'key:set',
  KEY_DELETE: 'key:delete',
  KEY_GET_ALL: 'key:getAll',
  
  AURA_CHAT: 'aura:chat',
  AURA_CHAT_STOP: 'aura:chat:stop',
  AURA_CHAT_TOKEN: 'aura:chat:token',
  AURA_CHAT_TOOLCALL: 'aura:chat:toolcall',
  AURA_CHAT_TOOLRESULT: 'aura:chat:toolresult',
  AURA_CHAT_DONE: 'aura:chat:done',
  AURA_CHAT_ERROR: 'aura:chat:error',
  
  AURA_STT: 'aura:stt',
  
  AURA_EDGE_TTS: 'aura:edge:tts',
  AURA_SARVAM_TTS: 'aura:sarvam:tts',
  
  AURA_VOICE_CONVO: 'aura:voice:convo',
  AURA_VOICE_STATUS: 'aura:voice:status',
  AURA_VOICE_TRANSCRIPT: 'aura:voice:transcript',
  AURA_VOICE_AITEXT: 'aura:voice:aitext',
  AURA_VOICE_AUDIO: 'aura:voice:audio',
  AURA_VOICE_ERROR: 'aura:voice:error',
  
  AURA_QUESTION_ASK: 'aura:question:ask',
  AURA_QUESTION_RESPOND: 'aura:question:respond',
  
  AURA_BROWSER_AGENT: 'aura:browser:agent',
  AURA_BROWSER_AGENT_STATUS: 'aura:browser:agent:status',
  AURA_BROWSER_AGENT_DONE: 'aura:browser:agent:done',
  
  PLUGIN_LIST: 'plugin:list',
  PLUGIN_ENABLE: 'plugin:enable',
  PLUGIN_DISABLE: 'plugin:disable',
  PLUGIN_INSTALL: 'plugin:install'
}

/**
 * @typedef {Object} StateSavePayload
 * @property {string} key
 * @property {any} value
 */

/**
 * @typedef {Object} KeyGetPayload
 * @property {string} provider
 */

/**
 * @typedef {Object} KeySetPayload
 * @property {string} provider
 * @property {string} value
 */

/**
 * @typedef {Object} KeyDeletePayload
 * @property {string} provider
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} role
 * @property {string} content
 */

/**
 * @typedef {Object} ChatPayload
 * @property {ChatMessage[]} messages
 * @property {string} [role]
 * @property {Object} settings
 */

/**
 * @typedef {Object} STTPayload
 * @property {string} audioBase64
 * @property {string} sarvamKey
 * @property {string} [languageCode]
 */

/**
 * @typedef {Object} EdgeTTSPayload
 * @property {string} text
 * @property {string} [voice]
 */

/**
 * @typedef {Object} SarvamTTSPayload
 * @property {string} text
 * @property {string} sarvamKey
 * @property {string} [speaker]
 */

/**
 * @typedef {Object} VoiceConvoPayload
 * @property {string} audioBase64
 * @property {Object} settings
 * @property {ChatMessage[]} [messages]
 */

/**
 * @typedef {Object} QuestionRespondPayload
 * @property {string} questionId
 * @property {any} response
 */

/**
 * @typedef {Object} BrowserAgentPayload
 * @property {string} task
 * @property {string} [startUrl]
 * @property {boolean} [headless]
 * @property {Object} settings
 */

/**
 * @typedef {Object} PluginEnablePayload
 * @property {string} pluginId
 */

/**
 * @typedef {Object} PluginDisablePayload
 * @property {string} pluginId
 */

export const IPC_SCHEMAS = {
  [IPC_CHANNELS.STATE_SAVE]: {
    validate: (payload) => {
      if (!payload || typeof payload !== 'object') return false
      return true
    }
  },
  [IPC_CHANNELS.KEY_GET]: {
    validate: (provider) => {
      return typeof provider === 'string' && provider.length > 0
    }
  },
  [IPC_CHANNELS.KEY_SET]: {
    validate: (provider, value) => {
      return typeof provider === 'string' && provider.length > 0 && typeof value === 'string'
    }
  },
  [IPC_CHANNELS.KEY_DELETE]: {
    validate: (provider) => {
      return typeof provider === 'string' && provider.length > 0
    }
  },
  [IPC_CHANNELS.AURA_CHAT]: {
    validate: (payload) => {
      if (!payload || typeof payload !== 'object') return false
      if (!Array.isArray(payload.messages)) return false
      if (!payload.settings || typeof payload.settings !== 'object') return false
      return true
    }
  },
  [IPC_CHANNELS.AURA_STT]: {
    validate: (payload) => {
      if (!payload || typeof payload !== 'object') return false
      if (typeof payload.audioBase64 !== 'string') return false
      return true
    }
  },
  [IPC_CHANNELS.AURA_EDGE_TTS]: {
    validate: (payload) => {
      if (!payload || typeof payload !== 'object') return false
      if (typeof payload.text !== 'string') return false
      return true
    }
  },
  [IPC_CHANNELS.AURA_SARVAM_TTS]: {
    validate: (payload) => {
      if (!payload || typeof payload !== 'object') return false
      if (typeof payload.text !== 'string') return false
      return true
    }
  },
  [IPC_CHANNELS.AURA_VOICE_CONVO]: {
    validate: (payload) => {
      if (!payload || typeof payload !== 'object') return false
      if (typeof payload.audioBase64 !== 'string') return false
      if (!payload.settings || typeof payload.settings !== 'object') return false
      return true
    }
  },
  [IPC_CHANNELS.AURA_QUESTION_RESPOND]: {
    validate: (payload) => {
      if (!payload || typeof payload !== 'object') return false
      if (typeof payload.questionId !== 'string') return false
      return true
    }
  },
  [IPC_CHANNELS.AURA_BROWSER_AGENT]: {
    validate: (payload) => {
      if (!payload || typeof payload !== 'object') return false
      if (typeof payload.task !== 'string') return false
      if (!payload.settings || typeof payload.settings !== 'object') return false
      return true
    }
  },
  [IPC_CHANNELS.PLUGIN_ENABLE]: {
    validate: (pluginId) => {
      return typeof pluginId === 'string' && pluginId.length > 0
    }
  },
  [IPC_CHANNELS.PLUGIN_DISABLE]: {
    validate: (pluginId) => {
      return typeof pluginId === 'string' && pluginId.length > 0
    }
  }
}

export function validatePayload(channel, ...args) {
  const schema = IPC_SCHEMAS[channel]
  if (!schema) return true
  
  try {
    return schema.validate(...args)
  } catch (err) {
    console.error(`[IPC Validation] Error validating ${channel}:`, err)
    return false
  }
}
