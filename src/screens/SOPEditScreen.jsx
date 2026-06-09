import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SERVICE_TYPES = ['General Pest', 'Termite', 'Mosquito', 'Rodent', 'Wildlife']
const TIERS = ['Any tier', 'Core', 'Premium', 'Legendary']

function autoName(service, tier, visitType) {
  const t = tier === 'Any tier' ? '' : ` · ${tier}`
  const v = visitType === 'initial' ? ' · Initial' : ' · Recurring'
  return service ? `${service}${t}${v}` : ''
}

export default function SOPEditScreen({ navigate, sop: initialSop }) {
  const isNew = !initialSop
  const [name, setName] = useState(initialSop?.name || '')
  const [serviceType, setServiceType] = useState(initialSop?.service_type || 'General Pest')
  const [tier, setTier] = useState(initialSop?.tier || 'Any tier')
  const [visitType, setVisitType] = useState(initialSop?.visit_type || 'recurring')
  const [checklist, setChecklist] = useState(initialSop?.checklist || [])
  const [newItem, setNewItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const newItemRef = useRef(null)

  const handleServiceChange = (s) => {
    setServiceType(s)
    if (!name || name === autoName(serviceType, tier, visitType)) {
      setName(autoName(s, tier, visitType))
    }
  }

  const handleTierChange = (t) => {
    setTier(t)
    if (!name || name === autoName(serviceType, tier, visitType)) {
      setName(autoName(serviceType, t, visitType))
    }
  }

  const handleVisitTypeChange = (v) => {
    setVisitType(v)
    if (!name || name === autoName(serviceType, tier, visitType)) {
      setName(autoName(serviceType, tier, v))
    }
  }

  const addItem = () => {
    if (!newItem.trim()) return
    setChecklist(c => [...c, newItem.trim()])
    setNewItem('')
    setTimeout(() => newItemRef.current?.focus(), 50)
  }

  const updateItem = (i, val) => {
    setChecklist(c => c.map((item, idx) => idx === i ? val : item))
  }

  const deleteItem = (i) => {
    setChecklist(c => c.filter((_, idx) => idx !== i))
  }

  const moveItem = (i, dir) => {
    const next = [...checklist]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setChecklist(next)
  }

  const handleSave = async () => {
    if (!serviceType) return setError('Service type is required.')
    if (checklist.length === 0) return setError('Add at least one checklist item.')
    setSaving(true)
    setError('')

    const payload = {
      name: name || autoName(serviceType, tier, visitType),
      service_type: serviceType,
      tier: tier === 'Any tier' ? null : tier,
      visit_type: visitType,
      checklist,
      updated_at: new Date().toISOString(),
    }

    let err
    if (isNew) {
      const { error: e } = await supabase.from('sops').insert(payload)
      err = e
    } else {
      const { error: e } = await supabase.from('sops').update(payload).eq('id', initialSop.id)
      err = e
    }

    if (err) {
      setError(err.message || 'Save failed.')
      setSaving(false)
    } else {
      navigate('sopLibrary')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error: err } = await supabase.from('sops').delete().eq('id', initialSop.id)
    if (err) {
      setError(err.message || 'Delete failed.')
      setDeleting(false)
      setConfirmDelete(false)
    } else {
      navigate('sopLibrary')
    }
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="btn btn-icon" onClick={() => navigate('sopLibrary')}>←</button>
        <h1 style={{ flex: 1, fontSize: 16 }}>{isNew ? 'New SOP' : 'Edit SOP'}</h1>
        <button
          className="btn btn-sm"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', minWidth: 60 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <span className="spinner" /> : 'Save'}
        </button>
      </div>

      <div className="scrollable">
        <div style={{ paddingBottom: 48 }}>
          {error && <div className="pad"><div className="error-box">{error}</div></div>}

          {/* Name */}
          <div className="section-header" style={{ paddingTop: 16 }}>SOP Name</div>
          <div style={{ background: 'white', padding: '12px 16px' }}>
            <input
              className="input"
              type="text"
              placeholder="e.g. General Pest · Premium · Recurring"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Service type */}
          <div className="section-header">Service Type</div>
          <div style={{ background: 'white', padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SERVICE_TYPES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleServiceChange(s)}
                style={{
                  padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 600,
                  border: `2px solid ${serviceType === s ? '#1d4ed8' : 'var(--border)'}`,
                  background: serviceType === s ? '#dbeafe' : 'white',
                  color: serviceType === s ? '#1d4ed8' : 'var(--text-muted)',
                  cursor: 'pointer', minHeight: 44,
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Tier */}
          <div className="section-header">Plan Tier</div>
          <div style={{ background: 'white', padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TIERS.map(t => {
              const colors = { Core: '#374151', Premium: '#7c3aed', Legendary: '#b45309', 'Any tier': '#64748b' }
              const active = tier === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTierChange(t)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 600,
                    border: `2px solid ${active ? colors[t] : 'var(--border)'}`,
                    background: active ? colors[t] + '18' : 'white',
                    color: active ? colors[t] : 'var(--text-muted)',
                    cursor: 'pointer', minHeight: 44,
                  }}
                >
                  {active && '✓ '}{t}
                </button>
              )
            })}
          </div>

          {/* Visit type */}
          <div className="section-header">Visit Type</div>
          <div style={{ background: 'white', padding: '12px 16px', display: 'flex', gap: 8 }}>
            {[{ v: 'initial', label: 'Initial' }, { v: 'recurring', label: 'Recurring' }].map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => handleVisitTypeChange(v)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, fontSize: 15, fontWeight: 600,
                  border: `2px solid ${visitType === v ? '#1d4ed8' : 'var(--border)'}`,
                  background: visitType === v ? '#dbeafe' : 'white',
                  color: visitType === v ? '#1d4ed8' : 'var(--text-muted)',
                  cursor: 'pointer', minHeight: 44,
                }}
              >
                {visitType === v ? '✓ ' : ''}{label}
              </button>
            ))}
          </div>

          {/* Checklist */}
          <div className="section-header">
            Checklist Items ({checklist.length})
          </div>
          <div style={{ background: 'white' }}>
            {checklist.length === 0 && (
              <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' }}>
                No items yet — add your first checklist item below
              </div>
            )}
            {checklist.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 16px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 13, marginTop: 14, flexShrink: 0 }}>
                  {i + 1}.
                </span>
                <textarea
                  className="textarea"
                  style={{ flex: 1, minHeight: 56, fontSize: 14 }}
                  value={item}
                  onChange={e => updateItem(i, e.target.value)}
                  rows={2}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => moveItem(i, -1)}
                    disabled={i === 0}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#64748b', fontSize: 16 }}
                  >↑</button>
                  <button
                    onClick={() => moveItem(i, 1)}
                    disabled={i === checklist.length - 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#64748b', fontSize: 16 }}
                  >↓</button>
                  <button
                    onClick={() => deleteItem(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#dc2626', fontSize: 16 }}
                  >×</button>
                </div>
              </div>
            ))}

            {/* Add item */}
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
              <textarea
                ref={newItemRef}
                className="textarea"
                style={{ flex: 1, minHeight: 56, fontSize: 14 }}
                placeholder="Describe a specific action or step that should be performed or mentioned…"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem() } }}
                rows={2}
              />
              <button
                className="btn btn-primary"
                style={{ flexShrink: 0, alignSelf: 'flex-end' }}
                onClick={addItem}
                disabled={!newItem.trim()}
              >
                Add
              </button>
            </div>
          </div>

          {/* Delete */}
          {!isNew && (
            <div className="pad" style={{ paddingTop: 24 }}>
              {!confirmDelete ? (
                <button
                  className="btn btn-ghost btn-full"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-100)' }}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete SOP
                </button>
              ) : (
                <div style={{
                  background: 'var(--danger-100)', border: '1.5px solid var(--danger)',
                  borderRadius: 'var(--radius-sm)', padding: 14,
                }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)', marginBottom: 12, textAlign: 'center' }}>
                    Delete this SOP? Cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-full" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button>
                    <button className="btn btn-danger btn-full" onClick={handleDelete} disabled={deleting}>
                      {deleting ? <><span className="spinner" /> Deleting…</> : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
