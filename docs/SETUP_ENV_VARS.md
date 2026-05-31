# Nexus — Environment Variables Setup Guide

This document contains everything needed to complete the Vercel environment variable setup for the Nexus CRM project.

---

## Context

- **Vercel project**: `amanupadhyay/nexus-build`
- **Production URL**: `https://nexus-build-amanupadhyay.vercel.app`
- **Vercel CLI**: Already installed and logged in as `amanrupadhyay-2976`
- **Project linked**: `.vercel/project.json` exists in `M:/AI/02Network/.worktrees/nexus-build`

### Already set on Vercel (do not touch)

These were auto-provisioned by the Neon Postgres integration and already exist in Production, Preview, and Development:

- `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_*`, `PGHOST`, `PGPASSWORD`, `PGUSER`, `PGDATABASE`, `PGHOST_UNPOOLED`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NO_SSL`, `NEON_PROJECT_ID`, `NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL`

These were auto-generated and are already set for **Production only**:

- `BETTER_AUTH_SECRET`
- `ENCRYPTION_KEY`
- `BETTER_AUTH_URL` = `https://nexus-build-amanupadhyay.vercel.app`
- `NEXT_PUBLIC_APP_URL` = `https://nexus-build-amanupadhyay.vercel.app`

### Still needed (8 vars — all Production only for now)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `RESEND_API_KEY`

---

## Task 1 — Google Cloud (OAuth + APIs)

**Cost: Free**

### 1.1 Create a Google Cloud project

1. Go to https://console.cloud.google.com
2. Top-left dropdown → **New Project**
3. Name it `nexus` → Create

### 1.2 Enable APIs

Go to **APIs & Services → Library** and enable each of these:

- `Gmail API`
- `People API` (this is Google Contacts)
- `Google Calendar API`

### 1.3 Configure OAuth consent screen

Go to **APIs & Services → OAuth consent screen**:

- User type: **External**
- App name: `Nexus`
- User support email: (owner's email)
- Developer contact email: (owner's email)
- Scopes to add:
  - `https://www.googleapis.com/auth/gmail.modify`
  - `https://www.googleapis.com/auth/contacts.readonly`
  - `https://www.googleapis.com/auth/calendar.readonly`
- Test users: add the owner's Google account email
- Save and continue through all steps

### 1.4 Create OAuth 2.0 credentials

Go to **APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID**:

- Application type: **Web application**
- Name: `Nexus Web`
- Authorized redirect URIs — add exactly:
  ```
  https://nexus-build-amanupadhyay.vercel.app/api/auth/callback/google
  ```
- Click **Create**

You will see a **Client ID** and **Client Secret**. Copy both.

### 1.5 Add to Vercel

```bash
cd M:/AI/02Network/.worktrees/nexus-build
vercel env add GOOGLE_CLIENT_ID production --value "<client-id>"
vercel env add GOOGLE_CLIENT_SECRET production --value "<client-secret>"
```

---

## Task 2 — Google Vertex AI (Gemini) — use existing Google Cloud credits

**Cost: Free using existing Google Cloud credits. No separate API key needed — uses a service account from the same Google Cloud project created in Task 1.**

The app uses AI to score and prioritize emails. Instead of Anthropic, it will use **Gemini 1.5 Flash** via Vertex AI, which is fast, cheap, and covered by your existing credits.

### 2.1 Enable the Vertex AI API

In the same Google Cloud project created in Task 1:

1. Go to **APIs & Services → Library**
2. Search for `Vertex AI API` → Enable it

### 2.2 Create a service account

Vercel cannot use your personal Google credentials — it needs a service account JSON key.

1. Go to **IAM & Admin → Service Accounts → + CREATE SERVICE ACCOUNT**
2. Name: `nexus-vertexai`
3. Click **Create and Continue**
4. Grant role: **Vertex AI User** (`roles/aiplatform.user`)
5. Click **Done**

### 2.3 Download the JSON key

1. Click the service account you just created
2. Go to **Keys → Add Key → Create new key → JSON**
3. A `.json` file will download — open it in a text editor
4. Copy the **entire JSON content** (it's a single-line or multi-line JSON object)

### 2.4 Add to Vercel

Three env vars are needed:

```bash
cd M:/AI/02Network/.worktrees/nexus-build

# The full contents of the downloaded JSON key file (paste as a single line)
vercel env add GOOGLE_APPLICATION_CREDENTIALS_JSON production --value '<paste-entire-json-here>'

# Your Google Cloud project ID (found in the JSON key as "project_id", e.g. "nexus-123456")
vercel env add GOOGLE_CLOUD_PROJECT production --value "<project-id>"

# Region — us-central1 has the broadest Gemini model availability
vercel env add GOOGLE_CLOUD_LOCATION production --value "us-central1"
```

### 2.5 Code change required

The file `apps/web/lib/inngest/email-ai-score.ts` currently uses the Anthropic SDK. It needs to be updated to use `@google-cloud/vertexai` instead. The model to use is `gemini-1.5-flash` — same prompt structure, just different SDK call. This code change should be made before deploying.

---

## Task 3 — Inngest

**Cost: Free (50,000 function runs/month on free tier)**

1. Go to https://app.inngest.com
2. Sign in or create a free account
3. Create a new app called `nexus`
4. Go to **Manage → Keys**
5. Copy the **Event Key** and **Signing Key**

### Add to Vercel

```bash
vercel env add INNGEST_EVENT_KEY production --value "<event-key>"
vercel env add INNGEST_SIGNING_KEY production --value "<signing-key>"
```

---

## Task 4 — Resend

**Cost: Free (3,000 emails/month, 100/day — more than enough for reminder emails)**

1. Go to https://resend.com
2. Sign in or create a free account
3. Go to **API Keys → Create API Key**
4. Name it `nexus`, permissions: **Full access** → Add
5. Copy the key (shown only once)

### Add to Vercel

```bash
vercel env add RESEND_API_KEY production --value "<key>"
```

---

## Task 5 — Verify all vars are set

After all 6 vars are added, run:

```bash
cd M:/AI/02Network/.worktrees/nexus-build
vercel env ls production
```

Expected: 28+ variables listed, including all 6 above.

---

## Task 6 — Run Drizzle migration

Once env vars are set, push the database schema to Neon:

```bash
cd M:/AI/02Network/.worktrees/nexus-build/apps/web
pnpm drizzle-kit push
```

This creates all 10 tables: `users`, `sessions`, `accounts`, `verifications`, `contacts`, `contactSourceLinks`, `interactions`, `emails`, `connectedAccounts`, `reminders`, `scoreHistory`, `tags`, `contactTags`, `userSettings`.

---

## Task 7 — Deploy to Vercel

```bash
cd M:/AI/02Network/.worktrees/nexus-build
vercel --prod
```

Production URL: https://nexus-build-amanupadhyay.vercel.app

---

## Task 8 — Connect Inngest to production

After deploying:

1. Go to https://app.inngest.com → your `nexus` app
2. Add the production URL: `https://nexus-build-amanupadhyay.vercel.app/api/inngest`
3. Sync the app — Inngest will discover the 6 background functions

---

## Notes

- `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY` are already set — do not regenerate or overwrite them. The encryption key encrypts all stored OAuth tokens; if it changes, users will need to reconnect their Google accounts.
- All vars above should be set for **Production** environment only for now. Preview and Development can be added later if needed.
- After the first Google OAuth login, the app will automatically trigger a Gmail full sync + Google Contacts sync via Inngest.
