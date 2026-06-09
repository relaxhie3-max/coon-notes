import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SERVICE_ORDER = ['General Pest', 'Termite', 'Mosquito', 'Rodent', 'Wildlife']
const TIER_COLORS = { Core: '#374151', Premium: '#7c3aed', Legendary: '#b45309' }

export default function SOPLibraryScreen({ navigate }) {
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadSops() }, [])

  async function loadSops() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('sops')
      .select('*')
      .order('service_type')
      .order('visit_type')
      .order('tier')
    if (err) setError(err.message)
    else setSops(data || [])
    setLoading(false)
  }

  // Group by service type
  const grouped = {}
  sops.forEach(sop => {
    const key = sop.service_type || 'Other'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(sop)
  })

  const serviceKeys = SERVICE_ORDER.filter(s => grouped[s]).concat(
    Object.keys(grouped).filter(k => !SERVICE_ORDER.includes(k))
  )

  return (
    <div className="screen">
      <div className="header">
        <button className="btn btn-icon" onClick={() => navigate('home')}>←</button>
        <h1 style={{ flex: 1 }}>SOP Library</h1>
        <button
          className="btn btn-sm"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
          onClick={() => navigate('sopEdit', { sop: null })}
        >
          + New
        </button>
      </div>

      <div className="scrollable">
        {loading && (
          <div className="empty-state"><div className="spinner spinner-dark" /></div>
        )}

        {!loading && error && (
          <div className="pad"><div className="error-box">{error}</div></div>
        )}

        {!loading && !error && sops.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No SOPs yet</div>
            <div className="empty-state-sub">Tap "+ New" to create your first SOP</div>
          </div>
        )}

        {!loading && !error && serviceKeys.map(service => (
          <div key={service}>
            <div className="section-header">{service}</div>
            <div style={{ background: 'white' }}>
              {grouped[service].map((sop, i, arr) => (
                <div
                  key={sop.id}
                  className="card-row"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onClick={() => navigate('sopEdit', { sop })}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                      {sop.name || `${sop.service_type} · ${sop.visit_type}`}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                      {(sop.checklist || []).length} checklist item{(sop.checklist || []).length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    {sop.tier && (
                      <span className="badge" style={{
                        background: (TIER_COLORS[sop.tier] || '#64748b') + '18',
                        color: TIER_COLORS[sop.tier] || '#64748b',
                      }}>
                        {sop.tier}
                      </span>
                    )}
                    <span className="badge" style={{
                      background: sop.visit_type === 'initial' ? '#dbeafe' : '#dcfce7',
                      color: sop.visit_type === 'initial' ? '#1d4ed8' : '#16a34a',
                    }}>
                      {sop.visit_type === 'initial' ? 'Initial' : 'Recurring'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: 16 }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
