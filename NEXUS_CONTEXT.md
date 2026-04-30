# Nexus CRM — Build Context & Status

> Generated: 2026-04-29
> Branch: `feature/nexus-build`
> Commits: 25 (git log)

---

## What Was Built

Nexus is a **luxury personal CRM / relationship intelligence platform** — a full-stack Next.js 16.2.4 web application connecting Gmail, Google Contacts, Google Calendar, and (in future phases) WhatsApp, Instagram, LinkedIn.

### Architecture

```
M:/AI/02Network/
└── apps/web/                        # Next.js 16.2.4 App Router
    ├── app/
    │   ├── (landing)/page.tsx       # Marketing landing page → /
    │   ├── (auth)/                  # Login, Signup, Onboarding → /login, /signup, /onboarding
    │   ├── (dashboard)/             # App shell (sidebar + layout)
    │   │   ├── dashboard/page.tsx   # Command Center → /dashboard
    │   │   ├── email/page.tsx       # Email triage → /email
    │   │   ├── contacts/            # Contacts hub → /contacts, /contacts/[id]
    │   │   ├── graph/page.tsx       # Network graph → /graph
    │   │   ├── stats/page.tsx       # Statistics → /stats
    │   │   ├── reminders/page.tsx   # Reminders → /reminders
    │   │   └── settings/            # Settings + Integrations
    │   └── api/
    │       ├── auth/[...all]/       # Better Auth catch-all
    │       ├── inngest/             # Inngest webhook endpoint
    │       ├── trpc/[trpc]/         # tRPC handler
    │       └── webhooks/gmail/      # Gmail push notification handler
    ├── components/
    │   ├── shared/                  # RelationshipRing, GlassCard, PriorityBadge, ContactCard
    │   ├── layout/                  # Sidebar, Topbar
    │   ├── email/                   # EmailItem
    │   ├── contacts/                # ScoreBreakdown, InteractionTimeline
    │   └── graph/                   # NetworkGraph (react-force-graph-2d)
    └── lib/
        ├── auth.ts                  # Better Auth config + Google OAuth + databaseHooks
        ├── db/schema.ts             # Drizzle ORM: 10 tables, 6 enums
        ├── integrations/            # Encryption (AES-256-GCM), Google Gmail/Contacts/Calendar
        ├── inngest/                 # 6 Inngest functions (sync, scoring, AI, reminders)
        ├── scoring/                 # Relationship scoring engine (exponential decay)
        └── trpc/                    # tRPC v11 routers: contacts, emails, stats
```

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4, App Router, TypeScript 5.x |
| Styling | Tailwind CSS v4, dark glassmorphism (`.glass`, `.glass-strong`) |
| Components | shadcn/ui (14 components), Lucide React |
| Auth | Better Auth v1.6 (Google OAuth + email/password) |
| Database | Neon Postgres + Drizzle ORM (neon-http adapter) |
| API | tRPC v11 + React Query v5 |
| Background Jobs | Inngest v4 |
| AI | Anthropic `claude-sonnet-4-6` (email scoring, priority, needsReply) |
| Graph | react-force-graph-2d |
| Charts | Recharts |
| Animations | Framer Motion (installed) |
| Hosting | Vercel |
| Crons | Inngest: `0 2 * * *` (scoring), `0 6 * * *` (reminders) |

---

## Database Schema (10 Tables)

```
users           — Better Auth user table (id, name, email, username)
sessions        — Better Auth sessions
accounts        — Better Auth OAuth accounts (stores Google tokens)
verifications   — Better Auth email verification tokens

contacts        — CRM contacts (displayName, emails[], phones[], personalScore 0-100, professionalScore 0-100, isVip, lastContactAt)
contactSourceLinks — maps contacts ↔ provider account IDs
interactions    — channel + direction + occurredAt for each touchpoint
emails          — Gmail messages (aiPriorityScore, aiCategory, needsReply, aiSummary)
connectedAccounts — encrypted OAuth tokens per provider per user
reminders       — birthday/anniversary/re_engagement/follow_up/custom reminders
scoreHistory    — daily snapshots of personal+professional scores
tags, contactTags — tagging system
userSettings    — user preferences (digest frequency, etc.)
```

### Key Enums
- `channelEnum`: email | whatsapp | calendar | instagram | linkedin | phone
- `directionEnum`: inbound | outbound | both
- `providerEnum`: google | microsoft | whatsapp | instagram | linkedin
- `reminderTypeEnum`: birthday | anniversary | re_engagement | follow_up | custom

---

## Scoring Algorithm

**File**: `lib/scoring/relationship-score.ts`

Exponential decay scoring: `score = Σ(channelWeight × directionWeight × e^(-λ × ageDays))`

- λ = 0.0077 (half-life ≈ 90 days)
- Channel weights: calendar=1.5, phone=1.3, whatsapp=1.2, email=1.0, instagram=0.6, linkedin=0.4
- Direction weights: inbound=1.0, outbound=0.7
- Normalized: 50 weighted interactions over 90 days = score 100
- Split personal (whatsapp/instagram/phone channels) vs professional (email/calendar/linkedin channels)
- Capped at 100

---

## Background Jobs (Inngest)

| Function | Trigger | Purpose |
|---|---|---|
| `gmail-full-sync` | event: `gmail/full-sync.requested` | Pull 500 emails, parse, store, AI-score |
| `gmail-incremental-sync` | event: `gmail/incremental-sync.requested` | History API delta sync |
| `google-contacts-sync` | event: `contacts/google-sync.requested` | Import Google Contacts |
| `score-recalculate` | cron: `0 2 * * *` | Recompute scores for all users |
| `email-ai-score` | event: `email/score.requested` | Claude API: priority/category/needsReply |
| `reminder-check` | cron: `0 6 * * *` | Generate birthday/re-engagement reminders |

---

## OAuth Flow

1. User clicks "Connect Google" on `/settings/integrations`
2. → Better Auth redirects to Google OAuth (scopes: gmail.modify, contacts.readonly, calendar.readonly)
3. → Better Auth stores tokens in `accounts` table
4. → `databaseHooks.account.create.after` fires:
   - Encrypts tokens (AES-256-GCM) → inserts into `connectedAccounts`
   - Sends Inngest events: `gmail/full-sync.requested` + `contacts/google-sync.requested`
5. → Background sync begins within seconds

---

## Unit Tests

**File**: `apps/web/__tests__/`
**Runner**: Vitest

### Results (13/13 passing)

```
 PASS  __tests__/scoring.test.ts (7 tests)
  ✓ returns zero scores for empty interactions
  ✓ scores are between 0 and 100
  ✓ recent interactions score higher than old ones
  ✓ inbound interactions score higher than outbound
  ✓ whatsapp and instagram contribute more to personal score
  ✓ calendar has highest channel weight
  ✓ more interactions produce higher scores up to the cap

 PASS  __tests__/encryption.test.ts (6 tests)
  ✓ encrypt returns colon-separated base64 string
  ✓ decrypt recovers the original plaintext
  ✓ encrypt produces different ciphertext each time (random IV)
  ✓ decrypting tampered ciphertext throws
  ✓ handles empty string
  ✓ handles unicode and special characters

Duration: ~183ms
```

Run with: `pnpm test` (inside `apps/web/`)

---

## Risk Considerations

### Critical (must address before production)

| Risk | Description | Mitigation |
|---|---|---|
| **Missing env vars** | App will crash at boot without `DATABASE_URL`, `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `ANTHROPIC_API_KEY`, `INNGEST_SIGNING_KEY`, `BETTER_AUTH_SECRET` | Set all in Vercel dashboard before first deploy |
| **Encryption key rotation** | `ENCRYPTION_KEY` is used to encrypt all OAuth tokens. If rotated, all stored tokens become undecryptable. | Store key permanently; implement re-encryption migration if ever rotated |
| **WhatsApp/Baileys ToS** | Baileys library operates in a gray area with WhatsApp ToS. Using it for personal use is low-risk but not officially sanctioned. | Phase 2 item; clearly document risk before enabling |
| **Google OAuth refresh** | `accounts` table stores access tokens that expire in 1 hour. Inngest jobs need to call token refresh. Gmail sync does this but needs testing end-to-end. | Test with real Google account after deploy |
| **Inngest signing key** | Inngest webhook at `/api/inngest` must validate `INNGEST_SIGNING_KEY`. Missing key = anyone can trigger jobs. | Set `INNGEST_SIGNING_KEY` before production |

### Important (address within first sprint)

| Risk | Description | Mitigation |
|---|---|---|
| **No middleware auth guard** | The `(dashboard)` route group has a layout-level auth check but no Next.js middleware. A user who bypasses JavaScript can access RSC-rendered pages without auth. | Add `middleware.ts` with Better Auth session check |
| **No rate limiting** | tRPC endpoints and Gmail webhook have no rate limiting. Malicious clients can spam requests. | Add Inngest rate limiting / Vercel Edge rate limiting |
| **Gmail history sync gaps** | The incremental sync uses Gmail history ID. If history ID expires (>7 days gap), the sync falls back to full sync. This edge case needs a retry handler. | Add fallback in `gmail-incremental-sync.ts` |
| **Score history retention** | `scoreHistory` table grows unboundedly. 1 user × 365 contacts × 365 days = 133K rows/year. | Add a retention policy: delete rows older than 90 days |
| **No input sanitization on search** | The contacts search uses `ilike` which is safe against SQL injection (Drizzle parameterizes), but has no length limit on the search string. | Add `z.string().max(100)` to the search input Zod schema |
| **react-force-graph-2d typing** | The library has no TypeScript definitions; `any` is used throughout. If the library API changes, TypeScript won't catch it. | Monitor for community type definitions or fork with manual types |

### Minor

| Risk | Description |
|---|---|
| **No error boundaries** | Pages don't have React error boundaries. A tRPC query error will crash the whole page. Add `<ErrorBoundary>` wrappers. |
| **No loading skeletons** | Most tRPC queries show empty UI while loading. Add skeleton states for better UX. |
| **Email HTML rendering** | The email view renders HTML via `dangerouslySetInnerHTML` — verify the DOMPurify sanitization is applied before rendering. *(Check email page if this is done.)* |
| **No pagination on contacts** | The contacts list loads max 200 contacts. At scale, this should be paginated with cursor-based pagination. |
| **Framer Motion installed but unused** | The animations library is installed but not used in any component yet. Add micro-animations to GlassCard and page transitions in Phase 2. |

---

## Next Steps (Prioritized)

### Phase 1 — Deploy (this week)

1. **Set environment variables in Vercel**:
   - `DATABASE_URL` (Neon connection string)
   - `ENCRYPTION_KEY` (32-byte random key: `openssl rand -base64 32`)
   - `BETTER_AUTH_SECRET` (random string)
   - `BETTER_AUTH_URL` (your production URL)
   - `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY`

2. **Run Drizzle migrations** against Neon:
   ```bash
   cd apps/web && pnpm drizzle-kit push
   ```

3. **Configure Google OAuth redirect URIs** in Google Cloud Console:
   - `https://your-domain.vercel.app/api/auth/callback/google`

4. **Connect Inngest to Vercel** at inngest.com → new app → production URL: `https://your-domain.vercel.app/api/inngest`

5. **Push to GitHub and deploy via Vercel** (Task 26 — still pending)

### Phase 2 — MVP Polish

- **Add Next.js middleware** for auth guard on `/dashboard/**` routes
- **Add error boundaries** and loading skeletons to all pages
- **Add DOMPurify** to email HTML renderer
- **Email HTML XSS check** — confirm the email view sanitizes HTML before `dangerouslySetInnerHTML`
- **Framer Motion** — add page transitions and card entrance animations
- **Cursor-based pagination** on contacts list
- **Score history retention** — cron to delete rows older than 90 days

### Phase 3 — Integrations

- **Gmail watch** — set up push notifications for real-time email sync (Gmail API watch endpoint)
- **WhatsApp (Baileys)** — add WhatsApp connection flow in onboarding
- **Instagram Graph API** — DM signals (requires Creator/Business account)
- **LinkedIn browser extension (Plasmo)** — profile import sidebar
- **Outlook/Microsoft Graph** — email + calendar integration
- **Calendar sync** — pull Google Calendar events into interactions

### Phase 4 — Intelligence

- **AI contact summaries** — Claude generates a 2-sentence relationship summary per contact
- **Re-engagement suggestions** — "You haven't talked to Sarah in 45 days — want to send a note?"
- **Smart email drafts** — AI-assisted reply drafts from the email triage view
- **Network clustering** — group contacts by company/affiliation in the graph
- **Relationship trends** — week-over-week score change indicators

---

## Files by Category

### Core Business Logic
- `lib/scoring/relationship-score.ts` — scoring engine
- `lib/integrations/encryption.ts` — AES-256-GCM token encryption
- `lib/inngest/gmail-sync.ts` — Gmail full + incremental sync
- `lib/inngest/contact-sync.ts` — Google Contacts sync
- `lib/inngest/email-ai-score.ts` — Claude AI email scoring
- `lib/inngest/score-recalculate.ts` — nightly scoring cron
- `lib/inngest/reminder-check.ts` — birthday/re-engagement reminders

### API Layer
- `lib/trpc/routers/contacts.ts` — contact CRUD + network graph query
- `lib/trpc/routers/emails.ts` — email list + archive + mark replied
- `lib/trpc/routers/stats.ts` — dashboard overview + interaction timeline

### Pages (App Router)
- `app/(dashboard)/dashboard/page.tsx` — Command Center (RSC, direct DB)
- `app/(dashboard)/email/page.tsx` — Email triage (Client, tRPC)
- `app/(dashboard)/contacts/page.tsx` — Contacts table (Client, tRPC)
- `app/(dashboard)/contacts/[id]/page.tsx` — Contact profile (RSC, direct DB)
- `app/(dashboard)/graph/page.tsx` — Network graph (Client, tRPC)
- `app/(dashboard)/stats/page.tsx` — Statistics (Client, tRPC + Recharts)
- `app/(dashboard)/reminders/page.tsx` — Reminders (RSC, direct DB)

### Shared Components
- `components/shared/relationship-ring.tsx` — dual-arc score SVG ring
- `components/shared/glass-card.tsx` — glassmorphism card wrapper
- `components/shared/priority-badge.tsx` — color-coded priority pill
- `components/graph/network-graph.tsx` — force-directed graph

---

## Known Limitations (MVP Scope)

1. WhatsApp, Instagram, LinkedIn integrations are UI-only (Coming Soon)
2. Microsoft/Outlook integration is UI-only
3. No 2FA (settings page shows placeholder)
4. Email HTML rendering may need DOMPurify audit
5. Network graph edges are empty (no shared contacts/co-mentions yet)
6. Score history chart on contact profile not yet implemented
7. No mobile responsive design (desktop-first)
