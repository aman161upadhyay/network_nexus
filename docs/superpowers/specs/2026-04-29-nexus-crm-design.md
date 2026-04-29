# Nexus — Personal Relationship Intelligence Platform
**Design Spec | 2026-04-29**

---

## 1. Product Vision

Nexus is a luxury personal relationship intelligence platform that unifies all your communication channels — Gmail, Outlook, WhatsApp, Instagram, LinkedIn, Google Calendar, and Google Contacts — into a single, beautifully designed command center. It passively captures every touchpoint across your network, scores your relationships, surfaces what needs attention, and helps you stay meaningfully connected with the people who matter.

**Core value proposition:** You never miss an important email, forget a birthday, or let a relationship drift — Nexus surfaces what to act on and who to reach out to, with zero manual data entry.

---

## 2. Target User

A professionally ambitious individual (student, early-career professional, entrepreneur, academic) who:
- Manages 200–2,000 contacts across multiple channels
- Values relationships as a strategic and personal asset
- Receives high email volume and needs intelligent triage
- Wants to maintain a warm, active network without the overhead of a spreadsheet

---

## 3. Application Name & Branding

- **Product name:** Nexus
- **Tagline:** "Your network, intelligently"
- **Visual identity:** Dark glassmorphism — near-black backgrounds, frosted glass cards, electric blue + gold accents, 3D network graph as the hero element
- **Typography:** Geist (Vercel's typeface) for data/UI, Inter for body text
- **Palette:**
  - Background: `#080810` (near-black with deep blue undertone)
  - Card surface: `rgba(255, 255, 255, 0.05)` with `backdrop-blur-xl`
  - Card border: `rgba(255, 255, 255, 0.10)`
  - Accent blue: `#3b82f6`
  - Accent gold (VIP): `#f59e0b`
  - Success green: `#10b981`
  - Warning orange: `#f97316`
  - Danger red: `#ef4444`

---

## 4. Core Features

### 4.1 Relationship Intelligence Engine
- **Relationship Score (0–100):** Two dimensions per contact — Personal (0–100) and Professional (0–100). Computed from: recency, frequency, reciprocity, response time, depth (email thread length / message length), and channel diversity. Exponential time decay applied (half-life ~90 days).
- **Relationship Ring:** Visual arc around every contact avatar — color-coded by score tier (green 80–100, yellow 40–79, orange 20–39, red 0–19). Animated pulse on contacts needing attention.
- **Cooling Alert:** Contacts whose score has dropped >15 points in 30 days surface as "needs attention" cards on the dashboard.
- **Network Graph:** Interactive 3D force graph (react-force-graph-3d) — node size = relationship score, node color = contact category, edge thickness = interaction frequency, edge opacity = recency. Filters by category, score tier, company, location.

### 4.2 Smart Email Triage
- **Priority Inbox:** AI-scored emails (0–100 priority) surfaced first. Scoring factors: sender relationship score, email urgency signals (deadline keywords, action verbs), sender authority (professor title, leadership role, company name match), thread age, unanswered reply check.
- **Email Categories (auto-assigned):**
  - `People` — person-to-person, from contacts in your network
  - `Deadlines` — contains deadline/due date language
  - `Job & Career` — job applications, recruiter outreach, offer letters
  - `VIP Senders` — professors, managers, executives (auto-detected by title)
  - `Needs Reply` — emails you have not replied to within 48h
  - `Newsletters` — auto-deprioritized
  - `Receipts` — auto-archived
- **Actions:** Keyboard-first (E = archive, R = reply, S = snooze, L = label). Each email shows AI-generated one-line summary and suggested reply.

### 4.3 People & Contacts Hub
- Unified contact record merging data from all connected sources
- Contact deduplication (exact email match + fuzzy name match)
- Fields: name, photo, emails, phones, company, title, LinkedIn URL, Instagram handle, WhatsApp number, birthday, anniversary, notes, tags, relationship scores, interaction timeline
- "Reach Out" queue: contacts flagged for coffee chat, check-in, or congratulations
- Birthday & anniversary reminders with 7-day advance notification

### 4.4 Calendar Intelligence
- Shows upcoming meetings with attendee relationship scores
- "Pre-meeting brief" card: AI summary of your history with each attendee
- Flags meetings with contacts you haven't spoken to in >90 days
- Extracts new contacts from meeting attendees (auto-adds to network)

### 4.5 Network Graph
- Full-screen 3D interactive graph
- 2D / 3D toggle
- Cluster mode: group by company, location, relationship category
- Search to highlight nodes
- Click node → slide-in contact panel
- Export as PNG/SVG

### 4.6 Intelligence Feed
- Aggregated life events from connected accounts: LinkedIn job changes, Instagram posts, calendar meetings, birthdays today, "haven't talked in X days" alerts
- Filter by channel (Gmail / LinkedIn / Instagram / WhatsApp / Calendar)
- Each item has a quick action: "Send message", "Schedule coffee chat", "Wish happy birthday"

### 4.7 Statistics Dashboard
- Interaction volume chart (by week/month/year, by channel)
- Top 10 most-contacted people
- Response rate (% of your emails that got a reply)
- Network growth over time
- Relationship score distribution histogram
- Dormant contacts count (no interaction in >180 days)
- Coffee chat tracker (how many 1:1 meetings this month/quarter)

### 4.8 Reminders & Smart Nudges
- Birthday reminders (7 days before, day-of)
- Anniversary reminders (work anniversary, relationship anniversary)
- Re-engagement nudges ("You haven't messaged John in 3 months")
- Job application follow-up reminders
- Meeting follow-up ("Did you send the follow-up email after your meeting with Sarah?")
- All reminders delivered in-app + email digest (daily or weekly, user-configurable)

### 4.9 Authentication & Security
- Signup: username, full name, email, password (bcrypt hashed), optional profile photo
- OAuth sign-in: Google, GitHub, Microsoft
- Two-factor authentication (TOTP via authenticator app)
- Session management with JWT (short-lived access tokens + rotating refresh tokens)
- All OAuth tokens for connected services stored encrypted at rest (AES-256)
- Row-level security on all database tables (users only see their own data)
- Connected account permissions shown clearly in settings
- Revoke any integration at any time

---

## 5. System Architecture

### 5.1 Overview

```
┌─────────────────────────────────────────────────────────┐
│                    NEXUS (Next.js 15)                   │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   App Router │  │ Route Handler│  │  Server      │  │
│  │   (RSC/RCC)  │  │   (tRPC API) │  │  Actions     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         └─────────────────┴──────────────────┘          │
│                           │                             │
│              ┌────────────┼────────────┐                │
│              ▼            ▼            ▼                │
│         ┌─────────┐ ┌─────────┐ ┌──────────┐          │
│         │  Auth   │ │  Data   │ │  Jobs    │          │
│         │ (Better │ │ Layer   │ │ (Inngest)│          │
│         │  Auth)  │ │(Drizzle)│ └─────┬────┘          │
│         └────┬────┘ └────┬────┘       │               │
└──────────────┼───────────┼────────────┼───────────────┘
               │           │            │
               ▼           ▼            ▼
         ┌──────────┐ ┌─────────┐ ┌──────────────────┐
         │   Neon   │ │  Neon   │ │   Integration    │
         │ Postgres │ │Postgres │ │   Workers        │
         │  (Auth)  │ │ (Data)  │ │  (Gmail/WA/IG)   │
         └──────────┘ └─────────┘ └──────────────────┘
```

### 5.2 Monorepo Structure

```
nexus/
├── apps/
│   └── web/                          # Next.js 15 App Router
│       ├── app/
│       │   ├── (auth)/               # Login, signup, onboarding
│       │   │   ├── login/page.tsx
│       │   │   ├── signup/page.tsx
│       │   │   └── onboarding/page.tsx
│       │   ├── (dashboard)/          # Authenticated app shell
│       │   │   ├── layout.tsx        # Sidebar + nav
│       │   │   ├── page.tsx          # Command Center (home)
│       │   │   ├── email/page.tsx    # Email triage
│       │   │   ├── contacts/
│       │   │   │   ├── page.tsx      # Contact list
│       │   │   │   └── [id]/page.tsx # Contact profile
│       │   │   ├── graph/page.tsx    # 3D Network graph
│       │   │   ├── calendar/page.tsx # Calendar view
│       │   │   ├── stats/page.tsx    # Statistics
│       │   │   ├── reminders/page.tsx
│       │   │   └── settings/
│       │   │       ├── page.tsx      # General settings
│       │   │       ├── integrations/ # Connected accounts
│       │   │       └── security/     # 2FA, sessions
│       │   ├── (landing)/            # Public marketing pages
│       │   │   └── page.tsx          # Landing page
│       │   └── api/
│       │       ├── auth/[...all]/route.ts   # Better Auth handler
│       │       ├── trpc/[trpc]/route.ts     # tRPC API
│       │       ├── inngest/route.ts          # Inngest webhook
│       │       └── webhooks/
│       │           ├── gmail/route.ts
│       │           └── outlook/route.ts
│       ├── components/
│       │   ├── ui/                   # shadcn/ui base components
│       │   ├── layout/               # Sidebar, topbar, nav
│       │   ├── contacts/             # Contact cards, timelines
│       │   ├── email/                # Email list, email view
│       │   ├── graph/                # Network graph component
│       │   ├── stats/                # Charts, sparklines
│       │   └── shared/               # Avatar, RelationshipRing, etc.
│       ├── lib/
│       │   ├── auth.ts               # Better Auth config
│       │   ├── db/                   # Drizzle schema + client
│       │   ├── trpc/                 # tRPC router + procedures
│       │   ├── scoring/              # Relationship score engine
│       │   ├── integrations/         # Gmail, WA, IG, LinkedIn clients
│       │   └── ai/                   # Claude API for email scoring
│       └── public/
├── packages/
│   └── db/                           # Shared Drizzle schema
└── package.json                      # Turborepo config
```

### 5.3 Database Schema (Neon Postgres + Drizzle ORM)

**Core tables:**

```sql
-- users (managed by Better Auth)
users (id, email, username, name, image, created_at, updated_at)

-- contacts
contacts (
  id, user_id, display_name, first_name, last_name,
  emails[], phones[], company, title,
  linkedin_url, instagram_handle, whatsapp_number,
  birthday, work_anniversary,
  personal_score SMALLINT,      -- 0-100
  professional_score SMALLINT,  -- 0-100
  last_contact_at, created_at, updated_at
)

-- contact_source_links (deduplication bridge)
contact_source_links (
  id, contact_id, source ENUM('google','outlook','whatsapp','instagram','manual'),
  source_id TEXT, raw_data JSONB
)

-- interactions
interactions (
  id, user_id, contact_id,
  channel ENUM('email','whatsapp','instagram','linkedin','calendar','phone'),
  direction ENUM('inbound','outbound'),
  subject TEXT, body_preview TEXT,
  thread_id TEXT, external_id TEXT,
  occurred_at TIMESTAMPTZ,
  metadata JSONB
)

-- emails (mirrored for triage)
emails (
  id, user_id, account_id,
  thread_id, message_id,
  subject, from_email, from_name, to_emails[],
  body_preview, body_html,
  received_at,
  is_read BOOL, is_starred BOOL,
  ai_priority_score SMALLINT,   -- 0-100
  ai_category TEXT,
  ai_summary TEXT,
  needs_reply BOOL,
  replied_at TIMESTAMPTZ
)

-- connected_accounts
connected_accounts (
  id, user_id,
  provider ENUM('google','microsoft','whatsapp','instagram','linkedin'),
  account_email TEXT, account_name TEXT,
  access_token_enc TEXT,   -- AES-256 encrypted
  refresh_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_active BOOL,
  last_synced_at TIMESTAMPTZ
)

-- reminders
reminders (
  id, user_id, contact_id,
  type ENUM('birthday','anniversary','re_engagement','follow_up','custom'),
  due_at TIMESTAMPTZ, dismissed_at TIMESTAMPTZ,
  title TEXT, body TEXT
)

-- score_history (for trend charts)
score_history (
  id, contact_id, personal_score, professional_score, recorded_at TIMESTAMPTZ
)

-- tags
tags (id, user_id, name, color)
contact_tags (contact_id, tag_id)

-- user_settings
user_settings (
  user_id,
  reminder_digest ENUM('none','daily','weekly'),
  digest_time TIME,
  vip_titles TEXT[],   -- ['professor','ceo','director','founder']
  dormant_threshold_days INT DEFAULT 90,
  timezone TEXT
)
```

---

## 6. Integration Architecture

### 6.1 Gmail
- **Auth:** Google OAuth2 (`gmail.readonly`, `gmail.modify`, `contacts.readonly`, `calendar.readonly`)
- **Sync:** Initial full sync via Gmail API (`users.messages.list` paginated). Subsequent updates via Gmail Push Notifications (Google Cloud Pub/Sub → Inngest webhook).
- **Parser:** `postal-mime` for MIME decoding on Vercel Edge
- **Frequency:** Real-time (push) for new emails; full re-sync weekly

### 6.2 Outlook / Microsoft Graph
- **Auth:** Microsoft OAuth2 via MSAL (`Mail.Read`, `Mail.ReadWrite`, `Contacts.Read`, `Calendars.Read`)
- **Sync:** Webhook subscriptions via `/subscriptions` endpoint → Inngest
- **Frequency:** Real-time (webhook) for new emails; re-sync weekly

### 6.3 Google Contacts & Calendar
- **Contacts:** People API (`/people/me/connections`) — imported on connect, re-synced daily
- **Calendar:** Calendar API v3 — events imported, attendees extracted as contact signals
- **Sync:** Inngest cron job (daily at 3 AM user's timezone)

### 6.4 WhatsApp (Baileys)
- **Approach:** Personal account linked via QR code (Linked Devices feature). User scans QR in Nexus app.
- **Implementation:** Baileys Node.js library running as a long-lived Inngest function (or dedicated microservice on Vercel with Fluid Compute)
- **Data captured:** Message sent/received timestamps, contact info, message count per conversation (not full message content by default — privacy-first)
- **User control:** Option to sync full message text or metadata-only

### 6.5 Instagram
- **Auth:** Instagram Graph API (`instagram_basic`, `instagram_manage_messages`)
- **Requirement:** Business or Creator account (Instagram Basic Display API is EOL)
- **Data captured:** DM thread counts, last message date (metadata, not content by default)
- **Limitation clearly communicated** to users during connect flow

### 6.6 LinkedIn
- **Primary approach:** Browser extension (Plasmo framework) — user visits LinkedIn profiles, extension one-click imports contact data to Nexus. No API key needed.
- **Secondary:** Manual LinkedIn CSV import (Settings > Data Privacy > Connections export)
- **No API scraping** — stays within ToS

---

## 7. Relationship Scoring Engine

```typescript
// lib/scoring/relationship-score.ts

interface ScoreInput {
  interactions: Interaction[];
  contactSince: Date;
  mutualConnections?: number;
}

function computeScore(input: ScoreInput): { personal: number; professional: number } {
  const now = Date.now();
  const DECAY_LAMBDA = 0.011; // ~90 day half-life

  let rawScore = 0;

  for (const interaction of input.interactions) {
    const ageDays = (now - interaction.occurredAt.getTime()) / 86_400_000;
    const decayFactor = Math.exp(-DECAY_LAMBDA * ageDays);

    // Base weight by channel
    const channelWeight = {
      email: 1.0,
      whatsapp: 1.2,   // more personal
      calendar: 1.5,   // in-person meeting = strongest signal
      instagram: 0.6,
      linkedin: 0.4,
    }[interaction.channel] ?? 0.5;

    // Direction weight (reciprocal is stronger)
    const directionWeight = interaction.direction === 'inbound' ? 1.0 : 0.7;

    rawScore += channelWeight * directionWeight * decayFactor;
  }

  // Normalize to 0-100
  const normalized = Math.min(100, Math.round((rawScore / 50) * 100));

  // Personal vs professional split based on channel mix
  const calendarMeetings = input.interactions.filter(i => i.channel === 'calendar').length;
  const whatsappMessages = input.interactions.filter(i => i.channel === 'whatsapp').length;
  const emailCount = input.interactions.filter(i => i.channel === 'email').length;

  const professionalWeight = emailCount / (emailCount + whatsappMessages + 1);
  const personalWeight = 1 - professionalWeight;

  return {
    personal: Math.round(normalized * personalWeight * 1.3),  // cap at 100
    professional: Math.round(normalized * professionalWeight * 1.3),
  };
}
```

**Score recalculation:** Inngest cron runs nightly, recalculates scores for contacts with new interactions or whose last recalculation was >24h ago. Score history stored for trend visualization.

---

## 8. AI Features (Claude API)

All AI features use `claude-sonnet-4-6` via the Anthropic SDK.

### 8.1 Email Priority Scoring
- Input: from_name, from_email, subject, body_preview, sender_relationship_score, sender_title
- Output: priority_score (0–100), category, one-line summary, suggested_reply (optional)
- Runs as Inngest function on each new email sync batch

### 8.2 VIP Sender Detection
- Detects professor titles ("Prof.", "Dr.", department email domains), executive titles in signature
- Updates `contacts.title` and marks as VIP in email triage

### 8.3 Contact Enrichment
- Given a contact name + company, Claude suggests their probable title/role
- Run optionally on manual import

### 8.4 Reach-Out Drafts
- User clicks "Reach Out" on a contact → Claude generates a warm, context-aware message draft based on interaction history ("It's been a while since we caught up at [last calendar event]...")
- Draft presented in a modal for user editing before sending

### 8.5 Pre-Meeting Brief
- For each calendar event, Claude generates a 3-bullet summary of your relationship with each attendee (last topic discussed, shared connections, open items)

---

## 9. UI Screens (Detailed)

### 9.1 Landing Page (Public)
- Dark glassmorphism hero with animated 3D network graph in the background
- Headline: "Your Network, Intelligently"
- Feature highlights with screenshots: Priority Inbox, Network Graph, Relationship Scores
- Pricing section (Freemium: 1 email account, 500 contacts; Pro: $12/month unlimited)
- Sign up CTA → `/signup`

### 9.2 Auth Pages
- Signup: username, full name, email, password + Google/GitHub/Microsoft OAuth
- Login: email+password or OAuth
- All styled with glassmorphism on dark background — not generic auth page aesthetic

### 9.3 Onboarding Flow (4 steps)
1. **Connect email** — Gmail or Outlook OAuth (required, skip-able)
2. **Connect WhatsApp** — QR scan modal (optional)
3. **Connect Instagram / LinkedIn** — OAuth / extension (optional)
4. **Set preferences** — VIP title list, reminder digest schedule, timezone

### 9.4 Command Center (Home Dashboard)
Layout: 12-column CSS Grid
- **Left panel (3 cols):** Today's agenda (calendar events), upcoming reminders
- **Center (6 cols):** Priority inbox preview (top 5 emails needing action) + Intelligence Feed
- **Right panel (3 cols):** Relationship health cards — top 3 "needs attention" contacts, quick stats (new contacts this week, emails awaiting reply)
- **Floating network graph mini-view** — circular, 200px, in top-right of center panel, links to full graph

### 9.5 Email Triage (`/email`)
- Left sidebar: category filter tabs (All, People, Deadlines, Job & Career, VIP, Needs Reply)
- Email list (center): each email shows avatar, sender name, relationship score pill, AI priority score bar, subject, AI one-line summary, time
- Email view (right): full email content, AI summary card, suggested reply, keyboard shortcuts bar
- Keyboard shortcuts displayed as floating tooltip in bottom-right

### 9.6 Contacts (`/contacts`)
- Table view (default) + Card grid toggle
- Filter: by score tier, tag, company, channel
- Sort: by personal score, professional score, last contact, name
- Search: fuzzy search by name, company, email
- Quick actions per row: "Reach Out", "Schedule", "View Profile"

### 9.7 Contact Profile (`/contacts/[id]`)
- Large avatar with animated relationship ring (personal + professional dual arcs)
- Score breakdown card (recency, frequency, reciprocity bars)
- Interaction timeline (chronological feed of all touchpoints across channels)
- Contact details panel (email, phone, LinkedIn, Instagram, company)
- Upcoming calendar events with this contact
- AI-generated "Catch Up" message draft
- Tags + notes editor

### 9.8 Network Graph (`/graph`)
- Full-screen 3D force graph (react-force-graph-3d)
- Toolbar: 2D/3D toggle, filter by category/score, search, export
- Node hover: floating contact card (name, score, company, photo)
- Node click: slide-in full contact panel (same as `/contacts/[id]` but as sidebar)
- Legend: color = category, size = score, edge opacity = recency
- Cluster view button: groups nodes by company/location

### 9.9 Calendar (`/calendar`)
- Month/week/day view (built on FullCalendar or custom)
- Each event shows attendee avatars with relationship rings
- Click event: shows pre-meeting AI brief
- "New contacts from meetings" section — attendees not yet in Nexus

### 9.10 Statistics (`/stats`)
- Interaction volume (area chart by week) — filterable by channel
- Top contacts (horizontal bar chart with avatars)
- Network composition (donut chart: personal vs professional vs cold)
- Response rate gauge
- Relationship score distribution (histogram)
- Network growth line chart
- Coffee chat tracker (count with target)

### 9.11 Reminders (`/reminders`)
- Kanban-style: Today / This Week / Upcoming / Snoozed
- Each card: contact avatar + relationship ring, reminder type icon, message, action buttons (dismiss, snooze, act)
- "Act" button opens reach-out modal with AI draft

### 9.12 Settings
- **General:** Name, photo, timezone, digest frequency
- **Integrations:** Connected accounts list with status/last-sync, revoke button, add new
- **VIP List:** Editable list of titles/email domains that mark someone as VIP
- **Security:** Change password, enable/disable 2FA (TOTP), active sessions, delete account

---

## 10. Security Architecture

- **Auth:** Better Auth with Neon Postgres adapter. JWT access tokens (15 min TTL), rotating refresh tokens (30 days). Stored in httpOnly cookies.
- **Integration tokens:** All OAuth access/refresh tokens encrypted with AES-256-GCM before writing to DB. Encryption key stored in Vercel environment variable (not in DB).
- **Row-Level Security:** Neon Postgres RLS policies ensure `user_id = auth.uid()` on all queries.
- **Rate limiting:** Vercel Edge middleware rate-limits auth endpoints (5 req/min per IP for login/signup).
- **CSRF protection:** Better Auth handles CSRF tokens automatically.
- **2FA:** TOTP (RFC 6238) via `otpauth` npm package. Backup codes generated on 2FA setup (hashed in DB).
- **Audit log:** All OAuth connect/disconnect events, login events, and 2FA changes logged to `audit_log` table.
- **Data minimization:** WhatsApp and Instagram sync metadata-only by default (timestamps + contact IDs, not message content). User must opt-in to full content sync.

---

## 11. Background Job Architecture (Inngest)

```
inngest/
├── email-sync.ts          # Gmail/Outlook full sync + incremental
├── contact-sync.ts        # Google Contacts + Calendar attendees
├── score-recalculate.ts   # Nightly score computation
├── reminder-check.ts      # Daily reminder generation (birthdays, re-engagement)
├── email-ai-score.ts      # Claude AI scoring for new email batches
├── whatsapp-listener.ts   # Baileys session management + message events
└── digest-send.ts         # Daily/weekly email digest via Resend
```

**Scheduled jobs:**
- Email AI scoring: every 15 minutes (triggered by email sync webhook)
- Score recalculation: daily at 2 AM UTC
- Birthday/anniversary reminder generation: daily at 6 AM UTC
- Contact re-sync: daily at 3 AM UTC
- Digest send: user-configured time (default 8 AM local timezone)

---

## 12. Third-Party Services

| Service | Purpose | Cost |
|---|---|---|
| **Neon Postgres** | Primary database (Vercel Marketplace) | Free tier → Scale |
| **Vercel** | Hosting, edge functions, cron | Pro plan |
| **Inngest** | Background job orchestration | Free tier → Growth |
| **Resend** | Transactional email (reminders, digest) | Free 3k/month |
| **Anthropic Claude API** | Email scoring, enrichment, drafts | Per-token |
| **Google Cloud** | Gmail Push Notifications (Pub/Sub) | Negligible |
| **Vercel Blob** | User avatars, contact photos | Included |

---

## 13. MVP Scope (Phase 1)

Phase 1 is scoped to deliver a working product with the highest-value features:

**In scope for MVP:**
- Auth (signup, login, Google OAuth, 2FA)
- Gmail integration (sync, triage, AI scoring)
- Google Contacts import
- Google Calendar import
- Contact hub (list, profile, interaction timeline)
- Relationship scoring engine (basic version)
- Network graph (2D, react-force-graph-2d)
- Command Center dashboard
- Birthday reminders
- Statistics page (basic charts)
- Settings (integrations, preferences)
- Landing page

**Phase 2 additions:**
- Outlook/Microsoft Graph integration
- WhatsApp (Baileys)
- Instagram Graph API
- LinkedIn browser extension (Plasmo)
- 3D network graph (react-force-graph-3d)
- AI reach-out drafts
- Pre-meeting AI brief
- Advanced email categories (job, deadlines)
- Reminder kanban
- Weekly digest email

**Phase 3 additions:**
- Mobile app (React Native / Expo)
- Team/shared contacts (optional)
- CRM-style pipeline views
- Advanced AI enrichment
- Export (CSV, JSON)
- Zapier/Make.com integration

---

## 14. Tech Stack Summary

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Animations | Framer Motion |
| Network Graph | react-force-graph-2d/3d |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | Better Auth |
| API | tRPC v11 |
| ORM | Drizzle ORM |
| Database | Neon Postgres |
| Background Jobs | Inngest |
| Email Sending | Resend |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| File Storage | Vercel Blob |
| Hosting | Vercel |
| Package Manager | pnpm |
| Monorepo | Turborepo |

---

## 15. Open Questions (Resolved)

| Question | Decision |
|---|---|
| Supabase vs Neon? | **Neon** — user specified |
| Better Auth vs NextAuth? | **Better Auth** — more features, built for Next.js 15, Neon adapter available |
| tRPC vs REST? | **tRPC** — type safety end-to-end, works well with React Query |
| WhatsApp personal vs Business API? | **Baileys** for MVP (personal), migrate to official Cloud API for production product |
| LinkedIn API vs extension? | **Browser extension** (Plasmo) — only viable approach without enterprise API access |
| Monorepo? | **Turborepo** — positions for future mobile app in same repo |

