<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { storeToRefs } from 'pinia'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-vue-next'

const store = useSettingsStore()
const { state } = storeToRefs(store)

watch(() => state.value.ai.keys.openrouter, (newVal) => {
  store.setApiKey('openrouter', newVal)
})

watch(() => state.value.ai.keys.google, (newVal) => {
  store.setApiKey('google', newVal)
})

watch(() => state.value.ai.keys.sarvam, (newVal) => {
  store.setApiKey('sarvam', newVal)
})

// ── Key visibility toggles ──
const showKeys = ref({ openrouter: false, google: false, sarvam: false, ollamaBaseURL: false })

// ── Add Model Form ──
const newModel = ref({ provider: 'openrouter', modelId: '', label: '' })

function addModel() {
  if (!newModel.value.modelId || !newModel.value.label) return
  const id = newModel.value.label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
  state.value.ai.models.push({
    id,
    provider: newModel.value.provider,
    modelId: newModel.value.modelId,
    label: newModel.value.label
  })
  newModel.value = { provider: 'openrouter', modelId: '', label: '' }
}

function removeModel(id) {
  state.value.ai.models = state.value.ai.models.filter((m) => m.id !== id)
  // Clear any roles pointing to this model
  for (const role in state.value.ai.roles) {
    if (state.value.ai.roles[role] === id) state.value.ai.roles[role] = ''
  }
}

const providers = [
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'google', label: 'Google' },
  { id: 'ollama', label: 'Ollama (Local)' }
]

const roleLabels = {
  chat: 'Chat (Conversation)',
  tools: 'Tool Calling',
  summary: 'Summarization',
  vision: 'Vision (Browser Agent)'
}

const speakers = [
  { id: 'shubh', label: 'Shubh (Male - Default)' },
  { id: 'aditya', label: 'Aditya (Male)' },
  { id: 'rahul', label: 'Rahul (Male)' },
  { id: 'amit', label: 'Amit (Male)' },
  { id: 'ritu', label: 'Ritu (Female)' },
  { id: 'priya', label: 'Priya (Female)' },
  { id: 'neha', label: 'Neha (Female)' },
  { id: 'pooja', label: 'Pooja (Female)' },
  { id: 'simran', label: 'Simran (Female)' },
  { id: 'kavya', label: 'Kavya (Female)' }
]

const edgeVoices = [
  { id: 'en-US-AriaNeural', label: 'Aria (Female - US)' },
  { id: 'en-US-GuyNeural', label: 'Guy (Male - US)' },
  { id: 'en-US-JennyNeural', label: 'Jenny (Female - US)' },
  { id: 'en-US-ChristopherNeural', label: 'Christopher (Male - US)' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia (Female - UK)' },
  { id: 'en-GB-RyanNeural', label: 'Ryan (Male - UK)' },
  { id: 'en-IN-NeerjaNeural', label: 'Neerja (Female - India)' },
  { id: 'en-IN-PrabhatNeural', label: 'Prabhat (Male - India)' },
  { id: 'hi-IN-SwaraNeural', label: 'Swara (Female - Hindi)' },
  { id: 'hi-IN-MadhurNeural', label: 'Madhur (Male - Hindi)' },
  { id: 'en-AU-NatashaNeural', label: 'Natasha (Female - AU)' },
  { id: 'en-AU-WilliamNeural', label: 'William (Male - AU)' }
]
</script>

<template>
  <div class="settings-content">
    <h2>AI Configuration</h2>

    <!-- API Keys -->
    <div class="section">
      <h3>API Keys</h3>
      <div class="key-row" v-for="p in providers.filter((p) => p.id !== 'ollama')" :key="p.id">
        <label>{{ p.label }}</label>
        <div class="key-input-wrap">
          <input
            :type="showKeys[p.id] ? 'text' : 'password'"
            v-model="state.ai.keys[p.id]"
            :placeholder="`Enter ${p.label} API key`"
            class="key-input"
          />
          <button class="key-toggle" @click="showKeys[p.id] = !showKeys[p.id]">
            <component :is="showKeys[p.id] ? EyeOff : Eye" :size="14" />
          </button>
        </div>
      </div>
      <div class="key-row">
        <label>Ollama Base URL</label>
        <div class="key-input-wrap">
          <input
            type="text"
            v-model="state.ai.keys.ollamaBaseURL"
            placeholder="http://localhost:11434/api"
            class="key-input"
          />
        </div>
      </div>
      <div class="key-row" v-if="state.ai.tts.provider === 'sarvam'">
        <label>Sarvam AI (Voice)</label>
        <div class="key-input-wrap">
          <input
            :type="showKeys.sarvam ? 'text' : 'password'"
            v-model="state.ai.keys.sarvam"
            placeholder="Enter Sarvam API key"
            class="key-input"
          />
          <button class="key-toggle" @click="showKeys.sarvam = !showKeys.sarvam">
            <component :is="showKeys.sarvam ? EyeOff : Eye" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Model Registry -->
    <div class="section">
      <h3>Models</h3>
      <div v-if="state.ai.models.length" class="model-list">
        <div v-for="m in state.ai.models" :key="m.id" class="model-card">
          <div class="model-info">
            <span class="model-label">{{ m.label }}</span>
            <span class="model-meta">{{ m.provider }} · {{ m.modelId }}</span>
          </div>
          <button class="model-remove" @click="removeModel(m.id)">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
      <div v-else class="empty-state">No models added yet</div>

      <!-- Add Model Form -->
      <div class="add-model-form">
        <select v-model="newModel.provider" class="add-select">
          <option v-for="p in providers" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
        <input
          v-model="newModel.modelId"
          type="text"
          placeholder="Model ID (e.g. anthropic/claude-3.5-sonnet)"
          class="add-input"
        />
        <input
          v-model="newModel.label"
          type="text"
          placeholder="Display name"
          class="add-input add-input-sm"
        />
        <button class="add-btn" @click="addModel" :disabled="!newModel.modelId || !newModel.label">
          <Plus :size="16" />
        </button>
      </div>
    </div>

    <!-- TTS Configuration -->
    <div class="section">
      <h3>Text-to-Speech</h3>
      <p class="section-desc">Customize Aura's voice engine and speech style.</p>

      <div class="role-row">
        <label>TTS Provider</label>
        <select v-model="state.ai.tts.provider">
          <option value="sarvam">Sarvam AI (Indian voices, needs API key)</option>
          <option value="edge">Edge TTS (Free, no key needed)</option>
        </select>
      </div>

      <!-- Sarvam Voice Picker -->
      <div class="role-row" v-if="state.ai.tts.provider === 'sarvam'">
        <label>Voice</label>
        <select v-model="state.ai.tts.speaker">
          <option v-for="s in speakers" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </div>

      <!-- Edge Voice Picker -->
      <div class="role-row" v-if="state.ai.tts.provider === 'edge'">
        <label>Voice</label>
        <select v-model="state.ai.tts.edgeVoice">
          <option v-for="v in edgeVoices" :key="v.id" :value="v.id">{{ v.label }}</option>
        </select>
      </div>
    </div>

    <!-- Role Assignment -->
    <div class="section">
      <h3>Model Routing</h3>
      <p class="section-desc">Assign which model handles each task type.</p>
      <div class="role-row" v-for="(label, role) in roleLabels" :key="role">
        <label>{{ label }}</label>
        <select v-model="state.ai.roles[role]">
          <option value="">None</option>
          <option v-for="m in state.ai.models" :key="m.id" :value="m.id">
            {{ m.label }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #fff;
  letter-spacing: -0.5px;
}

h3 {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section {
  margin-bottom: 32px;
}

.section-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  margin: -8px 0 14px;
}

/* ── API Keys ── */
.key-row {
  margin-bottom: 12px;
}

.key-row label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 6px;
  font-weight: 500;
}

.key-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.key-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 9px 12px;
  border-radius: 8px;
  outline: none;
  font-size: 13px;
  font-family: 'JetBrains Mono', 'Inter', monospace;
  transition: border-color 0.2s;
}

.key-input:focus {
  border-color: #cdc6f7;
}

.key-toggle {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}

.key-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #cdc6f7;
}

/* ── Model List ── */
.model-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.model-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  transition: border-color 0.12s;
}

.model-card:hover {
  border-color: rgba(205, 198, 247, 0.15);
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-label {
  font-size: 13px;
  font-weight: 600;
  color: #e0daf7;
}

.model-meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'JetBrains Mono', monospace;
}

.model-remove {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}

.model-remove:hover {
  background: rgba(255, 80, 80, 0.12);
  color: #ff7b7b;
}

.empty-state {
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.06);
  margin-bottom: 12px;
}

/* ── Add Model Form ── */
.add-model-form {
  display: flex;
  gap: 6px;
  align-items: center;
}

.add-select {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  outline: none;
  font-size: 12px;
  width: 120px;
  flex-shrink: 0;
}

.add-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  outline: none;
  font-size: 12px;
  transition: border-color 0.2s;
}

.add-input:focus {
  border-color: #cdc6f7;
}

.add-input-sm {
  max-width: 120px;
}

.add-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(205, 198, 247, 0.1);
  border: 1px solid rgba(205, 198, 247, 0.15);
  border-radius: 8px;
  color: #cdc6f7;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}

.add-btn:hover:not(:disabled) {
  background: rgba(205, 198, 247, 0.18);
}

.add-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ── Role Assignment ── */
.role-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  margin-bottom: 8px;
}

.role-row label {
  font-size: 13px;
  color: #eee;
  font-weight: 500;
}

.role-row select {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 7px 10px;
  border-radius: 8px;
  outline: none;
  font-size: 12px;
  min-width: 160px;
}

.role-row select:focus {
  border-color: #cdc6f7;
}

/* ── TTS Sliders ── */
.slider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  margin-bottom: 8px;
}

.slider-row label {
  font-size: 13px;
  color: #eee;
  font-weight: 500;
  width: 100px;
}

.slider-row input[type='range'] {
  flex: 1;
  accent-color: #cdc6f7;
}

/* ── System Prompt ── */
.sys-prompt {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e0daf7;
  padding: 12px 14px;
  border-radius: 10px;
  outline: none;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  line-height: 1.6;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;
}

.sys-prompt:focus {
  border-color: #cdc6f7;
}

.sys-prompt::placeholder {
  color: rgba(255, 255, 255, 0.2);
}
</style>
