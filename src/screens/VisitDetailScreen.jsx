import { useState } from 'react'

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

function DetailSection({ title, content, accent }) {
  if (!content) return null
  return (
    <div className="result-section">
      <div className="result-section-header" style={accent ? { background: accent + '18' } : {}}>
        <span className="result-section-title" style={accent ? { color: accent } : {}}>
          {title}
        </span>
        <CopyButton text={content} />
      </div>
      <div className="result-section-body">{content}</div>
    </div>
  )
}

function ProfileChanges({ updates }) {
  const hasAny = Object.entries(updates || {}).some(([, fields]) =>
    Object.values(fields || {}).some(v => v && v !== 'null')
  )

  if (!hasAny) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: 15, fontStyle: 'italic' }}>
        No profile changes were recorded for this entry.
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

export default function VisitDetailScreen({ navigate, property, visit }) {
  const isQuickLog = visit.mode === 'quick_log'

  const formatDate = (str) => new Date(str).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })

  return (
    <div className="screen">
      <div className="header">
        <button className="btn btn-icon" onClick={() => navigate('property', { property })}>
          ←
        </button>
        <div>
          <h1 style={{ fontSize: 16 }}>
            {isQuickLog ? '📋 Quick Log' : '📝 Visit Note'}
          </h1>
          <div className="header-subtitle">{formatDate(visit.created_at)}</div>
        </div>
      </div>

      <div className="scrollable">
        <div className="pad gap" style={{ paddingBottom: 32 }}>

          {/* Quick Log: summary */}
          {isQuickLog && visit.log_summary && (
            <DetailSection
              title="📋 Log Summary"
              content={visit.log_summary}
              accent="#0891b2"
            />
          )}

          {/* Visit Note: invoice, tech notes, pest log */}
          {!isQuickLog && (
            <>
              <DetailSection
                title="📄 Invoice Note"
                content={visit.invoice_note}
                accent="#2563eb"
              />
              <DetailSection
                title="🔧 Tech Notes"
                content={visit.tech_notes}
                accent="#7c3aed"
              />
              <DetailSection
                title="🐛 Pest Log Entry"
                content={visit.pest_log_entry}
                accent="#059669"
              />
            </>
          )}

          {/* Profile changes — both modes */}
          <div className="result-section">
            <div className="result-section-header" style={{ background: '#fef3c718' }}>
              <span className="result-section-title" style={{ color: '#92400e' }}>
                📋 Profile Changes Made
              </span>
            </div>
            <div className="result-section-body">
              <ProfileChanges updates={visit.profile_update_suggestion} />
            </div>
          </div>

          {/* Transcript (collapsible) */}
          {visit.transcript && (
            <details style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <summary style={{
                padding: '12px 16px', fontWeight: 600, fontSize: 13,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--text-muted)', cursor: 'pointer', listStyle: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                Original Transcript
                <span style={{ fontSize: 16 }}>›</span>
              </summary>
              <div style={{ padding: '0 16px 16px', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                {visit.transcript}
              </div>
            </details>
          )}

        </div>
      </div>
    </div>
  )
}
