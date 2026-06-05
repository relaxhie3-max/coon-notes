/* CheatSheet — visible while recording
   Zone 1: property-aware profile gaps
   Zone 2: fixed visit prompts
*/

const PROFILE_GROUPS = [
  {
    label: '⚠️ Service Alerts',
    fields: [
      { key: 'alert_allergies',  label: 'Allergies' },
      { key: 'alert_pets',       label: 'Pets' },
      { key: 'alert_reentry',    label: 'Re-entry concerns' },
      { key: 'alert_offlimits',  label: 'Off-limits areas' },
      { key: 'alert_safety',     label: 'Safety flags' },
    ],
  },
  {
    label: '🔑 Access & Structure',
    fields: [
      { key: 'property_rear_access',   label: 'Rear access / gate' },
      { key: 'property_garage',        label: 'Garage' },
      { key: 'property_crawlspace',    label: 'Crawl space' },
      { key: 'property_attic_access',  label: 'Attic access' },
      { key: 'property_water_access',  label: 'Outdoor water access' },
    ],
  },
  {
    label: '🏠 Property Details',
    fields: [
      { key: 'property_structure_type',     label: 'Structure type' },
      { key: 'property_sqft',               label: 'Sq footage' },
      { key: 'property_perimeter_ft',       label: 'Perimeter (ft)' },
      { key: 'property_year_built',         label: 'Year built' },
      { key: 'property_construction_notes', label: 'Construction notes' },
      { key: 'property_landscaping',        label: 'Landscaping' },
      { key: 'property_general',            label: 'Property general' },
    ],
  },
  {
    label: '👤 Client',
    fields: [
      { key: 'client_primary_name',       label: 'Primary name' },
      { key: 'client_personality',        label: 'Personality read' },
      { key: 'client_spouse',             label: 'Spouse / partner' },
      { key: 'client_children',           label: 'Children' },
      { key: 'client_household',          label: 'Other household members' },
      { key: 'client_occupations',        label: 'Occupations / schedule' },
      { key: 'client_background',         label: 'Background' },
      { key: 'client_time_at_address',    label: 'Time at address' },
      { key: 'client_language_comms',     label: 'Language / comms' },
      { key: 'client_contact_preference', label: 'Contact preference' },
      { key: 'client_referral_source',    label: 'How they found you' },
      { key: 'client_avoid',              label: 'Things to avoid' },
      { key: 'client_payment_notes',      label: 'Payment notes' },
      { key: 'client_general',            label: 'Client general' },
    ],
  },
]

const VISIT_PROMPTS = [
  {
    icon: '🐛',
    label: 'Pest Activity',
    prompts: [
      'What pests did you see — species if known?',
      'Where exactly: room, wall, exterior zone?',
      'Severity — light, moderate, heavy?',
      'Live vs. dead? Frass, nesting, damage visible?',
      'Any new activity compared to last visit?',
    ],
  },
  {
    icon: '🔧',
    label: 'Treatment',
    prompts: [
      'What product(s) did you apply?',
      'Where did you treat — interior, exterior, perimeter, specific spots?',
      'Any areas you couldn\'t treat, and why?',
      'Application method — spray, bait, dust, granule?',
      'Anything unusual about the application?',
    ],
  },
  {
    icon: '🏠',
    label: 'Property Observations',
    prompts: [
      'Any changes since last visit — construction, landscaping, damage?',
      'Moisture issues, standing water, or conducive conditions?',
      'New entry points or gaps in structure?',
      'Gate code, access, or lockbox changes?',
    ],
  },
  {
    icon: '👤',
    label: 'Client Interaction',
    prompts: [
      'Was anyone home? Who?',
      'Concerns, complaints, or questions raised?',
      'Anything personal worth noting — new job, travel, life changes?',
      'Payment or account anything to flag?',
    ],
  },
  {
    icon: '📋',
    label: 'Follow-up',
    prompts: [
      'Does this stop need a callback?',
      'Anything to check or address on next visit?',
      'Quote opportunity or upsell to mention?',
      'Any re-entry instructions to communicate?',
    ],
  },
]

function FieldRow({ label, value }) {
  const filled = value && value.trim()
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '5px 0',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
    }}>
      <span style={{
        marginTop: 3,
        width: 8, height: 8,
        borderRadius: '50%',
        flexShrink: 0,
        background: filled ? '#16a34a' : '#f59e0b',
      }} />
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#374151',
        flexShrink: 0,
        minWidth: 130,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13,
        color: filled ? '#374151' : '#9ca3af',
        fontStyle: filled ? 'normal' : 'italic',
        lineHeight: 1.4,
      }}>
        {filled ? value : 'not on file'}
      </span>
    </div>
  )
}

export default function CheatSheet({ property }) {
  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* Zone 1 — Profile */}
      <div style={{
        background: '#1e293b',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        <div style={{
          padding: '10px 14px',
          background: '#0f172a',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: '#94a3b8',
          textTransform: 'uppercase',
        }}>
          Profile — say anything new out loud
        </div>

        {PROFILE_GROUPS.map(group => {
          const hasAnyFilled = group.fields.some(f => property[f.key]?.trim())
          return (
            <div key={group.label} style={{ padding: '10px 14px', borderBottom: '1px solid #334155' }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#64748b',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {group.label}
              </div>
              {group.fields.map(f => (
                <FieldRow
                  key={f.key}
                  label={f.label}
                  value={property[f.key]}
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* Zone 2 — Visit prompts */}
      <div style={{
        background: '#1e293b',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 14px',
          background: '#0f172a',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: '#94a3b8',
          textTransform: 'uppercase',
        }}>
          Visit checklist — cover each section
        </div>

        {VISIT_PROMPTS.map(section => (
          <div key={section.label} style={{ padding: '10px 14px', borderBottom: '1px solid #334155' }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#e2e8f0',
              marginBottom: 8,
            }}>
              {section.icon} {section.label}
            </div>
            {section.prompts.map((p, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                padding: '3px 0',
              }}>
                <span style={{ color: '#475569', fontSize: 12, marginTop: 1, flexShrink: 0 }}>›</span>
                <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>{p}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  )
}
