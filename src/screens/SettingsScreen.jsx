import { useState, useEffect } from 'react'
import { TOGGLE_GROUPS, DEFAULT_TOGGLES, loadSettings, saveSettings } from '../lib/settings'

function Toggle({ label, value, onChange }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0', borderBottom: '1px solid var(--border)', gap: 12,
        cursor: 'pointer',
      }}
      onClick={() => onChange(!value)}
    >
      <span style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>
        {label}
      </span>
      <div style={{
        width: 48, height: 28, borderRadius: 14, flexShrink: 0,
        background: value ? '#1d4ed8' : '#e2e8f0',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3,
          left: value ? 23 : 3,
          width: 22, height: 22, borderRadius: '50%',
          background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  )
}

export default function SettingsScreen({ navigate }) {
  const [form, setForm] = useState({
    tech_name: '',
    tech_phone: '',
    company_name: '',
    closing_line: '',
    tone_instructions: '',
    additional_instructions: '',
    toggles: DEFAULT_TOGGLES,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSettings().then(data => {
      setForm(f => ({ ...f, ...data }))
      setLoading(false)
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setToggle = (k, v) => setForm(f => ({ ...f, toggles: { ...f.toggles, [k]: v } }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const err = await saveSettings(form)
    if (err) {
      setError(err.message || 'Save failed.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button className="btn btn-icon" onClick={() => navigate('home')}>←</button>
          <h1>Settings</h1>
        </div>
        <div className="empty-state"><div className="spinner spinner-dark" /></div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="btn btn-icon" onClick={() => navigate('home')}>←</button>
        <h1 style={{ flex: 1 }}>Settings</h1>
        <button
          className="btn btn-sm"
          style={{ background: saved ? '#16a34a' : 'rgba(255,255,255,0.2)', color: 'white', border: 'none', minWidth: 70 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <span className="spinner" /> : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <div className="scrollable">
        <div style={{ paddingBottom: 48 }}>

          {error && <div className="pad"><div className="error-box">{error}</div></div>}

          {/* ── Your Info ─────────────────────────────────────── */}
          <div className="section-header" style={{ paddingTop: 20 }}>Your Info</div>
          <div style={{ background: 'white', padding: '0 16px' }}>
            {[
              { key: 'tech_name',    label: 'Your name',     placeholder: 'e.g. Calvin' },
              { key: 'tech_phone',   label: 'Direct phone / text', placeholder: 'e.g. 832-555-0100' },
              { key: 'company_name', label: 'Company name',  placeholder: 'e.g. Raccoon Pest Control' },
            ].map(f => (
              <div key={f.key} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <label className="label" style={{ marginBottom: 6 }}>{f.label}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={f.placeholder}
                  value={form[f.key] || ''}
                  onChange={e => set(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* ── Closing line ───────────────────────────────────── */}
          <div className="section-header">Invoice Note Closing Line</div>
          <div style={{ background: 'white', padding: '12px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              This exact sentence will end every customer-facing invoice note. Use your name and phone from above, or write it custom here.
            </p>
            <textarea
              className="textarea"
              rows={3}
              placeholder={`e.g. I hope you enjoy a pest-free home — if anything comes up before your next visit, don't hesitate to text me directly at ${form.tech_phone || 'your number'}.`}
              value={form.closing_line || ''}
              onChange={e => set('closing_line', e.target.value)}
            />
          </div>

          {/* ── Tone ───────────────────────────────────────────── */}
          <div className="section-header">Tone Instructions</div>
          <div style={{ background: 'white', padding: '12px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              How should the invoice note sound? Claude reads this before writing every customer note.
            </p>
            <textarea
              className="textarea"
              rows={3}
              placeholder="e.g. Friendly and personal, like a text from a trusted professional. Warm and reassuring — customers should feel taken care of, not like they received a service ticket."
              value={form.tone_instructions || ''}
              onChange={e => set('tone_instructions', e.target.value)}
            />
          </div>

          {/* ── Toggle groups ──────────────────────────────────── */}
          {TOGGLE_GROUPS.map(group => (
            <div key={group.label}>
              <div className="section-header">{group.label}</div>
              <div style={{ background: 'white', padding: '0 16px' }}>
                {group.toggles.map((t, i) => (
                  <Toggle
                    key={t.key}
                    label={t.label}
                    value={form.toggles[t.key] ?? t.default}
                    onChange={v => setToggle(t.key, v)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* ── Additional instructions ─────────────────────────── */}
          <div className="section-header">Additional Instructions</div>
          <div style={{ background: 'white', padding: '12px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              Anything else Claude should always follow. Freeform — write it however you want.
            </p>
            <textarea
              className="textarea"
              rows={5}
              placeholder="e.g. Always mention the service plan tier (Core / Premium / Legendary) if it was discussed. If a customer has a dog, always confirm it was secured before treatment."
              value={form.additional_instructions || ''}
              onChange={e => set('additional_instructions', e.target.value)}
            />
          </div>

          <div className="pad" style={{ paddingTop: 24 }}>
            <button
              className="btn btn-primary btn-full"
              style={{ height: 52 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <><span className="spinner" /> Saving…</> : saved ? '✓ Settings Saved' : 'Save Settings'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
