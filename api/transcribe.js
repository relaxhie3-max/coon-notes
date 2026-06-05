import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY environment variable is not set' })
  }

  let tmpFile = null
  try {
    const { audio, mimeType } = req.body
    if (!audio) return res.status(400).json({ error: 'No audio provided' })

    const buffer = Buffer.from(audio, 'base64')
    const ext = mimeType?.includes('mp4') ? 'm4a' : mimeType?.includes('ogg') ? 'ogg' : 'webm'

    tmpFile = join(tmpdir(), `fn-audio-${Date.now()}.${ext}`)
    writeFileSync(tmpFile, buffer)

    const fileBuffer = readFileSync(tmpFile)
    const blob = new Blob([fileBuffer], { type: mimeType || 'audio/webm' })

    const form = new FormData()
    form.append('file', blob, `audio.${ext}`)
    form.append('model', 'whisper-1')
    form.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error?.message || `OpenAI error ${response.status}`)
    }

    res.status(200).json({ transcript: data.text })
  } catch (err) {
    console.error('Transcription error:', err?.message || err)
    res.status(500).json({ error: err?.message || 'Transcription failed' })
  } finally {
    if (tmpFile) try { unlinkSync(tmpFile) } catch {}
  }
}
