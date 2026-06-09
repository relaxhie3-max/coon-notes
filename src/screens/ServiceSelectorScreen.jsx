import { useState } from 'react'

const SERVICES = ['General Pest', 'Termite', 'Mosquito', 'Rodent', 'Wildlife']
const TIERS = ['Core', 'Premium', 'Legendary']

export default function ServiceSelectorScreen({ navigate, property }) {
  const [services, setServices] = useState([])
  const [tier, setTier] = useState('')
  const [visitType, setVisitType] = useState('recurring')

  const toggleService = (s) => {
    setServices(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  const canProceed = services.length > 0

  return (
    <div className="screen">
      <div className="header">
        <button className="btn btn-icon" onClick={() => navigate('property', { property })}>←</button>
        <div>
          <h1 style={{ fontSize: 16 }}>New Visit Note</h1>
          <div className="header-subtitle">{property.client_name}</div>
        </div>
      </div>

      <div className="scrollable">
        <div style={{ paddingBottom: 40 }}>

          {/* Services performed */}
          <div className="section-header" style={{ paddingTop: 20 }}>
            Services Performed *
          </div>
          <div style={{ background: 'white', padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {SERVICES.map(s => {
              const active = services.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  style={{
                    padding: '10px 18px', borderRadius: 22, fontSize: 15, fontWeight: 600,
                    border: `2px solid ${active ? '#1d4ed8' : 'var(--border)'}`,
                    background: active ? '#dbeafe' : 'white',
                    color: active ? '#1d4ed8' : 'var(--text-muted)',
                    cursor: 'pointer', minHeight: 44,
                    transition: 'all 0.15s',
                  }}
                >
                  {active && '✓ '}{s}
                </button>
              )
            })}
          </div>

          {/* Plan tier */}
          <div className="section-header">Plan Tier</div>
          <div style={{ background: 'white', padding: '14px 16px', display: 'flex', gap: 8 }}>
            {TIERS.map(t => {
              const colors = { Core: '#374151', Premium: '#7c3aed', Legendary: '#b45309' }
              const active = tier === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(active ? '' : t)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    border: `2px solid ${active ? colors[t] : 'var(--border)'}`,
                    background: active ? colors[t] + '18' : 'white',
                    color: active ? colors[t] : 'var(--text-muted)',
                    cursor: 'pointer', minHeight: 44,
                    transition: 'all 0.15s',
                  }}
                >
                  {active ? '✓ ' : ''}{t}
                </button>
              )
            })}
          </div>

          {/* Visit type */}
          <div className="section-header">Visit Type</div>
          <div style={{ background: 'white', padding: '14px 16px', display: 'flex', gap: 8 }}>
            {[
              { v: 'initial',   label: 'Initial',   desc: 'First visit, full onboard' },
              { v: 'recurring', label: 'Recurring',  desc: 'Scheduled return visit' },
            ].map(({ v, label, desc }) => {
              const active = visitType === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisitType(v)}
                  style={{
                    flex: 1, padding: '12px 8px', borderRadius: 8, textAlign: 'center',
                    border: `2px solid ${active ? '#1d4ed8' : 'var(--border)'}`,
                    background: active ? '#dbeafe' : 'white',
                    cursor: 'pointer', minHeight: 60,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: active ? '#1d4ed8' : 'var(--text)' }}>
                    {active ? '✓ ' : ''}{label}
                  </div>
                  <div style={{ fontSize: 12, color: active ? '#3b82f6' : 'var(--text-muted)', marginTop: 3 }}>
                    {desc}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Summary of what SOPs will be checked */}
          {canProceed && (
            <div style={{ margin: '16px 16px 0', background: '#f0fdf4', border: '1.5px solid #16a34a', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>
                ✓ SOPs that will be checked
              </div>
              <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                {services.map(s => {
                  const parts = [s, tier || 'Any tier', visitType === 'initial' ? 'Initial' : 'Recurring']
                  return <div key={s}>· {parts.join(' · ')}</div>
                })}
              </div>
            </div>
          )}

          <div className="pad" style={{ paddingTop: 24 }}>
            <button
              className="btn btn-primary btn-full"
              style={{ height: 56, fontSize: 17, fontWeight: 700 }}
              onClick={() => navigate('record', { property, mode: 'visit', selectedServices: services, tier, visitType })}
              disabled={!canProceed}
            >
              🎙 Start Recording
            </button>

            {!canProceed && (
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
                Select at least one service to continue
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
