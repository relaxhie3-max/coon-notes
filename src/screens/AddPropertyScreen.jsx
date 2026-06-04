import { useState } from 'react'
import { supabase } from '../lib/supabase'

const SERVICE_TYPES = ['General pest', 'Termite', 'Mosquito', 'Rodent', 'Wildlife', 'Multi-service']

export default function AddPropertyScreen({ navigate }) {
  const [form, setForm] = useState({
    client_name: '',
    address: '',
    service_type: 'General pest',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.client_name.trim()) return setError('Client name is required.')
    if (!form.address.trim()) return setError('Address is required.')

    setSaving(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('properties')
        .insert({
          client_name: form.client_name.trim(),
          address: form.address.trim(),
          service_type: form.service_type,
        })
        .select()
        .single()

      if (err) throw err
      navigate('property', { property: data })
    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="btn btn-icon" onClick={() => navigate('home')}>
          ←
        </button>
        <h1>New Property</h1>
      </div>

      <div className="scrollable">
        <div className="pad gap" style={{ paddingTop: 24 }}>
          {error && <div className="error-box">{error}</div>}

          <div className="form-group">
            <label className="label" htmlFor="client_name">Client Name *</label>
            <input
              id="client_name"
              className="input"
              type="text"
              placeholder="e.g. Smith Family"
              value={form.client_name}
              onChange={e => set('client_name', e.target.value)}
              autoCapitalize="words"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="address">Address *</label>
            <input
              id="address"
              className="input"
              type="text"
              placeholder="e.g. 1234 Oak Ln, Houston TX 77001"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              autoCapitalize="words"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="service_type">Service Type</label>
            <select
              id="service_type"
              className="select"
              value={form.service_type}
              onChange={e => set('service_type', e.target.value)}
            >
              {SERVICE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <><span className="spinner" /> Saving…</> : 'Save Property'}
          </button>
        </div>
      </div>
    </div>
  )
}
