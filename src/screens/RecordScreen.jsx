import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  if (typeof MediaRecorder === 'undefined') return 'audio/mp4'
  return types.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/mp4'
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <button className="btn btn-ghost btn-sm" onClick={copy} style={{ minWidth: 72 }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function RecordScreen({ navigate, property }) {
  const [phase, setPhase] = useState('idle') // idle | recording | stopped | transcribing | transcribed | generating | error
  const [timer, setTimer] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [micDenied, setMicDenied] = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        await transcribeBlob(blob, mimeType)
      }

      recorder.start(250) // collect chunks every 250ms
      mediaRecorderRef.current = recorder
      setTimer(0)
      setPhase('recording')
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicDenied(true)
      } else {
        setError(`Could not access microphone: ${err.message}`)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setPhase('stopped')
      mediaRecorderRef.current.stop()
    }
  }

  const transcribeBlob = async (blob, mimeType) => {
    setPhase('transcribing')
    let storagePath = null
    try {
      // Upload audio directly to Supabase Storage — bypasses Vercel's 4.5 MB body limit
      const ext = mimeType?.includes('mp4') ? 'm4a' : mimeType?.includes('ogg') ? 'ogg' : 'webm'
      storagePath = `recordings/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('audio')
        .upload(storagePath, blob, { contentType: mimeType, upsert: true })
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

      // Get a short-lived signed URL so the API can download it
      const { data: signedData, error: signErr } = await supabase.storage
        .from('audio')
        .createSignedUrl(storagePath, 120)
      if (signErr) throw new Error(`Signed URL failed: ${signErr.message}`)

      // Ask the API to transcribe from the URL
      const res = await fetch('/api/whisper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: signedData.signedUrl, mimeType }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error ${res.status}`)
      }
      const data = await res.json()
      setTranscript(data.transcript || '')
      setPhase('transcribed')
    } catch (err) {
      setError(`Transcription failed: ${err.message}. You can type your notes below instead.`)
      setTranscript('')
      setPhase('transcribed')
    } finally {
      // Clean up the temporary audio file
      if (storagePath) {
        supabase.storage.from('audio').remove([storagePath]).catch(() => {})
      }
    }
  }

  const generateNotes = async () => {
    if (!transcript.trim()) {
      setError('Transcript is empty. Please record audio or type your notes.')
      return
    }
    setPhase('generating')
    setError('')
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript.trim(), profile: property }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error ${res.status}`)
      }
      const notes = await res.json()
      navigate('results', { property, transcript: transcript.trim(), notes })
    } catch (err) {
      setError(`Note generation failed: ${err.message}`)
      setPhase('transcribed')
    }
  }

  const handleRecordBtn = () => {
    if (phase === 'idle' || phase === 'error') startRecording()
    else if (phase === 'recording') stopRecording()
  }

  const isRecording = phase === 'recording'
  const isLoading = phase === 'stopped' || phase === 'transcribing' || phase === 'generating'

  return (
    <div className="screen">
      <div className="header">
        <button
          className="btn btn-icon"
          onClick={() => navigate('property', { property })}
          disabled={isLoading}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: 16 }}>New Visit Note</h1>
          <div className="header-subtitle">{property.client_name}</div>
        </div>
      </div>

      <div className="scrollable">
        {/* Record area */}
        <div className="record-center">
          <div className="record-timer">
            {isRecording ? formatTime(timer) : phase === 'transcribing' ? '…' : formatTime(timer)}
          </div>

          {!micDenied && (phase === 'idle' || phase === 'recording') && (
            <>
              <button
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={handleRecordBtn}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? '■' : '🎙'}
              </button>
              <p className="record-hint">
                {isRecording
                  ? 'Tap to stop'
                  : 'Tap to start recording your field notes'}
              </p>
              {!isRecording && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 4 }}
                  onClick={() => setPhase('transcribed')}
                >
                  ✏️ Type instead
                </button>
              )}
            </>
          )}

          {(phase === 'stopped' || phase === 'transcribing') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="spinner spinner-dark" style={{ width: 40, height: 40, borderWidth: 4 }} />
              <p className="record-hint">Transcribing audio…</p>
            </div>
          )}

          {phase === 'generating' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="spinner spinner-dark" style={{ width: 40, height: 40, borderWidth: 4 }} />
              <p className="record-hint">Generating notes with AI…</p>
            </div>
          )}
        </div>

        {/* Mic denied fallback */}
        {micDenied && (
          <div className="pad">
            <div className="error-box" style={{ marginBottom: 16 }}>
              Microphone access denied. Enable it in Settings → Safari → Microphone, or type your notes below.
            </div>
          </div>
        )}

        {/* Transcript / manual entry */}
        {(phase === 'transcribed' || phase === 'generating' || micDenied) && (
          <div className="pad gap">
            {error && <div className="error-box">{error}</div>}

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label" htmlFor="transcript" style={{ margin: 0 }}>
                  {phase === 'transcribed' && !error ? 'Transcript — review and edit before generating' : 'Type your field notes'}
                </label>
                {transcript && (
                  <CopyButton text={transcript} />
                )}
              </div>
              <textarea
                id="transcript"
                className="textarea"
                style={{ minHeight: 200, fontSize: 15 }}
                placeholder="Speak during recording, or type your field notes here…"
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                disabled={phase === 'generating'}
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={generateNotes}
              disabled={phase === 'generating' || !transcript.trim()}
            >
              {phase === 'generating'
                ? <><span className="spinner" /> Generating…</>
                : '✨ Generate Notes'}
            </button>

            {(phase === 'transcribed' || micDenied) && (
              <button
                className="btn btn-ghost btn-full"
                onClick={() => {
                  setPhase('idle')
                  setTranscript('')
                  setTimer(0)
                  setError('')
                  setMicDenied(false)
                }}
              >
                Start over
              </button>
            )}
          </div>
        )}

        {/* Error on idle/recording phase */}
        {error && phase !== 'transcribed' && !micDenied && (
          <div className="pad">
            <div className="error-box">{error}</div>
          </div>
        )}
      </div>
    </div>
  )
}
