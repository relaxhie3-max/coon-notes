import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function HomeScreen({ navigate }) {
  const [properties, setProperties] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProperties()
  }, [])

  async function loadProperties() {
    setLoading(true)
    setError('')
    try {
      const { data: props, error: propErr } = await supabase
        .from('properties')
        .select('*, followup_flag, followup_note')
        .order('followup_flag', { ascending: false, nullsFirst: false })
        .order('client_name')

      if (propErr) throw propErr

      const { data: visits } = await supabase
        .from('visits')
        .select('property_id, mode')

      const countMap = {}
      ;(visits || []).forEach(v => {
        // Quick logs are not service visits — don't count them
        if (v.mode !== 'quick_log') {
          countMap[v.property_id] = (countMap[v.property_id] || 0) + 1
        }
      })

      setProperties((props || []).map(p => ({ ...p, visitCount: countMap[p.id] || 0 })))
    } catch (err) {
      setError('Failed to load properties. Check your connection.')
    }
    setLoading(false)
  }

  const filtered = properties.filter(p => {
    const q = search.toLowerCase()
    return (
      (p.client_name || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q)
    )
  })

  const serviceColors = {
    'General Pest': '#2563eb', 'Termite': '#7c3aed', 'Mosquito': '#059669',
    'Rodent': '#d97706', 'Wildlife': '#dc2626',
    'Monthly': '#0891b2', 'Bi-Monthly': '#0891b2', 'Quarterly': '#0891b2', 'One-Time': '#64748b',
    'Core': '#374151', 'Premium': '#7c3aed', 'Legendary': '#b45309',
    // legacy
    'General pest': '#2563eb', 'Multi-service': '#0891b2',
  }

  return (
    <div className="screen">
      <div className="header">
        <div style={{ flex: 1 }}>
          <h1>Raccoon Notes</h1>
        </div>
        <button
          className="btn btn-sm"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
          onClick={() => navigate('addProperty')}
        >
          + Add
        </button>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search by name or address…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="scrollable">
        {loading && (
          <div className="empty-state">
            <div className="spinner spinner-dark" />
            <span className="text-muted" style={{ marginTop: 12 }}>Loading…</span>
          </div>
        )}

        {!loading && error && (
          <div className="pad">
            <div className="error-box">{error}</div>
            <button className="btn btn-ghost btn-full mt-4" onClick={loadProperties}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🏠</div>
            <div className="empty-state-title">
              {search ? 'No results' : 'No properties yet'}
            </div>
            <div className="empty-state-sub">
              {search ? 'Try a different search' : 'Tap "+ Add" to add your first property'}
            </div>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ background: 'white' }}>
            {filtered.map((prop, idx) => (
              <div
                key={prop.id}
                className="property-item"
                style={idx === filtered.length - 1 ? { borderBottom: 'none' } : {}}
                onClick={() => navigate('property', { property: prop })}
              >
                <div className="property-item-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="property-item-name">{prop.client_name || 'Unnamed'}</div>
                    {prop.followup_flag && (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#f59e0b', flexShrink: 0, marginTop: 1,
                      }} title="Follow-up needed" />
                    )}
                  </div>
                  <div className="property-item-address">{prop.address || 'No address'}</div>
                  {prop.service_type && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {prop.service_type.split(',').map(s => s.trim()).filter(Boolean).map(tag => (
                        <span
                          key={tag}
                          className="badge"
                          style={{
                            background: (serviceColors[tag] || '#64748b') + '18',
                            color: serviceColors[tag] || '#64748b',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="property-item-meta">
                  <span className="text-sm text-muted">
                    {prop.visitCount} visit{prop.visitCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <span style={{ color: '#94a3b8', fontSize: 18 }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
