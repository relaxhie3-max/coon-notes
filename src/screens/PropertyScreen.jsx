import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ServiceTypePicker from '../components/ServiceTypePicker'

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

  // Follow-up flag
  const [clearingFlag, setClearingFlag] = useState(false)

  const clearFollowupFlag = async () => {
    setClearingFlag(true)
    const { error: err } = await supabase
      .from('properties')
      .update({ followup_flag: false, followup_note: null, followup_flagged_at: null })
      .eq('id', prop.id)
    if (!err) setProp(p => ({ ...p, followup_flag: false, followup_note: null }))
    setClearingFlag(false)
  }

  // Property edit state
  const [editingProp, setEditingProp] = useState(false)
  const [editDraft, setEditDraft] = useState({ client_name: '', address: '', service_type: '' })
  const [savingProp, setSavingProp] = useState(false)
  const [propEditError, setPropEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const { error: err } = await supabase
      .from('properties')
      .delete()
      .eq('id', prop.id)
    if (err) {
      setPropEditError(err.message || 'Delete failed.')
      setDeleting(false)
      setConfirmDelete(false)
    } else {
      navigate('home')
    }
  }

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
      .select('id, date, mode, log_summary, invoice_note, tech_notes, pest_log_entry, profile_update_suggestion, transcript, created_at')
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

  const openPropEdit = () => {
    setEditDraft({ client_name: prop.client_name || '', address: prop.address || '', service_type: prop.service_type || '' })
    setPropEditError('')
    setEditingProp(true)
  }

  const savePropEdit = async () => {
    if (!editDraft.client_name.trim()) return setPropEditError('Client name is required.')
    if (!editDraft.address.trim()) return setPropEditError('Address is required.')
    setSavingProp(true)
    setPropEditError('')
    try {
      const { error: err } = await supabase
        .from('properties')
        .update({
          client_name: editDraft.client_name.trim(),
          address: editDraft.address.trim(),
          service_type: editDraft.service_type || null,
        })
        .eq('id', prop.id)
      if (err) throw err
      setProp(p => ({ ...p, ...editDraft }))
      setEditingProp(false)
    } catch (err) {
      setPropEditError(err.message || 'Save failed.')
    }
    setSavingProp(false)
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
      <div className="pad" style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => navigate('record', { property: prop, mode: 'visit' })}
        >
          🎙 Visit Note
        </button>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          onClick={() => navigate('record', { property: prop, mode: 'quick_log' })}
        >
          📋 Quick Log
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
          <div className="empty-state-title">No entries yet</div>
          <div className="empty-state-sub">Record a visit note or log a quick update</div>
        </div>
      )}

      {!visitsLoading && visits.length > 0 && (
        <div style={{ background: 'white' }}>
          {visits.map(v => {
            const isQuickLog = v.mode === 'quick_log'
            return (
              <div
                key={v.id}
                className="visit-item"
                style={{ cursor: 'pointer', background: isQuickLog ? '#f8fafc' : 'white' }}
                onClick={() => navigate('visitDetail', { property: prop, visit: v })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15 }}>{isQuickLog ? '📋' : '📝'}</span>
                  <span className="visit-date" style={{ margin: 0 }}>
                    {formatDate(v.created_at)}
                    {isQuickLog && (
                      <span style={{
                        marginLeft: 8, fontSize: 11, fontWeight: 700,
                        background: '#e0f2fe', color: '#0369a1',
                        padding: '2px 7px', borderRadius: 10,
                      }}>
                        QUICK LOG
                      </span>
                    )}
                  </span>
                  <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 16 }}>›</span>
                </div>
                <div className="visit-preview">
                  {isQuickLog
                    ? (v.log_summary || 'Quick log entry')
                    : (v.invoice_note
                        ? v.invoice_note.slice(0, 100) + (v.invoice_note.length > 100 ? '…' : '')
                        : 'No invoice note')
                  }
                </div>
              </div>
            )
          })}
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
        <button className="btn btn-icon" onClick={() => navigate('home')}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {prop.client_name}
          </h1>
          <div className="header-subtitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {prop.address}
          </div>
        </div>
        <button
          className="btn btn-icon"
          onClick={editingProp ? () => setEditingProp(false) : openPropEdit}
          title="Edit property"
        >
          {editingProp ? '✕' : '✏️'}
        </button>
      </div>

      {/* Inline property editor */}
      {editingProp && (
        <div style={{
          background: '#f8fafc', borderBottom: '1px solid var(--border)',
          padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
          flexShrink: 0,
        }}>
          {propEditError && <div className="error-box">{propEditError}</div>}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Client Name</label>
            <input
              className="input"
              type="text"
              value={editDraft.client_name}
              onChange={e => setEditDraft(d => ({ ...d, client_name: e.target.value }))}
              autoCapitalize="words"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Address</label>
            <input
              className="input"
              type="text"
              value={editDraft.address}
              onChange={e => setEditDraft(d => ({ ...d, address: e.target.value }))}
              autoCapitalize="words"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Service Type & Plan</label>
            <ServiceTypePicker
              value={editDraft.service_type}
              onChange={v => setEditDraft(d => ({ ...d, service_type: v }))}
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={savePropEdit}
            disabled={savingProp || deleting}
          >
            {savingProp ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
          </button>

          {!confirmDelete ? (
            <button
              className="btn btn-ghost btn-full"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger-100)' }}
              onClick={() => setConfirmDelete(true)}
              disabled={savingProp || deleting}
            >
              Delete Property
            </button>
          ) : (
            <div style={{
              background: 'var(--danger-100)', border: '1.5px solid var(--danger)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)', textAlign: 'center' }}>
                Delete {prop.client_name}? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-full"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger btn-full"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <><span className="spinner" /> Deleting…</> : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Follow-up flag banner */}
      {prop.followup_flag && (
        <div style={{
          background: '#fef3c7',
          borderBottom: '1.5px solid #f59e0b',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🚩</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Follow-up needed</div>
            {prop.followup_note && (
              <div style={{ fontSize: 13, color: '#78350f', marginTop: 2 }}>{prop.followup_note}</div>
            )}
          </div>
          <button
            className="btn btn-sm"
            style={{ background: '#f59e0b', color: 'white', border: 'none', flexShrink: 0 }}
            onClick={clearFollowupFlag}
            disabled={clearingFlag}
          >
            {clearingFlag ? '…' : '✓ Done'}
          </button>
        </div>
      )}

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
