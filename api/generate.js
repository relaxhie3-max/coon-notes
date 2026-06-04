import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are organizing field notes for a professional pest control technician in Houston, Texas. The technician has done a free-form voice dump after a service stop. Extract and structure the information into the required sections. Use plain English for the invoice note. Use pest control industry terminology for tech notes. Be concise and specific. Do not invent details not present in the transcript. For profile updates, only surface genuinely new information not already captured in the existing profile.`

const PROFILE_FIELDS = {
  alerts: ['alert_allergies', 'alert_pets', 'alert_reentry', 'alert_offlimits', 'alert_safety'],
  client: [
    'client_primary_name', 'client_personality', 'client_spouse', 'client_children',
    'client_household', 'client_occupations', 'client_background', 'client_time_at_address',
    'client_language_comms', 'client_contact_preference', 'client_referral_source',
    'client_avoid', 'client_payment_notes', 'client_general',
  ],
  property: [
    'property_structure_type', 'property_sqft', 'property_perimeter_ft', 'property_year_built',
    'property_rear_access', 'property_water_access', 'property_crawlspace', 'property_attic_access',
    'property_garage', 'property_construction_notes', 'property_landscaping', 'property_general',
  ],
}

function buildProfileContext(profile) {
  if (!profile) return 'No existing profile.'
  const lines = []
  lines.push(`Client: ${profile.client_name || 'Unknown'}, ${profile.address || 'Unknown address'}`)
  lines.push(`Service type: ${profile.service_type || 'Unknown'}`)
  lines.push(`Pest running summary: ${profile.pest_running_summary || 'None'}`)
  lines.push('\n--- SERVICE ALERTS ---')
  lines.push(`Allergies: ${profile.alert_allergies || 'None'}`)
  lines.push(`Pets: ${profile.alert_pets || 'None'}`)
  lines.push(`Re-entry: ${profile.alert_reentry || 'None'}`)
  lines.push(`Off-limits: ${profile.alert_offlimits || 'None'}`)
  lines.push(`Safety flags: ${profile.alert_safety || 'None'}`)
  lines.push('\n--- ABOUT CLIENT ---')
  lines.push(`Primary name: ${profile.client_primary_name || 'None'}`)
  lines.push(`Personality: ${profile.client_personality || 'None'}`)
  lines.push(`Spouse: ${profile.client_spouse || 'None'}`)
  lines.push(`Children: ${profile.client_children || 'None'}`)
  lines.push(`Household: ${profile.client_household || 'None'}`)
  lines.push(`Occupations: ${profile.client_occupations || 'None'}`)
  lines.push(`Background: ${profile.client_background || 'None'}`)
  lines.push(`Time at address: ${profile.client_time_at_address || 'None'}`)
  lines.push(`Language/comms: ${profile.client_language_comms || 'None'}`)
  lines.push(`Contact preference: ${profile.client_contact_preference || 'None'}`)
  lines.push(`Referral source: ${profile.client_referral_source || 'None'}`)
  lines.push(`Avoid: ${profile.client_avoid || 'None'}`)
  lines.push(`Payment notes: ${profile.client_payment_notes || 'None'}`)
  lines.push(`General: ${profile.client_general || 'None'}`)
  lines.push('\n--- PROPERTY NOTES ---')
  lines.push(`Structure type: ${profile.property_structure_type || 'None'}`)
  lines.push(`Sq ft: ${profile.property_sqft || 'None'}`)
  lines.push(`Perimeter ft: ${profile.property_perimeter_ft || 'None'}`)
  lines.push(`Year built: ${profile.property_year_built || 'None'}`)
  lines.push(`Rear access: ${profile.property_rear_access || 'None'}`)
  lines.push(`Water access: ${profile.property_water_access || 'None'}`)
  lines.push(`Crawlspace: ${profile.property_crawlspace || 'None'}`)
  lines.push(`Attic access: ${profile.property_attic_access || 'None'}`)
  lines.push(`Garage: ${profile.property_garage || 'None'}`)
  lines.push(`Construction notes: ${profile.property_construction_notes || 'None'}`)
  lines.push(`Landscaping: ${profile.property_landscaping || 'None'}`)
  lines.push(`General: ${profile.property_general || 'None'}`)
  return lines.join('\n')
}

function buildProfileUpdateShape() {
  const shape = { alerts: {}, client: {}, property: {} }
  for (const [section, fields] of Object.entries(PROFILE_FIELDS)) {
    for (const f of fields) shape[section][f] = null
  }
  return JSON.stringify(shape, null, 2)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { mode, transcript, profile, existing, newEntry } = req.body

    // Pest summary rewrite mode
    if (mode === 'pest_summary') {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20251022',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Rewrite the pest activity running summary for this property by incorporating the new pest log entry. Keep it concise (under 200 words), use plain language, and preserve all historically relevant pest patterns from the existing summary.\n\nExisting summary:\n${existing || 'None yet.'}\n\nNew pest log entry:\n${newEntry}\n\nRespond with only the new summary text, no preamble.`,
        }],
      })
      return res.status(200).json({ summary: msg.content[0].text.trim() })
    }

    // Normal note generation mode
    const profileContext = buildProfileContext(profile)
    const profileShape = buildProfileUpdateShape()

    const userMessage = `EXISTING PROPERTY PROFILE:\n${profileContext}\n\n---\n\nTECHNICIAN VOICE DUMP TRANSCRIPT:\n${transcript}\n\n---\n\nGenerate structured notes in this exact JSON format. For profileUpdates, only include fields where the transcript contains new information not already in the existing profile — set fields to null if nothing new was said. Do not add markdown or any text outside the JSON.\n\n{\n  "invoice": "3-5 sentence plain-English note for the customer",\n  "tech": "bullet-point tech notes using industry terminology",\n  "pestLog": "3-5 sentence dated pest log entry",\n  "profileUpdates": ${profileShape}\n}`

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20251022',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = msg.content[0].text.trim()
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(cleaned)

    res.status(200).json(parsed)
  } catch (err) {
    console.error('Generate error:', err)
    res.status(500).json({ error: err.message || 'Generation failed' })
  }
}
