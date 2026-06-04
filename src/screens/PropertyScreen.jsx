import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/* ─── Field definitions ─────────────────────────────────────── */

const ALERT_FIELDS = [
  { key: 'alert_allergies', label: 'Allergies', placeholder: 'Any allergy concerns…' },
  { key: 'alert_pets',      label: 'Pets',      placeholder: 'Pet type, name, location…' },
  { key: 'alert_reentry',   label: 'Re-entry concerns', placeholder: 'Re-entry interval or instructions…' },
  { key: 'alert_offlimits', label: 'Off-limits areas',  placeholder: 'Rooms, areas, items not to treat…' },
  { key: 'alert_safety',    label: 'Safety flags',       placeholder: 'Hazards, gate codes, dogs loose…' },
]

const CLIENT_FIELDS = [
  { key: 'client_primary_name',     label: 'Primary contact name' },
  { key: 'client_personality',      label: 'Personality read' },
  { key: 'client_spouse',           label: 'Spouse / partner name' },
  { key: 'client_children',         label: 'Children (names & ages)' },
  { key: 'client_household',        label: 'Other household members' },
  { key: 'client_occupations',      label: 'Occupations & work schedules' },
  { key: 'client_background',       label: 'Where they\'re from / background' },
  { key: 'client_time_at_address',  label: 'How long at this address' },
  { key: 'client_language_comms',   label: 'Language / communication notes' },
  { key: 'client_contact_preference', label: 'Preferred contact method & timing' },
  { key: 'client_referral_source',  label: 'How they found you' },
  { key: 'client_avoid',            label: 'Things to avoid or be careful about' },
  { key: 'client_payment_notes',    label: 'Payment / account notes' },
  { key: 'client_general',          label: 'General notes' },
]

const PROPERTY_FIELDS = [
  { key: 'property_structure_type',    label: 'Structure type' },
  { key: 'property_sqft',              label: 'Approx. square footage' },
  { key: 'property_perimeter_ft',      label: 'Linear perimeter (ft)' },
  { key: 'property_year_built',        label: 'Year built' },
  { key: 'property_rear_access',       label: 'Rear access side' },
  { key: 'property_water_access',      label: 'Outdoor water access locations' },
  { key: 'property_crawlspace',        label: 'Crawl space' },
  { key: 'property_attic_access',      label: 'Attic access location' },
  { key: 'property_garage',            label: 'Garage' },
  { key: 'property_construction_notes', label: 'Notable construction features' },
  { key: 'property_landscaping',       label: 'Landscaping notes' },
  { key: 'property_general',           label: 'General notes' },
]

/* ─── CopyButton ────────────────────────────────────────────── */

function CopyButton({ text, small }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <button
      className={`btn btn-ghost ${small ? 'btn-sm' : ''}`}
      onClick={copy}
      style={{ minWidth: 72 }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

/* ─── Editable profile field ────────────────────────────────── */

function ProfileField({ fieldKey, label, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(fieldKey, draft)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="profile-field">
      <div className="profile-field-label">{label}</div>

      {!editing ? (
        <>
          {value
            ? <div className="profile-field-value">{value}</div>
            : <div className="profile-field-empty">—</div>
          }
          <div className="profile-field-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setDraft(value || ''); setEditing(true) }}
            >
              Edit
            </button>
            {value && <CopyButton text={value} small />}
          </div>
        </>
      ) : (
        <>
          <textarea
            className="textarea"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
            rows={3}
          />
          <div className="profile-field-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Main component ────────────────────────────────────────── */

export default function PropertyScreen({ navigate, property: initialProperty }) {
  const [prop, setProp] = useState(initialProperty)
  const [activeTab, setActiveTab] = useState('alerts')
  const [visits, setVisits] = useState([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [alertDrafts, setAlertDrafts] = useState({})
  const [alertDirty, setAlertDirty] = useState(false)
  const [savingAlerts, setSavingAlerts] = useState(false)
  const [alertError, setAlertError] = useState('')
  const [alertSuccess, setAlertSuccess] = useState(false)

  // Initialize alert drafts from current property values
  useEffect(() => {
    const drafts = {}
    ALERT_FIELDS.forEach(f => { drafts[f.key] = prop[f.key] || '' })
    setAlertDrafts(drafts)
    setAlertDirty(false)
  }, [prop.id])

  useEffect(() => {
    if (activeTab === 'visits') loadVisits()
  }, [activeTab])

  async function loadVisits() {
    setVisitsLoading(true)
    const { data } = await supabase
      .from('visits')
      .select('id, date, invoice_note, created_at')
      .eq('property_id', prop.id)
      .order('created_at', { ascending: false })
    setVisits(data || [])
    setVisitsLoading(false)
  }

  const handleAlertChange = (key, val) => {
    setAlertDrafts(d => ({ ...d, [key]: val }))
    setAlertDirty(true)
    setAlertSuccess(false)
  }

  const saveAlerts = async () => {
    setSavingAlerts(true)
    setAlertError('')
    try {
      const updates = {}
      ALERT_FIELDS.forEach(f => { updates[f.key] = alertDrafts[f.key] || null })
      const { error: err } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', prop.id)
      if (err) throw err
      setProp(p => ({ ...p, ...updates }))
      setAlertDirty(false)
      setAlertSuccess(true)
      setTimeout(() => setAlertSuccess(false), 2000)
    } catch (err) {
      setAlertError(err.message || 'Save failed')
    }
    setSavingAlerts(false)
  }

  const handleProfileSave = async (key, value) => {
    const { error: err } = await supabase
      .from('properties')
      .update({ [key]: value || null })
      .eq('id', prop.id)
    if (!err) setProp(p => ({ ...p, [key]: value || null }))
  }

  const formatDate = (str) => {
    if (!str) return ''
    return new Date(str).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  /* ── Alerts tab ─────────────────────────────────────────── */
  const AlertsTab = () => (
    <div className="scrollable">
      <div className="pad">
        <div className="alert-section">
          <div className="alert-header">
            <span style={{ fontSize: 18 }}>⚠️</span>
            <h2>Service Alerts</h2>
            <span style={{ fontSize: 12, color: '#92400e', marginLeft: 'auto', fontWeight: 600 }}>
              REVIEW BEFORE EVERY VISIT
            </span>
          </div>
          <div className="alert-body">
            {ALERT_FIELDS.map(f => (
              <div key={f.key} className="alert-field">
                <label htmlFor={f.key}>{f.label}</label>
                <textarea
                  id={f.key}
                  className="textarea"
                  style={{
                    background: '#fffbeb',
                    borderColor: alertDrafts[f.key] ? '#f59e0b' : '#e2e8f0',
                    minHeight: 56,
                  }}
                  placeholder={f.placeholder}
                  value={alertDrafts[f.key] || ''}
                  onChange={e => handleAlertChange(f.key, e.target.value)}
                  rows={2}
                />
              </div>
            ))}

            {alertError && <div className="error-box">{alertError}</div>}
            {alertSuccess && <div className="success-box">✓ Alerts saved</div>}

            <button
              className="btn btn-full"
              style={{
                background: alertDirty ? '#f59e0b' : '#e2e8f0',
                color: alertDirty ? '#92400e' : '#64748b',
                fontWeight: 700,
              }}
              onClick={saveAlerts}
              disabled={savingAlerts || !alertDirty}
            >
              {savingAlerts ? <><span className="spinner" style={{ borderTopColor: '#92400e' }} /> Saving…</> : 'Save Alerts'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  /* ── Visits tab ─────────────────────────────────────────── */
  const VisitsTab = () => (
    <div className="scrollable">
      <div className="pad">
        <button
          className="btn btn-primary btn-full"
          onClick={() => navigate('record', { property: prop })}
        >
          🎙 Start New Visit Note
        </button>
      </div>

      {visitsLoading && (
        <div className="empty-state">
          <div className="spinner spinner-dark" />
        </div>
      )}

      {!visitsLoading && visits.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">No visits yet</div>
          <div className="empty-state-sub">Tap above to record your first visit note</div>
        </div>
      )}

      {!visitsLoading && visits.length > 0 && (
        <div style={{ background: 'white' }}>
          {visits.map(v => (
            <div key={v.id} className="visit-item">
              <div className="visit-date">{formatDate(v.created_at)}</div>
              <div className="visit-preview">
                {v.invoice_note ? v.invoice_note.slice(0, 100) + (v.invoice_note.length > 100 ? '…' : '') : 'No invoice note'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  /* ── Profile tab ────────────────────────────────────────── */
  const ProfileTab = () => (
    <div className="scrollable">
      {prop.pest_running_summary && (
        <div className="pad" style={{ paddingBottom: 0 }}>
          <div className="card" style={{ padding: 14, marginBottom: 4 }}>
            <div className="profile-field-label" style={{ marginBottom: 6 }}>Pest History Summary</div>
            <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {prop.pest_running_summary}
            </div>
          </div>
        </div>
      )}

      <div className="section-header">About Client</div>
      <div style={{ background: 'white', padding: '0 16px' }}>
        {CLIENT_FIELDS.map(f => (
          <ProfileField
            key={f.key}
            fieldKey={f.key}
            label={f.label}
            value={prop[f.key]}
            onSave={handleProfileSave}
          />
        ))}
      </div>

      <div className="section-header" style={{ marginTop: 16 }}>Property Notes</div>
      <div style={{ background: 'white', padding: '0 16px', marginBottom: 32 }}>
        {PROPERTY_FIELDS.map(f => (
          <ProfileField
            key={f.key}
            fieldKey={f.key}
            label={f.label}
            value={prop[f.key]}
            onSave={handleProfileSave}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className="screen">
      <div className="header">
        <button className="btn btn-icon" onClick={() => navigate('home')}>
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {prop.client_name}
          </h1>
          <div className="header-subtitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {prop.address}
          </div>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'alerts',  label: '⚠️ Alerts' },
          { id: 'visits',  label: '📝 Visits' },
          { id: 'profile', label: '👤 Profile' },
        ].map(t => (
          <button
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'alerts'  && <AlertsTab />}
      {activeTab === 'visits'  && <VisitsTab />}
      {activeTab === 'profile' && <ProfileTab />}
    </div>
  )
}
