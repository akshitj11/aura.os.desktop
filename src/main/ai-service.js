import { streamText, generateText, stepCountIs } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOllama } from 'ai-sdk-ollama'
import { EdgeTTS } from 'edge-tts-universal'
import { getAllKeys } from './lib/keyStore.js'

// ── Provider factory ──────────────────────────────────────────
export function createProvider(modelEntry, keys) {
  if (modelEntry.provider === 'openrouter') {
    const openrouter = createOpenRouter({
      apiKey: keys.openrouter
    })
    return openrouter.chat(modelEntry.modelId)
  }

  if (modelEntry.provider === 'google') {
    const google = createGoogleGenerativeAI({
      apiKey: keys.google
    })
    return google(modelEntry.modelId)
  }

  if (modelEntry.provider === 'ollama') {
    // ai-sdk-ollama expects the root URL, not the /api endpoint
    let baseUrl = !keys.ollamaBaseURL || keys.ollamaBaseURL.trim() === ''
      ? 'http://localhost:11434'
      : keys.ollamaBaseURL
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 4)
    }

    const ollama = createOllama({
      baseURL: baseUrl
    })
    return ollama(modelEntry.modelId)
  }

  throw new Error(`Unknown provider: ${modelEntry.provider}`)
}

// ── Resolve model from role ───────────────────────────────────
export async function resolveModel(role, settings) {
  const modelId = settings.roles[role]
  if (!modelId) throw new Error(`No model assigned to role "${role}"`)

  const entry = settings.models.find((m) => m.id === modelId)
  if (!entry) throw new Error(`Model "${modelId}" not found in registry`)

  const keys = await getAllKeys()
  const mergedKeys = { ...keys, ollamaBaseURL: settings.keys?.ollamaBaseURL }
  return createProvider(entry, mergedKeys)
}

import { auraTools, setChatContext } from './tools.js'

// ── Unified System Prompt ─────────────────────────────────────
function getSystemPrompt(settings, mode) {
  if (settings.systemPrompt) return settings.systemPrompt

  const isVoice = mode === 'voice'

  return `You are Aura, an advanced AI agent embedded deep within Aura OS - a sleek, next-generation desktop environment.

# Core Identity
You are highly intelligent, autonomous, and proactive. Your purpose is to assist the user by directly interacting with their desktop environment, analyzing information, and solving problems. Maintain a warm, extremely concise, and genuinely helpful personality while working with professional engineering precision.
You have access to a suite of system tools capable of modifying the desktop canvas via widgets, interacting with the environment, and fetching data. Be creative and proactively use these tools to build beautiful dashboards without being explicitly commanded.

# Autonomous Tool Execution & Self-Correction
You run within an autonomous execution loop. This means you do not need the user to fix your mistakes.
CRITICAL INSTRUCTION: If a tool call fails or returns a validation error:
1. DO NOT apologize to the user or output conversational text. Generating conversational text will break the autonomous loop.
2. Carefully analyze the specific error returned by the tool (e.g. JSON schema mismatch, invalid syntax, or missing properties).
3. Self-correct your parameters and IMMEDIATELY call the tool again with the fixed syntax.
4. You must autonomously evaluate and retry until the operation succeeds. Only report a failure to the user if you have tried multiple different fixes and remain completely blocked.
5. Hide your internal retries from the user. Only present the final successful outcome in your text response *after* the tools succeed.

# Communication Guidelines
${
  isVoice
    ? '- VOICE MODE: Your responses will be read aloud by a Text-To-Speech engine. You MUST keep your text responses extremely brief (1-3 sentences maximum). Get straight to the point. Avoid conversational filler, symbols, complex formatting, bullet points, or code blocks.'
    : '- CHAT MODE: Use GitHub-flavored Markdown. Be detailed when necessary, but always prioritize concise, actionable information.'
}`
}

// ── Stream chat ───────────────────────────────────────────────
export async function handleChat({ messages, role = 'chat', settings, sender }) {
  try {
    const model = await resolveModel(role, settings)
    setChatContext({ settings, sender })

    const systemPrompt = getSystemPrompt(settings, 'chat')

    const result = streamText({
      model,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: auraTools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(10)
    })

    // Use fullStream to capture tool calls, results, and text
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          sender.send('aura:chat:token', part.delta)
          break
        case 'tool-call':
          sender.send('aura:chat:toolcall', {
            toolName: part.toolName,
            toolCallId: part.toolCallId,
            args: part.input
          })
          break
        case 'tool-result':
          sender.send('aura:chat:toolresult', {
            toolName: part.toolName,
            toolCallId: part.toolCallId,
            args: part.input,
            result: part.output
          })
          break
        case 'error':
          console.error('[AI Stream Error]', part.error)
          break
      }
    }

    // Get final text
    const finalText = await result.text
    sender.send('aura:chat:done', { text: finalText })
  } catch (err) {
    console.error('[AI Service] Error:', err)
    sender.send('aura:chat:error', { message: err.message || 'Unknown AI error' })
  }
}

// ── Speech-to-text via Sarvam REST API ────────────────────────
export async function handleSTT({ audioBase64, sarvamKey, languageCode = 'unknown' }) {
  if (!sarvamKey) {
    const keys = await getAllKeys()
    sarvamKey = keys.sarvam
  }
  
  const formData = new FormData()

  // Convert base64 to blob
  const binaryStr = atob(audioBase64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'audio/webm' })
  formData.append('file', blob, 'recording.webm')
  formData.append('model', 'saaras:v3')
  formData.append('language_code', languageCode)
  formData.append('mode', 'translit')

  const response = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: {
      'api-subscription-key': sarvamKey
    },
    body: formData
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Sarvam STT failed: ${response.status} ${errText}`)
  }

  const data = await response.json()
  return { transcript: data.transcript, languageCode: data.language_code }
}

// ── Edge TTS (free, no API key) ──────────────────────────────
export async function handleEdgeTTS({ text, voice = 'hi-IN-MadhurNeural' }) {
  const safeText =
    text && typeof text === 'string' && text.trim() ? text.trim() : 'No response available.'
  const tts = new EdgeTTS()
  await tts.synthesize(safeText, voice, { rate: '18%', pitch: '-2Hz', volume: '0%' })
  const audioBuffer = await tts.toArrayBuffer()
  const uint8 = new Uint8Array(audioBuffer)
  let binary = ''
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
  const base64 = btoa(binary)
  return { audioBase64: base64 }
}

// ── Text-to-speech via Sarvam Bulbul REST API ────────────────
export async function handleTTS({
  text,
  sarvamKey,
  languageCode = 'en-IN',
  speaker = 'anushka',
  pitch = 0,
  pace = 1.0,
  loudness = 1.0
}) {
  const response = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'api-subscription-key': sarvamKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: languageCode,
      model: 'bulbul:v3',
      speaker
      // pitch, loudness, pace not supported in v3 yet
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Sarvam TTS failed: ${response.status} ${errText}`)
  }

  const data = await response.json()
  return { audioBase64: data.audios?.[0] || '' }
}

// ── Voice-to-voice: STT → AI → TTS ──────────────────────────

export async function handleVoiceConvo({ audioBase64, settings, messages = [], sender }) {
  try {
    const keys = await getAllKeys()
    
    sender.send('aura:voice:status', 'transcribing')
    const sttResult = await handleSTT({
      audioBase64,
      sarvamKey: keys.sarvam
    })
    const userText = sttResult.transcript
    sender.send('aura:voice:transcript', userText)

    // 2. AI response (streaming with tools support)
    sender.send('aura:voice:status', 'thinking')
    const model = await resolveModel('chat', settings)
    setChatContext({ settings, sender })
    const systemPrompt = getSystemPrompt(settings, 'voice')

    // Build full conversation history: prior messages + new user message
    const fullMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userText }
    ]

    const result = streamText({
      model,
      system: systemPrompt,
      messages: fullMessages,
      tools: auraTools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(10)
    })

    // Stream tool calls in background
    ;(async () => {
      for await (const part of result.fullStream) {
        if (part.type === 'tool-call') {
          sender.send('aura:chat:toolcall', {
            toolName: part.toolName,
            toolCallId: part.toolCallId,
            args: part.input
          })
        } else if (part.type === 'tool-result') {
          sender.send('aura:chat:toolresult', {
            toolName: part.toolName,
            toolCallId: part.toolCallId,
            args: part.input,
            result: part.output
          })
        } else if (part.type === 'error') {
          console.error('[Voice AI Stream Error]', part.error)
        }
      }
    })()

    // Get final text after all steps complete
    const aiText = await result.text
    sender.send('aura:voice:aitext', aiText)

    const keys = await getAllKeys()
    
    sender.send('aura:voice:status', 'speaking')

    // Strip all markdown formatting for TTS
    let ttsText = aiText

    // Remove emotion tags: [emotion:happy]
    ttsText = ttsText.replace(/\[emotion:\w+\]/g, '')

    // Remove code blocks: ```...```
    ttsText = ttsText.replace(/```[\s\S]*?```/g, ' ')

    // Remove inline code: `...`
    ttsText = ttsText.replace(/`[^`]+`/g, ' ')

    // Remove tables (markdown tables with | separators)
    ttsText = ttsText.replace(/^\|.+\|$/gm, '')
    ttsText = ttsText.replace(/^\|[-:\s|]+\|$/gm, '')

    // Remove headers: # ## ### etc
    ttsText = ttsText.replace(/^#{1,6}\s+/gm, '')

    // Remove bold: **text** or __text__
    ttsText = ttsText.replace(/\*\*([^*]+)\*\*/g, '$1')
    ttsText = ttsText.replace(/__([^_]+)__/g, '$1')

    // Remove italic: *text* or _text_
    ttsText = ttsText.replace(/\*([^*]+)\*/g, '$1')
    ttsText = ttsText.replace(/_([^_]+)_/g, '$1')

    // Remove links: [text](url) -> text
    ttsText = ttsText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

    // Remove list markers: - * 1. 2. etc
    ttsText = ttsText.replace(/^[\s]*[-*+]\s+/gm, '')
    ttsText = ttsText.replace(/^[\s]*\d+\.\s+/gm, '')

    // Remove remaining brackets and special chars
    ttsText = ttsText.replace(/[\[\]{}()<>]/g, '')

    // Clean up multiple spaces and trim
    ttsText = ttsText.replace(/\s+/g, ' ').trim()

    // Fallback if the AI output was purely markdown/tools and resulted in an empty string
    if (!ttsText) {
      ttsText = 'Task completed.'
    }

    const ttsProvider = settings.tts?.provider || 'sarvam'
    let ttsResult

    if (ttsProvider === 'edge') {
      ttsResult = await handleEdgeTTS({
        text: ttsText,
        voice: settings.tts?.edgeVoice || 'en-US-AriaNeural'
      })
    } else {
      // Sarvam: Truncate to 500 char limit (safe buffer 450)
      if (ttsText.length > 450) {
        ttsText = ttsText.slice(0, 450) + '...'
      }
      ttsResult = await handleTTS({
        text: ttsText,
        sarvamKey: keys.sarvam,
        languageCode: 'en-IN',
        speaker: settings.tts?.speaker,
        pitch: settings.tts?.pitch,
        pace: settings.tts?.pace,
        loudness: settings.tts?.loudness
      })
    }
    sender.send('aura:voice:audio', ttsResult.audioBase64)
    sender.send('aura:voice:status', 'done')
  } catch (err) {
    console.error('[Voice Convo] Error:', err)
    sender.send('aura:voice:error', { message: err.message || 'Voice conversation failed' })
  }
}
