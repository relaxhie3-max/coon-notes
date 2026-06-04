import OpenAI, { toFile } from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { audio, mimeType } = req.body

    if (!audio) return res.status(400).json({ error: 'No audio provided' })

    const buffer = Buffer.from(audio, 'base64')
    const ext = mimeType?.includes('mp4') ? 'm4a' : mimeType?.includes('ogg') ? 'ogg' : 'webm'

    const file = await toFile(buffer, `audio.${ext}`, { type: mimeType || 'audio/webm' })

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
    })

    res.status(200).json({ transcript: transcription.text })
  } catch (err) {
    console.error('Transcription error:', err)
    res.status(500).json({ error: err.message || 'Transcription failed' })
  }
}
