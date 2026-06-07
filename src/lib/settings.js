import { supabase } from './supabase'

export const TOGGLE_GROUPS = [
  {
    label: 'Invoice Note',
    toggles: [
      { key: 'invoice_no_chemicals',       label: 'Never mention chemical or product names',                          default: true },
      { key: 'invoice_mention_followup',   label: 'Always mention if a follow-up visit is recommended',              default: true },
      { key: 'invoice_no_activity',        label: 'If no pest activity was observed, state it clearly',              default: true },
      { key: 'invoice_areas_treated',      label: 'Mention what areas were treated in plain language',               default: false },
      { key: 'invoice_target_pest',        label: 'Explicitly name the target pest(s)',                              default: false },
      { key: 'invoice_customer_home',      label: 'Acknowledge if the customer was home',                            default: false },
      { key: 'invoice_conducive',          label: 'Mention conducive conditions found in plain language',            default: false },
      { key: 'invoice_reentry',            label: 'Include re-entry instructions if applicable',                     default: true },
      { key: 'invoice_customer_name',      label: 'Address the customer by first name',                             default: false },
      { key: 'invoice_concise',            label: 'Keep the note to 3 sentences maximum',                           default: false },
    ],
  },
  {
    label: 'Tech Notes',
    toggles: [
      { key: 'tech_bullets',           label: 'Format as bullet points',                                        default: true },
      { key: 'tech_product_names',     label: 'Include product names and formulations',                         default: true },
      { key: 'tech_app_rates',         label: 'Include application rates and dilutions',                        default: false },
      { key: 'tech_app_method',        label: 'Include application method (spray, bait, dust, granule)',        default: false },
      { key: 'tech_exact_locations',   label: 'Specify exact locations treated',                                default: true },
      { key: 'tech_pest_pressure',     label: 'Rate pest pressure level (light / moderate / heavy)',            default: true },
      { key: 'tech_conducive',         label: 'Document all conducive conditions observed',                     default: false },
      { key: 'tech_untreated',         label: 'Note any areas that could not be treated and why',               default: false },
      { key: 'tech_structural',        label: 'Flag any structural issues observed',                            default: false },
      { key: 'tech_prior_outcome',     label: 'Note if prior treatment outcomes are visible',                   default: false },
    ],
  },
  {
    label: 'Pest Log',
    toggles: [
      { key: 'log_severity',          label: 'Include severity rating',                                        default: true },
      { key: 'log_trend',             label: 'Note if activity has increased or decreased vs. last visit',     default: false },
      { key: 'log_conducive',         label: 'Document conducive conditions in the log entry',                 default: false },
      { key: 'log_prior_outcome',     label: 'Reference prior treatment outcome if visible',                   default: false },
    ],
  },
  {
    label: 'Profile Updates',
    toggles: [
      { key: 'profile_flag_new',          label: 'Surface new info even if similar data already exists',          default: false },
      { key: 'profile_urgent_alerts',     label: 'Immediately flag any new allergy or safety information',        default: true },
      { key: 'profile_pet_changes',       label: 'Always note changes in pet status',                            default: true },
      { key: 'profile_household_changes', label: 'Note changes in household members or occupants',               default: false },
    ],
  },
  {
    label: 'General',
    toggles: [
      { key: 'general_heavy_followup', label: 'Always recommend follow-up if heavy pest activity is noted',    default: true },
      { key: 'general_seasonal',       label: 'Include seasonal pest context when relevant',                   default: false },
      { key: 'general_urgent_flag',    label: 'Flag if property conditions require urgent attention',          default: true },
      { key: 'general_weather',        label: 'Note weather conditions if relevant to pest activity',          default: false },
    ],
  },
]

export const DEFAULT_TOGGLES = Object.fromEntries(
  TOGGLE_GROUPS.flatMap(g => g.toggles.map(t => [t.key, t.default]))
)

export async function loadSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (error || !data) return { toggles: DEFAULT_TOGGLES }
  return { ...data, toggles: { ...DEFAULT_TOGGLES, ...(data.toggles || {}) } }
}

export async function saveSettings(settings) {
  const { error } = await supabase
    .from('settings')
    .upsert({ ...settings, id: 1, updated_at: new Date().toISOString() })
  return error
}
