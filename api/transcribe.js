import OpenAI from 'openai'
import { writeFileSync, createReadStream, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
})

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let tmpFile = null

  try {
    const { audio, mimeType } = req.body

    if (!audio) return res.status(400).json({ error: 'No audio provided' })

    const buffer = Buffer.from(audio, 'base64')
    const ext = mimeType?.includes('mp4') ? 'm4a' : mimeType?.includes('ogg') ? 'ogg' : 'webm'

    // Write to a temp file so the OpenAI SDK gets a proper ReadStream with a filename
    tmpFile = join(tmpdir(), `fn-audio-${Date.now()}.${ext}`)
    writeFileSync(tmpFile, buffer)

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tmpFile),
      model: 'whisper-1',
      language: 'en',
    })

    res.status(200).json({ transcript: transcription.text })
  } catch (err) {
    console.error('Transcription error:', err?.message || err)
    res.status(500).json({ error: err?.message || 'Transcription failed' })
  } finally {
    if (tmpFile) try { unlinkSync(tmpFile) } catch {}
  }
}
