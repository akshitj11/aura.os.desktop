import { safeStorage, app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

const KEYS_FILE = path.join(app.getPath('userData'), 'keys.enc')
const STATE_FILE = path.join(app.getPath('userData'), 'aura-state.json')

let keysCache = null

async function loadKeys() {
  if (keysCache !== null) return keysCache

  try {
    const encrypted = await fs.readFile(KEYS_FILE, 'utf-8')
    const buffer = Buffer.from(encrypted, 'base64')
    const decrypted = safeStorage.decryptString(buffer)
    keysCache = JSON.parse(decrypted)
    return keysCache
  } catch (err) {
    keysCache = {}
    return keysCache
  }
}

async function saveKeys(keys) {
  const json = JSON.stringify(keys)
  const encrypted = safeStorage.encryptString(json)
  const base64 = encrypted.toString('base64')
  await fs.writeFile(KEYS_FILE, base64, 'utf-8')
  keysCache = keys
}

export async function getKey(provider) {
  const keys = await loadKeys()
  return keys[provider] || ''
}

export async function setKey(provider, value) {
  const keys = await loadKeys()
  keys[provider] = value
  await saveKeys(keys)
}

export async function deleteKey(provider) {
  const keys = await loadKeys()
  delete keys[provider]
  await saveKeys(keys)
}

export async function getAllKeys() {
  return await loadKeys()
}

export async function migrateLegacyKeys() {
  try {
    const stateData = await fs.readFile(STATE_FILE, 'utf-8')
    const state = JSON.parse(stateData)
    
    if (state?.settings?.ai?.keys) {
      const legacyKeys = state.settings.ai.keys
      const hasKeys = Object.keys(legacyKeys).some(k => 
        k !== 'ollamaBaseURL' && legacyKeys[k] && legacyKeys[k].trim() !== ''
      )
      
      if (hasKeys) {
        const keysToMigrate = { ...legacyKeys }
        delete keysToMigrate.ollamaBaseURL
        
        await saveKeys(keysToMigrate)
        
        state.settings.ai.keys = {
          ollamaBaseURL: legacyKeys.ollamaBaseURL || 'http://localhost:11434/api'
        }
        await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2))
        
        return true
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('[KeyStore] Migration error:', err)
    }
  }
  
  return false
}
