# Field Notes

A Progressive Web App for pest control technicians. Records a voice dump after each service stop, transcribes it with OpenAI Whisper, generates structured notes with Claude AI, and maintains a persistent customer profile (CRM-style) in Supabase.

---

## 1. Supabase Setup

### Create project
1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **anon public key** (Settings → API)

### Create tables

Run the following SQL in the Supabase SQL editor (Dashboard → SQL Editor → New query):

```sql
-- Properties table
create table properties (
  id                        uuid primary key default gen_random_uuid(),
  client_name               text,
  address                   text,
  service_type              text,
  -- Service alerts
  alert_allergies           text,
  alert_pets                text,
  alert_reentry             text,
  alert_offlimits           text,
  alert_safety              text,
  -- About client
  client_primary_name       text,
  client_personality        text,
  client_spouse             text,
  client_children           text,
  client_household          text,
  client_occupations        text,
  client_background         text,
  client_time_at_address    text,
  client_language_comms     text,
  client_contact_preference text,
  client_referral_source    text,
  client_avoid              text,
  client_payment_notes      text,
  client_general            text,
  -- Property notes
  property_structure_type   text,
  property_sqft             text,
  property_perimeter_ft     text,
  property_year_built       text,
  property_rear_access      text,
  property_water_access     text,
  property_crawlspace       text,
  property_attic_access     text,
  property_garage           text,
  property_construction_notes text,
  property_landscaping      text,
  property_general          text,
  -- Pest history
  pest_running_summary      text,
  created_at                timestamptz default now()
);

-- Visits table
create table visits (
  id                       uuid primary key default gen_random_uuid(),
  property_id              uuid references properties(id) on delete cascade,
  date                     timestamptz default now(),
  transcript               text,
  invoice_note             text,
  tech_notes               text,
  pest_log_entry           text,
  profile_update_suggestion jsonb,
  created_at               timestamptz default now()
);

-- Row level security (disable for single-user PIN-auth app, or enable with a permissive policy)
alter table properties enable row level security;
alter table visits enable row level security;

create policy "allow all" on properties for all using (true) with check (true);
create policy "allow all" on visits      for all using (true) with check (true);
```

> The permissive RLS policies above grant full access to any authenticated or anonymous request. This is appropriate for a single-user PIN-protected app served from a private URL. For multi-user production use, restrict policies to authenticated users.

---

## 2. Environment Variables

### Local development

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_PIN=1234
```

API keys for the Vercel serverless functions go in `.env.local` without the `VITE_` prefix (they are not exposed to the browser build):

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Vercel (production)

In your Vercel project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
| `VITE_APP_PIN` | your 4-digit PIN |
| `OPENAI_API_KEY` | your OpenAI API key |
| `ANTHROPIC_API_KEY` | your Anthropic API key |

> `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are used only by the Vercel serverless functions in `api/` — they are never sent to the browser.

---

## 3. PWA Icons

The app ships with an SVG icon at `public/icons/icon.svg`. For full PWA support (including iPhone home screen icons), generate PNG versions:

1. Open `public/icons/icon.svg` in any browser or design tool
2. Export at **192×192 px** → save as `public/icons/icon-192.png`
3. Export at **512×512 px** → save as `public/icons/icon-512.png`

Online tools: [svgtopng.com](https://svgtopng.com) or [cloudconvert.com](https://cloudconvert.com/svg-to-png)

---

## 4. Deploy to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
cd field-notes
vercel
# Follow prompts: link to your account, auto-detect Vite framework
# Set environment variables when prompted, or add them in the dashboard after
vercel --prod
```

### Option B — GitHub integration

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import Git repository
3. Vercel auto-detects Vite; build command `npm run build`, output `dist`
4. Add all environment variables in the Vercel dashboard
5. Deploy

### Build settings (if needed)

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 20.x |

---

## 5. Add to iPhone Home Screen (PWA install)

1. Open the app URL in **Safari** on your iPhone (Chrome/Firefox do not support PWA install on iOS)
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it **"Field Notes"** and tap **Add**
5. The app icon appears on your home screen and opens full-screen with no browser chrome

> The app uses `display: standalone` in the manifest, which gives it a native app appearance. It will also show the correct status bar style with `apple-mobile-web-app-status-bar-style: black-translucent`.

---

## 6. App Flow

```
PIN Screen
    ↓ correct PIN
Home Screen (property list + search)
    ↓ tap property
Property Screen
    ├── Alerts tab   — editable service alerts (always shown first)
    ├── Visits tab   — list of past visits + "Start New Visit Note" button
    └── Profile tab  — read-only CRM card (About Client + Property Notes)
            ↓ Start New Visit Note
        Record Screen
            1. Tap microphone to start recording
            2. Tap again to stop
            3. Audio sent to OpenAI Whisper → transcript appears
            4. Review/edit transcript
            5. Tap "Generate Notes" → Claude AI structures the notes
            ↓
        Results Screen
            - Invoice note (customer-facing)
            - Tech notes (callback reference)
            - Pest log entry
            - Profile update suggestions (review before saving)
            ↓ Save Visit
        Property Screen (profile updated, visit saved)
```

---

## 7. Development

```bash
npm install
npm run dev
# App runs at http://localhost:3000
```

The Vercel API routes (`/api/transcribe`, `/api/generate`) require the Vercel CLI to run locally:

```bash
npm i -g vercel
vercel dev
# App + API routes run at http://localhost:3000
```

Without `vercel dev`, the transcription and note generation buttons will return 404. You can still develop the UI by mocking responses or using `vercel dev` for the full stack.

---

## 8. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Plain CSS with CSS custom properties |
| Database | Supabase (PostgreSQL) |
| Auth | 4-digit PIN (sessionStorage) |
| Transcription | OpenAI Whisper (`whisper-1`) |
| AI notes | Anthropic Claude (`claude-sonnet-4-5-20251022`) |
| Hosting | Vercel (static + serverless functions) |
| PWA | Web App Manifest + custom service worker |
