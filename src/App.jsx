import { useState, useEffect } from 'react'
import { RecordingProvider, useRecording } from './context/RecordingContext'
import PinScreen from './screens/PinScreen'
import HomeScreen from './screens/HomeScreen'
import AddPropertyScreen from './screens/AddPropertyScreen'
import PropertyScreen from './screens/PropertyScreen'
import RecordScreen from './screens/RecordScreen'
import ResultsScreen from './screens/ResultsScreen'

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function RecordingBanner({ navigate }) {
  const { phase, timer, activeProperty, activeMode, stopRecording } = useRecording()
  if (phase !== 'recording') return null

  return (
    <div
      style={{
        background: '#dc2626',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        gap: 10,
        flexShrink: 0,
        cursor: 'pointer',
      }}
      onClick={() => navigate('record', { property: activeProperty, mode: activeMode })}
    >
      <span style={{
        width: 10, height: 10, borderRadius: '50%', background: 'white',
        animation: 'pulse-dot 1.2s infinite', flexShrink: 0,
      }} />
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
        Recording {formatTime(timer)} — tap to return
      </span>
      <button
        style={{
          background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white',
          padding: '6px 14px', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}
        onClick={e => { e.stopPropagation(); stopRecording() }}
      >
        ■ Stop
      </button>
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}

function AppInner() {
  const [authed, setAuthed] = useState(false)
  const [screen, setScreen] = useState('home')
  const [params, setParams] = useState({})

  useEffect(() => {
    if (sessionStorage.getItem('fn_authed') === 'true') setAuthed(true)
  }, [])

  const navigate = (to, p = {}) => {
    setScreen(to)
    setParams(p)
  }

  if (!authed) {
    return (
      <PinScreen onAuth={() => {
        sessionStorage.setItem('fn_authed', 'true')
        setAuthed(true)
      }} />
    )
  }

  const renderScreen = () => {
    switch (screen) {
      case 'home':        return <HomeScreen navigate={navigate} />
      case 'addProperty': return <AddPropertyScreen navigate={navigate} />
      case 'property':    return <PropertyScreen navigate={navigate} property={params.property} />
      case 'record':      return <RecordScreen navigate={navigate} property={params.property} mode={params.mode || 'visit'} />
      case 'results':     return <ResultsScreen navigate={navigate} property={params.property} transcript={params.transcript} notes={params.notes} mode={params.mode || 'visit'} />
      default:            return <HomeScreen navigate={navigate} />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RecordingBanner navigate={navigate} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderScreen()}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <RecordingProvider>
      <AppInner />
    </RecordingProvider>
  )
}
