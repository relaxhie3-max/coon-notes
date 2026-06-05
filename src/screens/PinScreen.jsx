import { useRef, useState } from 'react'

export default function PinScreen({ onAuth }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = digit
    setDigits(next)
    setError(false)

    if (digit && i < 3) {
      refs[i + 1].current.focus()
    }

    if (digit && i === 3) {
      const pin = [...next].join('')
      const expected = import.meta.env.VITE_APP_PIN || ''
      if (pin === expected) {
        onAuth()
      } else {
        setError(true)
        setShake(true)
        setTimeout(() => {
          setDigits(['', '', '', ''])
          setShake(false)
          refs[0].current.focus()
        }, 600)
      }
    }
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current.focus()
    }
  }

  const handleFocus = (e) => e.target.select()

  return (
    <div className="pin-screen">
      <img
        src="/icons/icon-192.png"
        alt="Raccoon Notes"
        style={{ width: 96, height: 96, borderRadius: 22, marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
      />
      <h1 className="pin-title">Raccoon Notes</h1>
      <p className="pin-subtitle">Enter your PIN to continue</p>

      <div
        className="pin-inputs"
        style={shake ? { animation: 'shake 0.5s ease' } : {}}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            className="pin-input"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            autoFocus={i === 0}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onFocus={handleFocus}
            aria-label={`PIN digit ${i + 1}`}
          />
        ))}
      </div>

      {error && <p className="pin-error">Incorrect PIN — try again</p>}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
