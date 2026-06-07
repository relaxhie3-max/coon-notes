import { useState } from 'react'
import { supabase } from '../lib/supabase'

/* ─── Helpers ───────────────────────────────────────────────── */

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
    <button className="btn btn-ghost btn-sm" onClick={copy} style={{ minWidth: 80 }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function ResultSection({ title, content, accent }) {
  return (
    <div className="result-section">
      <div className="result-section-header" style={accent ? { background: accent + '18' } : {}}>
        <span className="result-section-title" style={accent ? { color: accent } : {}}>
          {title}
        </span>
        <CopyButton text={content} />
      </div>
      <div className="result-section-body">{content || '—'}</div>
    </div>
  )
}

const FIELD_LABELS = {
  alert_allergies: 'Allergies', alert_pets: 'Pets', alert_reentry: 'Re-entry',
  alert_offlimits: 'Off-limits', alert_safety: 'Safety',
  client_primary_name: 'Primary name', client_personality: 'Personality',
  client_spouse: 'Spouse', client_children: 'Children', client_household: 'Household',
  client_occupations: 'Occupations', client_background: 'Background',
  client_time_at_address: 'Time at address', client_language_comms: 'Language/comms',
  client_contact_preference: 'Contact pref.', client_referral_source: 'Referral',
  client_avoid: 'Avoid', client_payment_notes: 'Payment', client_general: 'Client general',
  property_structure_type: 'Structure', property_sqft: 'Sq ft', property_perimeter_ft: 'Perimeter',
  property_year_built: 'Year built', property_rear_access: 'Rear access',
  property_water_access: 'Water access', property_crawlspace: 'Crawlspace',
  property_attic_access: 'Attic access', property_garage: 'Garage',
  property_construction_notes: 'Construction', property_landscaping: 'Landscaping',
  property_general: 'Property general',
}

const SECTION_LABELS = {
  alerts: '⚠️ Service Alerts',
  client: '👤 About Client',
  property: '🏠 Property Notes',
}

function ProfileUpdatePreview({ updates }) {
  const hasAny = Object.entries(updates || {}).some(([, fields]) =>
    Object.values(fields || {}).some(v => v && v !== 'null')
  )

  if (!hasAny) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: 15, fontStyle: 'italic' }}>
        No new profile information found.
      </p>
    )
  }

  return (
    <div>
      {Object.entries(updates || {}).map(([section, fields]) => {
        const items = Object.entries(fields || {}).filter(([, v]) => v && v !== 'null')
        if (!items.length) return null
        return (
          <div key={section} className="update-section">
            <h4>{SECTION_LABELS[section] || section}</h4>
            {items.map(([key, val]) => (
              <div key={key} className="update-item">
                <span className="update-key">{FIELD_LABELS[key] || key}</span>
                <span className="update-val">{val}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Save logic helpers ────────────────────────────────────── */

function hasValue(v) {
  return v && v !== 'null' && String(v).trim() !== ''
}

function appendField(existing, newVal, dateStr) {
  if (!hasValue(newVal)) return existing || null
  const entry = `[${dateStr}] ${String(newVal).trim()}`
  return existing ? `${existing}\n${entry}` : entry
}

/* ─── Main component ────────────────────────────────────────── */

export default function ResultsScreen({ navigate, property, transcript, notes, mode = 'visit' }) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [flagFollowup, setFlagFollowup] = useState(false)
  const [followupNote, setFollowupNote] = useState('')
  const isQuickLog = mode === 'quick_log'

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')

    try {
      // 1. Save visit record
      const { error: visitErr } = await supabase.from('visits').insert({
        property_id: property.id,
        transcript,
        mode,
        log_summary: isQuickLog ? (notes.summary || null) : null,
        invoice_note: !isQuickLog ? (notes.invoice || null) : null,
        tech_notes: !isQuickLog ? (notes.tech || null) : null,
        pest_log_entry: !isQuickLog ? (notes.pestLog || null) : null,
        profile_update_suggestion: notes.profileUpdates || null,
      })
      if (visitErr) throw visitErr

      // 2. Apply profile field updates
      const updates = {}
      const applySection = (sectionKey) => {
        const fields = notes.profileUpdates?.[sectionKey]
        if (!fields) return
        for (const [key, val] of Object.entries(fields)) {
          if (hasValue(val)) updates[key] = appendField(property[key], val, dateStr)
        }
      }
      applySection('alerts')
      applySection('client')
      applySection('property')

      // 3. Rewrite pest_running_summary only for visit notes
      if (!isQuickLog && notes.pestLog) {
        const summaryRes = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'pest_summary',
            existing: property.pest_running_summary || '',
            newEntry: notes.pestLog,
          }),
        })
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          if (summaryData.summary) updates.pest_running_summary = summaryData.summary
        }
      }

      // 4. Apply follow-up flag if set
      if (flagFollowup) {
        updates.followup_flag = true
        updates.followup_note = followupNote.trim() || null
        updates.followup_flagged_at = new Date().toISOString()
      }

      // 5. Apply all property updates
      if (Object.keys(updates).length > 0) {
        const { error: propErr } = await supabase
          .from('properties').update(updates).eq('id', property.id)
        if (propErr) throw propErr
      }

      navigate('property', { property: { ...property, ...updates } })
    } catch (err) {
      setSaveError(err.message || 'Save failed. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="screen">
      <div className="header">
        <button
          className="btn btn-icon"
          onClick={() => navigate('record', { property, mode })}
          disabled={saving}
        >←</button>
        <div>
          <h1 style={{ fontSize: 16 }}>{isQuickLog ? 'Quick Log' : 'Visit Notes'}</h1>
          <div className="header-subtitle">{property.client_name}</div>
        </div>
      </div>

      <div className="scrollable">
        <div className="pad gap" style={{ paddingBottom: 32 }}>

          {/* Quick Log: just summary + profile updates */}
          {isQuickLog && (
            <ResultSection
              title="📋 Log Summary"
              content={notes?.summary}
              accent="#0891b2"
            />
          )}

          {/* Visit Note: all four sections */}
          {!isQuickLog && (
            <>
              <ResultSection
                title="📄 Invoice Note  —  Customer Facing"
                content={notes?.invoice}
                accent="#2563eb"
              />
              <ResultSection
                title="🔧 Tech Notes  —  Callback Reference"
                content={notes?.tech}
                accent="#7c3aed"
              />
              <ResultSection
                title="🐛 Pest Log Entry"
                content={notes?.pestLog}
                accent="#059669"
              />
            </>
          )}

          {/* Profile updates — both modes */}
          <div className="result-section">
            <div className="result-section-header" style={{ background: '#fef3c718' }}>
              <span className="result-section-title" style={{ color: '#92400e' }}>
                📋 Profile Update Suggestions
              </span>
            </div>
            <div className="result-section-body">
              <ProfileUpdatePreview updates={notes?.profileUpdates} />
            </div>
          </div>

          {/* Follow-up flag */}
          <div style={{
            background: flagFollowup ? '#fffbeb' : 'var(--surface)',
            border: `1.5px solid ${flagFollowup ? '#f59e0b' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            transition: 'all 0.2s',
          }}>
            <button
              onClick={() => setFlagFollowup(f => !f)}
              style={{
                width: '100%', padding: '14px 16px', border: 'none', background: 'none',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 22 }}>{flagFollowup ? '🚩' : '🏳️'}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: flagFollowup ? '#92400e' : 'var(--text)' }}>
                  {flagFollowup ? 'Follow-up flagged' : 'Flag for follow-up'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {flagFollowup ? 'Will show on property until cleared' : 'Tap to mark this property for follow-up'}
                </div>
              </div>
            </button>
            {flagFollowup && (
              <div style={{ padding: '0 16px 16px' }}>
                <textarea
                  className="textarea"
                  style={{ minHeight: 72, background: '#fffbeb', borderColor: '#f59e0b' }}
                  placeholder="What needs to happen? (optional)"
                  value={followupNote}
                  onChange={e => setFollowupNote(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>

          {saveError && <div className="error-box">{saveError}</div>}

          <button
            className="btn btn-success btn-full"
            style={{ height: 56, fontSize: 17, fontWeight: 700 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? <><span className="spinner" /> Saving…</>
              : isQuickLog ? '✓ Save Log & Update Profile' : '✓ Save Visit & Update Profile'}
          </button>

          <button
            className="btn btn-ghost btn-full"
            onClick={() => navigate('property', { property })}
            disabled={saving}
          >
            Discard — back to property
          </button>
        </div>
      </div>
    </div>
  )
}
