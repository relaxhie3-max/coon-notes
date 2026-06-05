import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const RecordingContext = createContext(null)

export function useRecording() {
  return useContext(RecordingContext)
}

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg']
  if (typeof MediaRecorder === 'undefined') return 'audio/mp4'
  return types.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/mp4'
}

export function RecordingProvider({ children }) {
  const [phase, setPhase] = useState('idle')
  // idle | recording | stopped | transcribing | transcribed | generating
  const [timer, setTimer] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [micDenied, setMicDenied] = useState(false)
  const [activeProperty, setActiveProperty] = useState(null)
  const [activeMode, setActiveMode] = useState('visit')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const mimeTypeRef = useRef('audio/webm')

  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  const startRecording = async (property, mode = 'visit') => {
    setError('')
    setMicDenied(false)
    setActiveProperty(property)
    setActiveMode(mode)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      mimeTypeRef.current = mimeType
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

      recorder.start(250)
      mediaRecorderRef.current = recorder
      setTimer(0)
      setTranscript('')
      setPhase('recording')
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicDenied(true)
        setPhase('transcribed') // show text entry
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
      const ext = mimeType?.includes('mp4') ? 'm4a' : mimeType?.includes('ogg') ? 'ogg' : 'webm'
      storagePath = `recordings/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('audio')
        .upload(storagePath, blob, { contentType: mimeType, upsert: true })
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

      const { data: signedData, error: signErr } = await supabase.storage
        .from('audio')
        .createSignedUrl(storagePath, 120)
      if (signErr) throw new Error(`Signed URL failed: ${signErr.message}`)

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
      if (storagePath) supabase.storage.from('audio').remove([storagePath]).catch(() => {})
    }
  }

  const enterTypingMode = (property, mode = 'visit') => {
    setActiveProperty(property)
    setActiveMode(mode)
    setTranscript('')
    setError('')
    setTimer(0)
    setPhase('transcribed')
  }

  const reset = () => {
    setPhase('idle')
    setTranscript('')
    setError('')
    setTimer(0)
    setMicDenied(false)
    setActiveProperty(null)
    setActiveMode('visit')
  }

  return (
    <RecordingContext.Provider value={{
      phase, timer, transcript, error, micDenied,
      activeProperty, activeMode,
      setTranscript, setPhase, setError,
      startRecording, stopRecording, enterTypingMode, reset,
    }}>
      {children}
    </RecordingContext.Provider>
  )
}
