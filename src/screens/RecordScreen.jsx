import { useState, useEffect } from 'react'
import { useRecording } from '../context/RecordingContext'
import CheatSheet from '../components/CheatSheet'
import { loadSettings } from '../lib/settings'

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
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

export default function RecordScreen({ navigate, property, mode = 'visit' }) {
  const {
    phase, timer, transcript, error, micDenied,
    setTranscript, setPhase, setError,
    startRecording, stopRecording, enterTypingMode, reset,
  } = useRecording()

  useEffect(() => {
    // Reset to idle on fresh arrival unless a recording is actively in progress
    if (phase !== 'recording' && phase !== 'stopped' && phase !== 'transcribing') {
      reset()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isRecording = phase === 'recording'
  const isLoading = phase === 'stopped' || phase === 'transcribing' || phase === 'generating'

  const handleGenerateNotes = async () => {
    if (!transcript.trim()) {
      setError('Transcript is empty — record audio or type your notes.')
      return
    }
    // navigate away to show generating state on results screen
    // but first call the API here
    setError('')
    setPhase('generating')
    try {
      const settings = await loadSettings()
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript.trim(), profile: property, mode, settings }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error ${res.status}`)
      }
      const notes = await res.json()
      setPhase('transcribed')
      navigate('results', { property, transcript: transcript.trim(), notes, mode })
    } catch (err) {
      setError(`Note generation failed: ${err.message}`)
      setPhase('transcribed')
    }
  }

  const handleRecord = () => startRecording(property, mode)

  const modeLabel = mode === 'quick_log' ? 'Quick Log' : 'New Visit Note'
  const transcriptLabel = mode === 'quick_log'
    ? 'What do you want to log?'
    : 'Transcript — review and edit before generating'

  return (
    <div className="screen">
      <div className="header">
        <button
          className="btn btn-icon"
          onClick={() => navigate('property', { property })}
          disabled={isLoading}
        >←</button>
        <div>
          <h1 style={{ fontSize: 16 }}>{modeLabel}</h1>
          <div className="header-subtitle">{property.client_name}</div>
        </div>
      </div>

      <div className="scrollable">
        <div className="record-center">
          <div className="record-timer">
            {isRecording ? formatTime(timer) : (phase === 'transcribing' ? '…' : formatTime(timer))}
          </div>

          {!micDenied && (phase === 'idle' || phase === 'recording') && (
            <>
              <button
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : handleRecord}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? '■' : '🎙'}
              </button>
              <p className="record-hint">
                {isRecording ? 'Tap to stop' : 'Tap to start recording'}
              </p>
              {!isRecording && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 4 }}
                  onClick={() => enterTypingMode(property, mode)}
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

        </div>

        {/* Cheat sheet — visible while recording */}
        {isRecording && <CheatSheet property={property} mode={mode} />}

        {micDenied && (
          <div className="pad">
            <div className="error-box">
              Microphone access denied. Enable it in Settings → Safari → Microphone, or type below.
            </div>
          </div>
        )}

        {(phase === 'transcribed' || phase === 'generating' || micDenied) && (
          <div className="pad gap">
            {error && <div className="error-box">{error}</div>}

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label" htmlFor="transcript" style={{ margin: 0 }}>
                  {transcriptLabel}
                </label>
                {transcript && phase !== 'generating' && <CopyButton text={transcript} />}
              </div>
              <textarea
                id="transcript"
                className="textarea"
                style={{ minHeight: 200, fontSize: 15, opacity: phase === 'generating' ? 0.5 : 1 }}
                placeholder={
                  mode === 'quick_log'
                    ? 'Type anything worth noting — observation, customer mention, office note…'
                    : 'Speak during recording, or type your field notes here…'
                }
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                disabled={phase === 'generating'}
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleGenerateNotes}
              disabled={!transcript.trim() || phase === 'generating'}
            >
              {phase === 'generating'
                ? <><span className="spinner" /> Generating notes…</>
                : '✨ Generate Notes'}
            </button>

            {phase !== 'generating' && (
              <button
                className="btn btn-ghost btn-full"
                onClick={() => {
                  setTranscript('')
                  setError('')
                  reset()
                }}
              >
                Start over
              </button>
            )}
          </div>
        )}

        {error && phase !== 'transcribed' && !micDenied && (
          <div className="pad"><div className="error-box">{error}</div></div>
        )}
      </div>
    </div>
  )
}
