import { useState, useEffect } from 'react'
import { useRecording } from '../context/RecordingContext'
import CheatSheet from '../components/CheatSheet'
import { loadSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'

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

export default function RecordScreen({ navigate, property, mode = 'visit', selectedServices = [], tier = '', visitType = 'recurring' }) {
  const {
    phase, timer, transcript, error, micDenied,
    setTranscript, setPhase, setError,
    startRecording, stopRecording, startAppendRecording, enterTypingMode, reset,
  } = useRecording()

  useEffect(() => {
    // Reset to idle on fresh arrival unless a recording is actively in progress
    if (phase !== 'recording' && phase !== 'stopped' && phase !== 'transcribing') {
      reset()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── SOP check ───────────────────────────────────────────────
  const [sopFlags, setSopFlags] = useState([])   // [{sopName, flags: []}]
  const [sopChecking, setSopChecking] = useState(false)
  const [sopDismissed, setSopDismissed] = useState(false)

  useEffect(() => {
    if (phase === 'transcribed' && selectedServices.length > 0 && transcript.trim()) {
      runSopCheck()
    }
    if (phase === 'recording') {
      setSopFlags([])
      setSopDismissed(false)
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function runSopCheck() {
    setSopChecking(true)
    setSopFlags([])
    setSopDismissed(false)
    try {
      const { data: sops } = await supabase
        .from('sops')
        .select('*')
        .in('service_type', selectedServices)
        .eq('visit_type', visitType)

      const matchingSops = (sops || []).filter(sop =>
        !sop.tier || !tier || sop.tier === tier
      )

      if (!matchingSops.length) { setSopChecking(false); return }

      const results = await Promise.all(
        matchingSops.map(async (sop) => {
          try {
            const res = await fetch('/api/notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: 'sop_check', transcript, checklist: sop.checklist }),
            })
            if (!res.ok) return null
            const data = await res.json()
            return data.flags?.length ? { sopName: sop.name, flags: data.flags } : null
          } catch { return null }
        })
      )
      setSopFlags(results.filter(Boolean))
    } catch { /* silent — SOP check is non-blocking */ }
    setSopChecking(false)
  }
  // ────────────────────────────────────────────────────────────

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

            {/* SOP flags — shown only while editing transcript (not during generation) */}
            {phase === 'transcribed' && selectedServices.length > 0 && !sopDismissed && (
              <div>
                {sopChecking && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#f8fafc', borderRadius: 8,
                    padding: '10px 14px', border: '1px solid var(--border)',
                  }}>
                    <div className="spinner spinner-dark" style={{ width: 14, height: 14, borderWidth: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Checking SOPs…</span>
                  </div>
                )}
                {!sopChecking && sopFlags.length > 0 && (
                  <div style={{
                    background: '#fefce8', border: '1.5px solid #f59e0b',
                    borderRadius: 10, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>⚠️ SOP Check</span>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <button
                          onClick={runSopCheck}
                          style={{ fontSize: 12, color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >
                          Re-check
                        </button>
                        <button
                          onClick={() => setSopDismissed(true)}
                          style={{ fontSize: 18, color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {sopFlags.map(({ sopName, flags }) => (
                      <div key={sopName} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, color: '#78350f', marginBottom: 6, lineHeight: 1.5 }}>
                          Based on your <strong>{sopName}</strong> SOP, you may not have mentioned:
                        </div>
                        {flags.map((flag, i) => (
                          <div key={i} style={{ fontSize: 13, color: '#78350f', paddingLeft: 10, marginBottom: 4, lineHeight: 1.5 }}>
                            · {flag.replace(/^you may not have mentioned[:\s]*/i, '').replace(/^no mention of[:\s]*/i, '')}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
              className="btn btn-ghost btn-full"
              style={{ borderColor: '#dc2626', color: '#dc2626' }}
              onClick={startAppendRecording}
              disabled={phase === 'generating'}
            >
              🎙 Add more
            </button>

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
