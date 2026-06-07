/* Multi-select service type chip picker.
   Stores as comma-separated string to fit existing text column. */

const SERVICES = ['General Pest', 'Termite', 'Mosquito', 'Rodent', 'Wildlife']
const FREQUENCY = ['Monthly', 'Bi-Monthly', 'Quarterly', 'One-Time']
const PLANS = ['Core', 'Premium', 'Legendary']

const GROUPS = [
  { label: 'Service', options: SERVICES },
  { label: 'Frequency', options: FREQUENCY },
  { label: 'Plan', options: PLANS },
]

const COLOR = {
  Service:   { active: '#1d4ed8', bg: '#dbeafe' },
  Frequency: { active: '#059669', bg: '#d1fae5' },
  Plan:      { active: '#7c3aed', bg: '#ede9fe' },
}

export function parseServiceType(str) {
  if (!str) return []
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

export function stringifyServiceType(arr) {
  return arr.join(', ')
}

export default function ServiceTypePicker({ value, onChange }) {
  const selected = parseServiceType(value)

  const toggle = (option) => {
    const next = selected.includes(option)
      ? selected.filter(s => s !== option)
      : [...selected, option]
    onChange(stringifyServiceType(next))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {GROUPS.map(group => (
        <div key={group.label}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8,
          }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {group.options.map(option => {
              const active = selected.includes(option)
              const col = COLOR[group.label]
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggle(option)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: 600,
                    border: `2px solid ${active ? col.active : 'var(--border)'}`,
                    background: active ? col.bg : 'white',
                    color: active ? col.active : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    minHeight: 44,
                  }}
                >
                  {active && <span style={{ marginRight: 5 }}>✓</span>}
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
