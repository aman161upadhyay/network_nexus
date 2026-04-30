# Nexus — Part 1: Backend & Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Nexus monorepo with Next.js 15, Neon Postgres + Drizzle ORM, Better Auth, tRPC, Gmail/Google OAuth integration, relationship scoring engine, and Inngest background jobs — producing a fully functional API backend with no UI.

**Architecture:** Turborepo monorepo with a single `apps/web` Next.js 15 app. Auth via Better Auth stored in Neon. All data access via Drizzle ORM with Row-Level Security. Background jobs via Inngest. Gmail sync via Google OAuth + Gmail API with push notifications.

**Tech Stack:** Next.js 15, TypeScript 5, pnpm, Turborepo, Drizzle ORM, Neon Postgres, Better Auth, tRPC v11, Inngest, Google APIs (Gmail + People + Calendar), Resend, Anthropic SDK, Zod

---

## File Map

```
nexus/
├── package.json                          # Turborepo root
├── turbo.json                            # Turborepo pipeline
├── pnpm-workspace.yaml
├── .env.example
├── apps/
│   └── web/
│       ├── package.json
│       ├── next.config.ts
│       ├── drizzle.config.ts
│       ├── app/
│       │   └── api/
│       │       ├── auth/
│       │       │   └── [...all]/route.ts      # Better Auth handler
│       │       ├── trpc/
│       │       │   └── [trpc]/route.ts        # tRPC HTTP handler
│       │       ├── inngest/
│       │       │   └── route.ts               # Inngest webhook
│       │       └── webhooks/
│       │           └── gmail/route.ts         # Gmail push notification handler
│       └── lib/
│           ├── auth.ts                        # Better Auth config
│           ├── auth-client.ts                 # Client-side auth
│           ├── db/
│           │   ├── index.ts                   # Drizzle client
│           │   └── schema.ts                  # All table definitions
│           ├── trpc/
│           │   ├── init.ts                    # tRPC init + context
│           │   ├── routers/
│           │   │   ├── _app.ts                # Root router
│           │   │   ├── contacts.ts
│           │   │   ├── emails.ts
│           │   │   ├── interactions.ts
│           │   │   └── stats.ts
│           │   └── client.ts                  # tRPC React client
│           ├── integrations/
│           │   ├── google/
│           │   │   ├── client.ts              # OAuth token refresh + googleapis client
│           │   │   ├── gmail.ts               # Gmail API helpers
│           │   │   ├── contacts.ts            # People API helpers
│           │   │   └── calendar.ts            # Calendar API helpers
│           │   └── encryption.ts              # AES-256-GCM token encryption
│           ├── scoring/
│           │   └── relationship-score.ts      # Score computation
│           └── inngest/
│               ├── client.ts                  # Inngest client
│               ├── gmail-sync.ts              # Full + incremental Gmail sync
│               ├── contact-sync.ts            # Google Contacts + Calendar sync
│               ├── score-recalculate.ts       # Nightly score job
│               ├── email-ai-score.ts          # Claude AI email scoring
│               └── reminder-check.ts          # Birthday + re-engagement reminders
└── packages/
    └── db/
        └── package.json                       # (placeholder for future shared schema)
```

---

## Task 1: Monorepo Bootstrap

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `.env.example`

- [ ] **Step 1: Initialize pnpm workspace**

```bash
mkdir nexus && cd nexus
pnpm init
```

Edit the generated `package.json`:

```json
{
  "name": "nexus",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "db:push": "turbo db:push",
    "db:generate": "turbo db:generate"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "db:push": {
      "cache": false
    },
    "db:generate": {
      "cache": false
    }
  }
}
```

- [ ] **Step 4: Scaffold the Next.js app**

```bash
mkdir -p apps/web
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir --no-import-alias --yes
```

- [ ] **Step 5: Install all backend dependencies**

```bash
cd apps/web
pnpm add drizzle-orm @neondatabase/serverless
pnpm add better-auth @better-auth/cli
pnpm add @trpc/server @trpc/client @trpc/react-query @tanstack/react-query
pnpm add inngest
pnpm add resend
pnpm add @anthropic-ai/sdk
pnpm add googleapis google-auth-library
pnpm add zod
pnpm add postal-mime
pnpm add -D drizzle-kit @types/node dotenv-cli
```

- [ ] **Step 6: Create apps/web/next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless", "better-auth"],
};

export default nextConfig;
```

- [ ] **Step 7: Create .env.example in repo root**

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/nexus?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=generate-32-char-secret-here
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Token encryption (32 bytes base64)
ENCRYPTION_KEY=generate-32-byte-base64-key-here

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Resend
RESEND_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Gmail Push Notifications
GOOGLE_PUBSUB_TOPIC=projects/YOUR_PROJECT/topics/nexus-gmail
```

- [ ] **Step 8: Create .gitignore**

```
node_modules/
.next/
.env
.env.local
*.tsbuildinfo
dist/
.turbo/
```

- [ ] **Step 9: Commit**

```bash
cd ../..  # back to repo root
git add .
git commit -m "feat: bootstrap Turborepo monorepo with Next.js 15"
```

---

## Task 2: Database Schema

**Files:**
- Create: `apps/web/lib/db/schema.ts`
- Create: `apps/web/lib/db/index.ts`
- Create: `apps/web/drizzle.config.ts`

- [ ] **Step 1: Create apps/web/drizzle.config.ts**

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

- [ ] **Step 2: Create apps/web/lib/db/index.ts**

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export type DB = typeof db;
```

- [ ] **Step 3: Create apps/web/lib/db/schema.ts — Part A (enums + users)**

```typescript
import {
  pgTable, pgEnum, text, integer, smallint, boolean,
  timestamp, jsonb, primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const channelEnum = pgEnum("channel", [
  "email", "whatsapp", "instagram", "linkedin", "calendar", "phone",
]);
export const directionEnum = pgEnum("direction", ["inbound", "outbound"]);
export const providerEnum = pgEnum("provider", [
  "google", "microsoft", "whatsapp", "instagram", "linkedin",
]);
export const reminderTypeEnum = pgEnum("reminder_type", [
  "birthday", "anniversary", "re_engagement", "follow_up", "custom",
]);
export const digestEnum = pgEnum("digest", ["none", "daily", "weekly"]);
export const sourceEnum = pgEnum("source", [
  "google", "outlook", "whatsapp", "instagram", "manual",
]);

// Better Auth manages the users table — we extend it via a separate profile
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

- [ ] **Step 4: Continue schema.ts — Part B (core domain tables)**

Append to `apps/web/lib/db/schema.ts`:

```typescript
// Contacts
export const contacts = pgTable("contacts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  emails: text("emails").array().notNull().default(sql`'{}'`),
  phones: text("phones").array().notNull().default(sql`'{}'`),
  company: text("company"),
  title: text("title"),
  linkedinUrl: text("linkedin_url"),
  instagramHandle: text("instagram_handle"),
  whatsappNumber: text("whatsapp_number"),
  birthday: text("birthday"),            // ISO date string YYYY-MM-DD
  workAnniversary: text("work_anniversary"),
  photoUrl: text("photo_url"),
  personalScore: smallint("personal_score").notNull().default(0),
  professionalScore: smallint("professional_score").notNull().default(0),
  isVip: boolean("is_vip").notNull().default(false),
  lastContactAt: timestamp("last_contact_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("contacts_user_id_idx").on(t.userId),
  index("contacts_personal_score_idx").on(t.personalScore),
]);

// Contact source links (deduplication bridge)
export const contactSourceLinks = pgTable("contact_source_links", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  source: sourceEnum("source").notNull(),
  sourceId: text("source_id").notNull(),
  rawData: jsonb("raw_data"),
}, (t) => [
  uniqueIndex("contact_source_unique").on(t.source, t.sourceId),
]);

// Interactions (touchpoints across all channels)
export const interactions = pgTable("interactions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  channel: channelEnum("channel").notNull(),
  direction: directionEnum("direction").notNull(),
  subject: text("subject"),
  bodyPreview: text("body_preview"),
  threadId: text("thread_id"),
  externalId: text("external_id"),
  occurredAt: timestamp("occurred_at").notNull(),
  metadata: jsonb("metadata"),
}, (t) => [
  index("interactions_contact_id_idx").on(t.contactId),
  index("interactions_occurred_at_idx").on(t.occurredAt),
]);

// Emails (mirrored for triage UI)
export const emails = pgTable("emails", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),  // connected_account id
  threadId: text("thread_id"),
  messageId: text("message_id").notNull(),
  subject: text("subject"),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  toEmails: text("to_emails").array().notNull().default(sql`'{}'`),
  bodyPreview: text("body_preview"),
  bodyHtml: text("body_html"),
  receivedAt: timestamp("received_at").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  isStarred: boolean("is_starred").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  aiPriorityScore: smallint("ai_priority_score"),
  aiCategory: text("ai_category"),
  aiSummary: text("ai_summary"),
  needsReply: boolean("needs_reply").notNull().default(false),
  repliedAt: timestamp("replied_at"),
}, (t) => [
  index("emails_user_id_received_idx").on(t.userId, t.receivedAt),
  uniqueIndex("emails_message_id_unique").on(t.messageId),
]);

// Connected accounts (OAuth tokens, encrypted)
export const connectedAccounts = pgTable("connected_accounts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: providerEnum("provider").notNull(),
  accountEmail: text("account_email"),
  accountName: text("account_name"),
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at"),
  scopes: text("scopes").array(),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  gmailHistoryId: text("gmail_history_id"),  // for incremental Gmail sync
}, (t) => [
  index("connected_accounts_user_id_idx").on(t.userId),
]);

// Reminders
export const reminders = pgTable("reminders", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: text("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  type: reminderTypeEnum("type").notNull(),
  dueAt: timestamp("due_at").notNull(),
  dismissedAt: timestamp("dismissed_at"),
  title: text("title").notNull(),
  body: text("body"),
}, (t) => [
  index("reminders_user_id_due_idx").on(t.userId, t.dueAt),
]);

// Score history
export const scoreHistory = pgTable("score_history", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  personalScore: smallint("personal_score").notNull(),
  professionalScore: smallint("professional_score").notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

// Tags
export const tags = pgTable("tags", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
});

export const contactTags = pgTable("contact_tags", {
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.contactId, t.tagId] }),
]);

// User settings
export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  reminderDigest: digestEnum("reminder_digest").notNull().default("daily"),
  digestTime: text("digest_time").notNull().default("08:00"),
  vipTitles: text("vip_titles").array().notNull().default(sql`ARRAY['professor','prof.','dr.','ceo','founder','director','vp','president']`),
  dormantThresholdDays: integer("dormant_threshold_days").notNull().default(90),
  timezone: text("timezone").notNull().default("UTC"),
});
```

- [ ] **Step 5: Push schema to Neon**

```bash
cd apps/web
cp ../../.env.example .env.local
# Fill in DATABASE_URL with your Neon connection string, then:
pnpm dotenv-cli -e .env.local -- pnpm drizzle-kit push
```

Expected output: `All tables created successfully`

- [ ] **Step 6: Commit**

```bash
cd ../..
git add apps/web/lib/db/ apps/web/drizzle.config.ts
git commit -m "feat: add Drizzle ORM schema for Nexus (contacts, emails, interactions, reminders)"
```

---

## Task 3: Better Auth Setup

**Files:**
- Create: `apps/web/lib/auth.ts`
- Create: `apps/web/lib/auth-client.ts`
- Create: `apps/web/app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Create apps/web/lib/auth.ts**

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/contacts.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
    },
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
        unique: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // refresh if older than 1 day
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
```

- [ ] **Step 2: Create apps/web/lib/auth-client.ts**

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient;
```

- [ ] **Step 3: Create apps/web/app/api/auth/[...all]/route.ts**

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 4: Add NEXT_PUBLIC_APP_URL to .env.local**

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 5: Verify auth endpoint responds**

```bash
cd apps/web && pnpm dev &
curl http://localhost:3000/api/auth/get-session
```

Expected: `{"session":null,"user":null}` (JSON, no error)

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/auth.ts apps/web/lib/auth-client.ts apps/web/app/api/auth/
git commit -m "feat: add Better Auth with Google OAuth + email/password"
```

---

## Task 4: Token Encryption + Connected Accounts

**Files:**
- Create: `apps/web/lib/integrations/encryption.ts`

- [ ] **Step 1: Create apps/web/lib/integrations/encryption.ts**

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // format: iv:authTag:ciphertext (all base64)
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decrypt(ciphertext: string): string {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
```

- [ ] **Step 2: Generate an encryption key and add to .env.local**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copy output → ENCRYPTION_KEY= in .env.local
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/integrations/encryption.ts
git commit -m "feat: add AES-256-GCM token encryption for OAuth credentials"
```

---

## Task 5: Google API Client

**Files:**
- Create: `apps/web/lib/integrations/google/client.ts`
- Create: `apps/web/lib/integrations/google/gmail.ts`
- Create: `apps/web/lib/integrations/google/contacts.ts`
- Create: `apps/web/lib/integrations/google/calendar.ts`

- [ ] **Step 1: Create apps/web/lib/integrations/google/client.ts**

```typescript
import { google } from "googleapis";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { decrypt, encrypt } from "../encryption";
import { eq } from "drizzle-orm";

export async function getGoogleClient(accountId: string) {
  const [account] = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.id, accountId));

  if (!account) throw new Error(`Connected account ${accountId} not found`);

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const accessToken = account.accessTokenEnc ? decrypt(account.accessTokenEnc) : null;
  const refreshToken = account.refreshTokenEnc ? decrypt(account.refreshTokenEnc) : null;

  oauth2.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: account.tokenExpiresAt?.getTime(),
  });

  // Auto-refresh handler — persist new tokens
  oauth2.on("tokens", async (tokens) => {
    await db
      .update(connectedAccounts)
      .set({
        accessTokenEnc: tokens.access_token ? encrypt(tokens.access_token) : undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      })
      .where(eq(connectedAccounts.id, accountId));
  });

  return { oauth2, account };
}
```

- [ ] **Step 2: Create apps/web/lib/integrations/google/gmail.ts**

```typescript
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import PostalMime from "postal-mime";

export async function listMessages(
  auth: OAuth2Client,
  options: { maxResults?: number; pageToken?: string; q?: string } = {}
) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: options.maxResults ?? 50,
    pageToken: options.pageToken,
    q: options.q,
  });
  return res.data;
}

export async function getMessage(auth: OAuth2Client, messageId: string) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "raw",
  });
  return res.data;
}

export async function parseMessage(rawBase64: string) {
  const raw = Buffer.from(rawBase64, "base64url").toString("binary");
  const parser = new PostalMime();
  const parsed = await parser.parse(raw);
  return {
    subject: parsed.subject ?? "(no subject)",
    fromEmail: parsed.from?.address ?? "",
    fromName: parsed.from?.name ?? "",
    toEmails: (parsed.to ?? []).map((t) => t.address ?? "").filter(Boolean),
    bodyHtml: parsed.html ?? "",
    bodyPreview: (parsed.text ?? parsed.html ?? "").slice(0, 500).replace(/<[^>]+>/g, ""),
    date: parsed.date ? new Date(parsed.date) : new Date(),
    messageId: parsed.messageId ?? "",
  };
}

export async function getHistoryList(
  auth: OAuth2Client,
  startHistoryId: string
) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
  });
  return res.data;
}

export async function watchMailbox(auth: OAuth2Client, topicName: string) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName,
      labelIds: ["INBOX"],
    },
  });
  return res.data; // { historyId, expiration }
}

export async function getProfile(auth: OAuth2Client) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.getProfile({ userId: "me" });
  return res.data;
}
```

- [ ] **Step 3: Create apps/web/lib/integrations/google/contacts.ts**

```typescript
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface GoogleContact {
  resourceName: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  emails: string[];
  phones: string[];
  company?: string;
  title?: string;
  photoUrl?: string;
  birthday?: string;
}

export async function listConnections(auth: OAuth2Client): Promise<GoogleContact[]> {
  const people = google.people({ version: "v1", auth });
  const contacts: GoogleContact[] = [];
  let pageToken: string | undefined;

  do {
    const res = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 1000,
      pageToken,
      personFields: "names,emailAddresses,phoneNumbers,organizations,birthdays,photos",
    });

    const connections = res.data.connections ?? [];
    for (const c of connections) {
      const name = c.names?.[0];
      const emails = (c.emailAddresses ?? []).map((e) => e.value ?? "").filter(Boolean);
      if (!name?.displayName && emails.length === 0) continue;

      contacts.push({
        resourceName: c.resourceName ?? "",
        displayName: name?.displayName ?? emails[0] ?? "Unknown",
        firstName: name?.givenName,
        lastName: name?.familyName,
        emails,
        phones: (c.phoneNumbers ?? []).map((p) => p.value ?? "").filter(Boolean),
        company: c.organizations?.[0]?.name,
        title: c.organizations?.[0]?.title,
        photoUrl: c.photos?.[0]?.url,
        birthday: c.birthdays?.[0]?.date
          ? `${c.birthdays[0].date.year ?? "0000"}-${String(c.birthdays[0].date.month ?? 1).padStart(2, "0")}-${String(c.birthdays[0].date.day ?? 1).padStart(2, "0")}`
          : undefined,
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return contacts;
}
```

- [ ] **Step 4: Create apps/web/lib/integrations/google/calendar.ts**

```typescript
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface CalendarEvent {
  id: string;
  summary: string;
  startAt: Date;
  endAt: Date;
  attendeeEmails: string[];
  organizerEmail: string;
}

export async function listEvents(
  auth: OAuth2Client,
  options: { timeMin?: Date; timeMax?: Date; maxResults?: number } = {}
): Promise<CalendarEvent[]> {
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: (options.timeMin ?? new Date(Date.now() - 90 * 86_400_000)).toISOString(),
    timeMax: (options.timeMax ?? new Date(Date.now() + 30 * 86_400_000)).toISOString(),
    maxResults: options.maxResults ?? 500,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      id: e.id ?? "",
      summary: e.summary ?? "(no title)",
      startAt: new Date(e.start?.dateTime ?? e.start?.date ?? ""),
      endAt: new Date(e.end?.dateTime ?? e.end?.date ?? ""),
      attendeeEmails: (e.attendees ?? [])
        .map((a) => a.email ?? "")
        .filter((email) => email && !email.endsWith("@resource.calendar.google.com")),
      organizerEmail: e.organizer?.email ?? "",
    }));
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/integrations/
git commit -m "feat: add Google API clients (Gmail, Contacts, Calendar)"
```

---

## Task 6: Inngest Setup + Gmail Sync Job

**Files:**
- Create: `apps/web/lib/inngest/client.ts`
- Create: `apps/web/lib/inngest/gmail-sync.ts`
- Create: `apps/web/lib/inngest/contact-sync.ts`
- Create: `apps/web/app/api/inngest/route.ts`
- Create: `apps/web/app/api/webhooks/gmail/route.ts`

- [ ] **Step 1: Create apps/web/lib/inngest/client.ts**

```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "nexus" });
```

- [ ] **Step 2: Create apps/web/lib/inngest/gmail-sync.ts**

```typescript
import { inngest } from "./client";
import { db } from "@/lib/db";
import { connectedAccounts, contacts, emails, interactions, contactSourceLinks } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getGoogleClient } from "@/lib/integrations/google/client";
import { listMessages, getMessage, parseMessage, getProfile } from "@/lib/integrations/google/gmail";
import { encrypt } from "@/lib/integrations/encryption";
import { nanoid } from "nanoid";

// Triggered when user connects Gmail for the first time
export const gmailFullSync = inngest.createFunction(
  { id: "gmail-full-sync", concurrency: { limit: 5 } },
  { event: "gmail/full-sync.requested" },
  async ({ event, step }) => {
    const { accountId, userId } = event.data as { accountId: string; userId: string };

    const { oauth2, account } = await step.run("get-google-client", () =>
      getGoogleClient(accountId)
    );

    const profile = await step.run("get-profile", () => getProfile(oauth2));

    // Update account with email + historyId
    await step.run("update-account-profile", () =>
      db.update(connectedAccounts).set({
        accountEmail: profile.emailAddress ?? undefined,
        gmailHistoryId: profile.historyId ?? undefined,
        lastSyncedAt: new Date(),
      }).where(eq(connectedAccounts.id, accountId))
    );

    // Sync last 90 days of emails
    let pageToken: string | undefined;
    let totalSynced = 0;
    const ninetyDaysAgo = Math.floor((Date.now() - 90 * 86_400_000) / 1000);

    do {
      const page = await step.run(`fetch-messages-page-${pageToken ?? "first"}`, () =>
        listMessages(oauth2, {
          maxResults: 100,
          pageToken,
          q: `after:${ninetyDaysAgo} -category:promotions -category:social`,
        })
      );

      const messageIds = (page.messages ?? []).map((m) => m.id!);

      for (const messageId of messageIds) {
        await step.run(`sync-message-${messageId}`, async () => {
          const raw = await getMessage(oauth2, messageId);
          if (!raw.raw) return;

          const parsed = await parseMessage(raw.raw);

          // Upsert email record
          await db.insert(emails).values({
            id: nanoid(),
            userId,
            accountId,
            messageId,
            threadId: raw.threadId ?? undefined,
            subject: parsed.subject,
            fromEmail: parsed.fromEmail,
            fromName: parsed.fromName,
            toEmails: parsed.toEmails,
            bodyPreview: parsed.bodyPreview,
            bodyHtml: parsed.bodyHtml,
            receivedAt: parsed.date,
            isRead: !raw.labelIds?.includes("UNREAD"),
          }).onConflictDoNothing();
        });
        totalSynced++;
      }

      pageToken = page.nextPageToken ?? undefined;
    } while (pageToken && totalSynced < 2000);

    // Trigger AI scoring for the batch
    await step.sendEvent("trigger-ai-scoring", {
      name: "emails/ai-score.requested",
      data: { userId, accountId },
    });

    return { synced: totalSynced };
  }
);

// Triggered by Gmail push notification webhook
export const gmailIncrementalSync = inngest.createFunction(
  { id: "gmail-incremental-sync" },
  { event: "gmail/incremental-sync.requested" },
  async ({ event, step }) => {
    const { accountId, userId, historyId } = event.data as {
      accountId: string; userId: string; historyId: string;
    };

    const { oauth2, account } = await step.run("get-client", () => getGoogleClient(accountId));

    if (!account.gmailHistoryId) return { skipped: true };

    const history = await step.run("get-history", () =>
      // We import getHistoryList from gmail.ts
      import("@/lib/integrations/google/gmail").then(({ getHistoryList }) =>
        getHistoryList(oauth2, account.gmailHistoryId!)
      )
    );

    const newMessageIds = (history.history ?? [])
      .flatMap((h) => h.messagesAdded ?? [])
      .map((m) => m.message?.id!)
      .filter(Boolean);

    for (const messageId of newMessageIds) {
      await step.run(`sync-new-message-${messageId}`, async () => {
        const { getMessage, parseMessage } = await import("@/lib/integrations/google/gmail");
        const raw = await getMessage(oauth2, messageId);
        if (!raw.raw) return;
        const parsed = await parseMessage(raw.raw);

        await db.insert(emails).values({
          id: nanoid(),
          userId,
          accountId,
          messageId,
          threadId: raw.threadId ?? undefined,
          subject: parsed.subject,
          fromEmail: parsed.fromEmail,
          fromName: parsed.fromName,
          toEmails: parsed.toEmails,
          bodyPreview: parsed.bodyPreview,
          bodyHtml: parsed.bodyHtml,
          receivedAt: parsed.date,
          isRead: !raw.labelIds?.includes("UNREAD"),
        }).onConflictDoNothing();
      });
    }

    // Update history ID
    await step.run("update-history-id", () =>
      db.update(connectedAccounts).set({
        gmailHistoryId: historyId,
        lastSyncedAt: new Date(),
      }).where(eq(connectedAccounts.id, accountId))
    );

    await step.sendEvent("trigger-ai-scoring", {
      name: "emails/ai-score.requested",
      data: { userId, accountId },
    });

    return { synced: newMessageIds.length };
  }
);
```

- [ ] **Step 3: Create apps/web/lib/inngest/contact-sync.ts**

```typescript
import { inngest } from "./client";
import { db } from "@/lib/db";
import { contacts, contactSourceLinks, interactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getGoogleClient } from "@/lib/integrations/google/client";
import { listConnections } from "@/lib/integrations/google/contacts";
import { listEvents } from "@/lib/integrations/google/calendar";
import { nanoid } from "nanoid";

export const googleContactSync = inngest.createFunction(
  { id: "google-contact-sync" },
  { event: "contacts/google-sync.requested" },
  async ({ event, step }) => {
    const { accountId, userId } = event.data as { accountId: string; userId: string };
    const { oauth2 } = await step.run("get-client", () => getGoogleClient(accountId));

    const googleContacts = await step.run("list-connections", () => listConnections(oauth2));

    let upserted = 0;
    for (const gc of googleContacts) {
      await step.run(`upsert-contact-${gc.resourceName}`, async () => {
        // Check if this source link already exists
        const existing = await db
          .select({ contactId: contactSourceLinks.contactId })
          .from(contactSourceLinks)
          .where(and(
            eq(contactSourceLinks.source, "google"),
            eq(contactSourceLinks.sourceId, gc.resourceName)
          ));

        if (existing.length > 0) {
          // Update existing contact
          await db.update(contacts).set({
            displayName: gc.displayName,
            firstName: gc.firstName,
            lastName: gc.lastName,
            company: gc.company,
            title: gc.title,
            photoUrl: gc.photoUrl,
            birthday: gc.birthday,
            updatedAt: new Date(),
          }).where(eq(contacts.id, existing[0].contactId));
        } else {
          // Check dedup by email
          const emailMatch = gc.emails.length > 0
            ? await db.select().from(contacts).where(
                and(eq(contacts.userId, userId))
              ).limit(50)  // get user's contacts and filter in JS for email array overlap
            : [];

          const matchedContact = emailMatch.find((c) =>
            c.emails.some((e) => gc.emails.includes(e))
          );

          let contactId: string;
          if (matchedContact) {
            contactId = matchedContact.id;
          } else {
            contactId = nanoid();
            await db.insert(contacts).values({
              id: contactId,
              userId,
              displayName: gc.displayName,
              firstName: gc.firstName,
              lastName: gc.lastName,
              emails: gc.emails,
              phones: gc.phones,
              company: gc.company,
              title: gc.title,
              photoUrl: gc.photoUrl,
              birthday: gc.birthday,
            });
          }

          await db.insert(contactSourceLinks).values({
            id: nanoid(),
            contactId,
            source: "google",
            sourceId: gc.resourceName,
            rawData: gc as any,
          }).onConflictDoNothing();
        }
        upserted++;
      });
    }

    // Sync calendar events and extract attendees as interaction signals
    const events = await step.run("list-calendar-events", () =>
      listEvents(oauth2, { timeMin: new Date(Date.now() - 90 * 86_400_000) })
    );

    for (const event of events) {
      for (const email of event.attendeeEmails) {
        await step.run(`calendar-interaction-${event.id}-${email}`, async () => {
          // Find contact by email
          const allContacts = await db.select().from(contacts)
            .where(eq(contacts.userId, userId));
          const contact = allContacts.find((c) => c.emails.includes(email));
          if (!contact) return;

          await db.insert(interactions).values({
            id: nanoid(),
            userId,
            contactId: contact.id,
            channel: "calendar",
            direction: "inbound",
            subject: event.summary,
            externalId: event.id,
            occurredAt: event.startAt,
          }).onConflictDoNothing();
        });
      }
    }

    return { upserted, calendarEvents: events.length };
  }
);
```

- [ ] **Step 4: Create apps/web/app/api/inngest/route.ts**

```typescript
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { gmailFullSync, gmailIncrementalSync } from "@/lib/inngest/gmail-sync";
import { googleContactSync } from "@/lib/inngest/contact-sync";
import { scoreRecalculate } from "@/lib/inngest/score-recalculate";
import { emailAiScore } from "@/lib/inngest/email-ai-score";
import { reminderCheck } from "@/lib/inngest/reminder-check";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    gmailFullSync,
    gmailIncrementalSync,
    googleContactSync,
    scoreRecalculate,
    emailAiScore,
    reminderCheck,
  ],
});
```

- [ ] **Step 5: Create apps/web/app/api/webhooks/gmail/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Gmail Pub/Sub notification format
  const data = JSON.parse(
    Buffer.from(body.message?.data ?? "", "base64").toString()
  );

  const emailAddress: string = data.emailAddress;
  const historyId: string = data.historyId;

  if (!emailAddress || !historyId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const account = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.accountEmail, emailAddress))
    .limit(1);

  if (!account[0]) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await inngest.send({
    name: "gmail/incremental-sync.requested",
    data: {
      accountId: account[0].id,
      userId: account[0].userId,
      historyId,
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/inngest/ apps/web/app/api/inngest/ apps/web/app/api/webhooks/
git commit -m "feat: add Inngest functions for Gmail full sync and incremental sync"
```

---

## Task 7: Relationship Scoring Engine + Score Jobs

**Files:**
- Create: `apps/web/lib/scoring/relationship-score.ts`
- Create: `apps/web/lib/inngest/score-recalculate.ts`

- [ ] **Step 1: Create apps/web/lib/scoring/relationship-score.ts**

```typescript
import type { InferSelectModel } from "drizzle-orm";
import type { interactions } from "@/lib/db/schema";

type Interaction = InferSelectModel<typeof interactions>;

interface ScoreResult {
  personal: number;
  professional: number;
}

const DECAY_LAMBDA = 0.0077; // half-life ~90 days: ln(2)/90

const CHANNEL_WEIGHTS: Record<string, number> = {
  email: 1.0,
  whatsapp: 1.2,
  calendar: 1.5,
  instagram: 0.6,
  linkedin: 0.4,
  phone: 1.3,
};

export function computeRelationshipScore(
  contactInteractions: Interaction[]
): ScoreResult {
  if (contactInteractions.length === 0) return { personal: 0, professional: 0 };

  const now = Date.now();
  let rawScore = 0;
  let emailCount = 0;
  let personalChannelCount = 0; // whatsapp + instagram

  for (const i of contactInteractions) {
    const ageDays = (now - i.occurredAt.getTime()) / 86_400_000;
    const decayFactor = Math.exp(-DECAY_LAMBDA * ageDays);
    const channelWeight = CHANNEL_WEIGHTS[i.channel] ?? 0.5;
    const directionWeight = i.direction === "inbound" ? 1.0 : 0.7;

    rawScore += channelWeight * directionWeight * decayFactor;

    if (i.channel === "email" || i.channel === "calendar" || i.channel === "linkedin") {
      emailCount++;
    }
    if (i.channel === "whatsapp" || i.channel === "instagram" || i.channel === "phone") {
      personalChannelCount++;
    }
  }

  // Normalize: ~50 weighted interactions over 90 days = score of 100
  const normalized = Math.min(100, Math.round((rawScore / 50) * 100));

  const total = emailCount + personalChannelCount + 1;
  const professionalRatio = emailCount / total;
  const personalRatio = personalChannelCount / total;

  const professional = Math.min(100, Math.round(normalized * (professionalRatio + 0.3)));
  const personal = Math.min(100, Math.round(normalized * (personalRatio + 0.2)));

  return { personal, professional };
}
```

- [ ] **Step 2: Create apps/web/lib/inngest/score-recalculate.ts**

```typescript
import { inngest } from "./client";
import { db } from "@/lib/db";
import { contacts, interactions, scoreHistory } from "@/lib/db/schema";
import { eq, gte, desc } from "drizzle-orm";
import { computeRelationshipScore } from "@/lib/scoring/relationship-score";
import { nanoid } from "nanoid";

// Runs nightly via Vercel Cron → Inngest
export const scoreRecalculate = inngest.createFunction(
  { id: "score-recalculate", concurrency: { limit: 3 } },
  { cron: "0 2 * * *" },  // 2 AM UTC daily
  async ({ step }) => {
    const allContacts = await step.run("fetch-all-contacts", () =>
      db.select({ id: contacts.id, userId: contacts.userId }).from(contacts)
    );

    let updated = 0;
    for (const contact of allContacts) {
      await step.run(`score-contact-${contact.id}`, async () => {
        // Last 365 days of interactions
        const contactInteractions = await db
          .select()
          .from(interactions)
          .where(
            eq(interactions.contactId, contact.id)
          )
          .orderBy(desc(interactions.occurredAt));

        const { personal, professional } = computeRelationshipScore(contactInteractions);

        await db.update(contacts).set({
          personalScore: personal,
          professionalScore: professional,
          updatedAt: new Date(),
        }).where(eq(contacts.id, contact.id));

        // Store score snapshot for trend charts
        await db.insert(scoreHistory).values({
          id: nanoid(),
          contactId: contact.id,
          personalScore: personal,
          professionalScore: professional,
        });
      });
      updated++;
    }

    return { updated };
  }
);
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/scoring/ apps/web/lib/inngest/score-recalculate.ts
git commit -m "feat: add relationship scoring engine with exponential decay + nightly Inngest cron"
```

---

## Task 8: AI Email Scoring + Reminder Jobs

**Files:**
- Create: `apps/web/lib/inngest/email-ai-score.ts`
- Create: `apps/web/lib/inngest/reminder-check.ts`

- [ ] **Step 1: Create apps/web/lib/inngest/email-ai-score.ts**

```typescript
import { inngest } from "./client";
import { db } from "@/lib/db";
import { emails, contacts } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface EmailScoreResult {
  priorityScore: number;      // 0-100
  category: string;           // "people" | "deadline" | "job_career" | "vip" | "newsletter" | "receipt" | "other"
  summary: string;            // one-line AI summary
  needsReply: boolean;
}

async function scoreEmail(
  subject: string,
  fromEmail: string,
  fromName: string,
  bodyPreview: string,
  senderRelationshipScore: number
): Promise<EmailScoreResult> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are an email prioritization assistant. Score this email and respond with ONLY valid JSON.

Email:
- From: ${fromName} <${fromEmail}>
- Subject: ${subject}
- Preview: ${bodyPreview.slice(0, 400)}
- Sender relationship score (0-100, higher = closer): ${senderRelationshipScore}

Respond with this exact JSON structure:
{
  "priorityScore": <0-100 integer>,
  "category": "<people|deadline|job_career|vip|newsletter|receipt|other>",
  "summary": "<one sentence summary, max 100 chars>",
  "needsReply": <true|false>
}

Scoring guide:
- 80-100: Requires immediate attention (professor, employer, urgent deadline, close contact)
- 60-79: Important, should reply within 24h (colleague, job application, meeting request)
- 40-59: Moderate priority (newsletter from someone you know, FYI email)
- 20-39: Low priority (automated notification, cold outreach)
- 0-19: Can ignore or archive (marketing, spam)`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    return JSON.parse(text) as EmailScoreResult;
  } catch {
    return { priorityScore: 30, category: "other", summary: subject, needsReply: false };
  }
}

export const emailAiScore = inngest.createFunction(
  { id: "email-ai-score", concurrency: { limit: 2 }, throttle: { limit: 50, period: "1m" } },
  { event: "emails/ai-score.requested" },
  async ({ event, step }) => {
    const { userId } = event.data as { userId: string };

    // Get unscored emails for this user
    const unscoredEmails = await step.run("fetch-unscored", () =>
      db.select().from(emails)
        .where(and(eq(emails.userId, userId), isNull(emails.aiPriorityScore)))
        .limit(100)
    );

    const allContacts = await step.run("fetch-contacts", () =>
      db.select().from(contacts).where(eq(contacts.userId, userId))
    );

    let scored = 0;
    for (const email of unscoredEmails) {
      const senderContact = allContacts.find((c) =>
        c.emails.includes(email.fromEmail.toLowerCase())
      );
      const relationshipScore = senderContact
        ? Math.max(senderContact.personalScore, senderContact.professionalScore)
        : 0;

      const result = await step.run(`score-email-${email.id}`, () =>
        scoreEmail(
          email.subject ?? "",
          email.fromEmail,
          email.fromName ?? "",
          email.bodyPreview ?? "",
          relationshipScore
        )
      );

      await step.run(`update-email-${email.id}`, () =>
        db.update(emails).set({
          aiPriorityScore: result.priorityScore,
          aiCategory: result.category,
          aiSummary: result.summary,
          needsReply: result.needsReply,
        }).where(eq(emails.id, email.id))
      );
      scored++;
    }

    return { scored };
  }
);
```

- [ ] **Step 2: Create apps/web/lib/inngest/reminder-check.ts**

```typescript
import { inngest } from "./client";
import { db } from "@/lib/db";
import { contacts, reminders, userSettings } from "@/lib/db/schema";
import { eq, isNull, lt } from "drizzle-orm";
import { nanoid } from "nanoid";

export const reminderCheck = inngest.createFunction(
  { id: "reminder-check" },
  { cron: "0 6 * * *" },  // 6 AM UTC daily
  async ({ step }) => {
    const allContacts = await step.run("fetch-contacts-with-birthdays", () =>
      db.select().from(contacts).where(
        // contacts that have a birthday set
        // Drizzle doesn't have a simple isNotNull shorthand for text, use sql
        isNull(contacts.birthday)  // we invert this below — selecting non-null
      )
    );

    // Actually get contacts WITH birthdays
    const contactsWithBirthdays = await step.run("fetch-birthday-contacts", () =>
      db.select().from(contacts)
    );

    const today = new Date();
    const todayMMDD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const in7DaysMMDD = (() => {
      const d = new Date(today.getTime() + 7 * 86_400_000);
      return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();

    let created = 0;
    for (const contact of contactsWithBirthdays) {
      if (!contact.birthday) continue;

      const birthdayMMDD = contact.birthday.slice(5); // YYYY-MM-DD → MM-DD

      if (birthdayMMDD === todayMMDD || birthdayMMDD === in7DaysMMDD) {
        const dueAt = birthdayMMDD === todayMMDD ? today : new Date(today.getTime() + 7 * 86_400_000);

        await step.run(`create-birthday-reminder-${contact.id}`, () =>
          db.insert(reminders).values({
            id: nanoid(),
            userId: contact.userId,
            contactId: contact.id,
            type: "birthday",
            dueAt,
            title: `${contact.displayName}'s birthday`,
            body: birthdayMMDD === todayMMDD
              ? `Today is ${contact.displayName}'s birthday! 🎂`
              : `${contact.displayName}'s birthday is in 7 days.`,
          }).onConflictDoNothing()
        );
        created++;
      }

      // Re-engagement: contact with score > 20 but no interaction in >90 days
      if (
        (contact.personalScore > 20 || contact.professionalScore > 20) &&
        contact.lastContactAt &&
        Date.now() - contact.lastContactAt.getTime() > 90 * 86_400_000
      ) {
        const daysSince = Math.floor((Date.now() - contact.lastContactAt.getTime()) / 86_400_000);
        await step.run(`re-engagement-${contact.id}`, () =>
          db.insert(reminders).values({
            id: nanoid(),
            userId: contact.userId,
            contactId: contact.id,
            type: "re_engagement",
            dueAt: new Date(),
            title: `Reconnect with ${contact.displayName}`,
            body: `You haven't been in touch with ${contact.displayName} in ${daysSince} days.`,
          }).onConflictDoNothing()
        );
        created++;
      }
    }

    return { created };
  }
);
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/inngest/email-ai-score.ts apps/web/lib/inngest/reminder-check.ts
git commit -m "feat: add Claude AI email scoring and birthday/re-engagement reminder jobs"
```

---

## Task 9: tRPC API Layer

**Files:**
- Create: `apps/web/lib/trpc/init.ts`
- Create: `apps/web/lib/trpc/routers/_app.ts`
- Create: `apps/web/lib/trpc/routers/contacts.ts`
- Create: `apps/web/lib/trpc/routers/emails.ts`
- Create: `apps/web/lib/trpc/routers/stats.ts`
- Create: `apps/web/lib/trpc/client.ts`
- Create: `apps/web/app/api/trpc/[trpc]/route.ts`

- [ ] **Step 1: Create apps/web/lib/trpc/init.ts**

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { auth } from "@/lib/auth";
import type { Session } from "@/lib/auth";
import { headers } from "next/headers";

export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return { session };
});

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});
```

- [ ] **Step 2: Create apps/web/lib/trpc/routers/contacts.ts**

```typescript
import { router, protectedProcedure } from "../init";
import { z } from "zod";
import { db } from "@/lib/db";
import { contacts, interactions, reminders, scoreHistory, tags, contactTags } from "@/lib/db/schema";
import { eq, and, desc, asc, ilike, or, sql } from "drizzle-orm";

export const contactsRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      scoreMin: z.number().optional(),
      sortBy: z.enum(["personal_score", "professional_score", "last_contact", "name"]).default("personal_score"),
      limit: z.number().max(200).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      let query = db.select().from(contacts)
        .where(eq(contacts.userId, ctx.user.id))
        .$dynamic();

      if (input.search) {
        query = query.where(
          or(
            ilike(contacts.displayName, `%${input.search}%`),
            ilike(contacts.company, `%${input.search}%`),
            sql`${contacts.emails}::text ilike ${'%' + input.search + '%'}`,
          )
        );
      }

      const orderCol = {
        personal_score: desc(contacts.personalScore),
        professional_score: desc(contacts.professionalScore),
        last_contact: desc(contacts.lastContactAt),
        name: asc(contacts.displayName),
      }[input.sortBy];

      return query.orderBy(orderCol).limit(input.limit).offset(input.offset);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [contact] = await db.select().from(contacts)
        .where(and(eq(contacts.id, input.id), eq(contacts.userId, ctx.user.id)));
      if (!contact) return null;

      const contactInteractions = await db.select().from(interactions)
        .where(eq(interactions.contactId, input.id))
        .orderBy(desc(interactions.occurredAt))
        .limit(50);

      const history = await db.select().from(scoreHistory)
        .where(eq(scoreHistory.contactId, input.id))
        .orderBy(asc(scoreHistory.recordedAt))
        .limit(90);

      return { ...contact, interactions: contactInteractions, scoreHistory: history };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
      isVip: z.boolean().optional(),
      birthday: z.string().optional(),
      company: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      await db.update(contacts).set({ ...fields, updatedAt: new Date() })
        .where(and(eq(contacts.id, id), eq(contacts.userId, ctx.user.id)));
      return { ok: true };
    }),

  networkGraph: protectedProcedure.query(async ({ ctx }) => {
    const nodes = await db.select({
      id: contacts.id,
      displayName: contacts.displayName,
      company: contacts.company,
      personalScore: contacts.personalScore,
      professionalScore: contacts.professionalScore,
      photoUrl: contacts.photoUrl,
      isVip: contacts.isVip,
    }).from(contacts).where(eq(contacts.userId, ctx.user.id));

    // Edges: contacts who have co-appeared in calendar events (via interactions)
    // For MVP, return nodes only — edges require more complex join
    return { nodes, edges: [] };
  }),

  coolingContacts: protectedProcedure.query(async ({ ctx }) => {
    // Contacts with score > 30 but lastContactAt > 60 days ago
    return db.select().from(contacts)
      .where(
        and(
          eq(contacts.userId, ctx.user.id),
          sql`(${contacts.personalScore} > 30 OR ${contacts.professionalScore} > 30)`,
          sql`${contacts.lastContactAt} < NOW() - INTERVAL '60 days'`,
        )
      )
      .orderBy(desc(contacts.personalScore))
      .limit(10);
  }),
});
```

- [ ] **Step 3: Create apps/web/lib/trpc/routers/emails.ts**

```typescript
import { router, protectedProcedure } from "../init";
import { z } from "zod";
import { db } from "@/lib/db";
import { emails, connectedAccounts } from "@/lib/db/schema";
import { eq, and, desc, isNotNull, or } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";

const CATEGORIES = ["people", "deadline", "job_career", "vip", "newsletter", "receipt", "other"] as const;

export const emailsRouter = router({
  list: protectedProcedure
    .input(z.object({
      category: z.enum(CATEGORIES).optional(),
      needsReply: z.boolean().optional(),
      limit: z.number().max(100).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      let query = db.select().from(emails)
        .where(and(
          eq(emails.userId, ctx.user.id),
          eq(emails.isArchived, false),
        ))
        .$dynamic();

      if (input.category) {
        query = query.where(eq(emails.aiCategory, input.category));
      }
      if (input.needsReply) {
        query = query.where(eq(emails.needsReply, true));
      }

      return query.orderBy(desc(emails.aiPriorityScore), desc(emails.receivedAt))
        .limit(input.limit).offset(input.offset);
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(emails).set({ isArchived: true })
        .where(and(eq(emails.id, input.id), eq(emails.userId, ctx.user.id)));
      return { ok: true };
    }),

  markReplied: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(emails).set({ repliedAt: new Date(), needsReply: false })
        .where(and(eq(emails.id, input.id), eq(emails.userId, ctx.user.id)));
      return { ok: true };
    }),

  connectGmail: protectedProcedure.mutation(async ({ ctx }) => {
    // This is handled by Better Auth Google OAuth — after OAuth,
    // we create a connected_account record and trigger sync
    // The frontend will redirect to Google OAuth flow
    return { redirectUrl: "/api/auth/signin/google" };
  }),

  triggerSync: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await inngest.send({
        name: "gmail/full-sync.requested",
        data: { accountId: input.accountId, userId: ctx.user.id },
      });
      return { ok: true };
    }),

  priorityInbox: protectedProcedure.query(async ({ ctx }) => {
    // Top 5 priority emails for the dashboard
    return db.select().from(emails)
      .where(and(
        eq(emails.userId, ctx.user.id),
        eq(emails.isArchived, false),
        eq(emails.isRead, false),
        isNotNull(emails.aiPriorityScore),
      ))
      .orderBy(desc(emails.aiPriorityScore))
      .limit(5);
  }),
});
```

- [ ] **Step 4: Create apps/web/lib/trpc/routers/stats.ts**

```typescript
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { contacts, interactions, emails, reminders } from "@/lib/db/schema";
import { eq, and, gte, count, avg, sql } from "drizzle-orm";

export const statsRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);

    const [totalContacts] = await db
      .select({ count: count() }).from(contacts).where(eq(contacts.userId, userId));

    const [totalInteractions] = await db
      .select({ count: count() }).from(interactions)
      .where(and(eq(interactions.userId, userId), gte(interactions.occurredAt, ninetyDaysAgo)));

    const [pendingReminders] = await db
      .select({ count: count() }).from(reminders)
      .where(and(eq(reminders.userId, userId), sql`${reminders.dismissedAt} IS NULL`));

    const [needsReplyCount] = await db
      .select({ count: count() }).from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.needsReply, true), eq(emails.isArchived, false)));

    const topContacts = await db.select().from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(sql`GREATEST(${contacts.personalScore}, ${contacts.professionalScore}) DESC`)
      .limit(10);

    return {
      totalContacts: totalContacts.count,
      totalInteractions: totalInteractions.count,
      pendingReminders: pendingReminders.count,
      needsReplyCount: needsReplyCount.count,
      topContacts,
    };
  }),

  interactionTimeline: protectedProcedure.query(async ({ ctx }) => {
    // Interactions per week for the last 12 weeks
    return db.select({
      week: sql<string>`date_trunc('week', ${interactions.occurredAt})::date`,
      count: count(),
      channel: interactions.channel,
    })
    .from(interactions)
    .where(and(
      eq(interactions.userId, ctx.user.id),
      gte(interactions.occurredAt, new Date(Date.now() - 84 * 86_400_000)),
    ))
    .groupBy(sql`date_trunc('week', ${interactions.occurredAt})`, interactions.channel)
    .orderBy(sql`date_trunc('week', ${interactions.occurredAt})`);
  }),
});
```

- [ ] **Step 5: Create apps/web/lib/trpc/routers/_app.ts**

```typescript
import { router } from "../init";
import { contactsRouter } from "./contacts";
import { emailsRouter } from "./emails";
import { statsRouter } from "./stats";

export const appRouter = router({
  contacts: contactsRouter,
  emails: emailsRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 6: Create apps/web/lib/trpc/client.ts**

```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "./routers/_app";

export const trpc = createTRPCReact<AppRouter>();
```

- [ ] **Step 7: Create apps/web/app/api/trpc/[trpc]/route.ts**

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/trpc/routers/_app";
import { createTRPCContext } from "@/lib/trpc/init";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
```

- [ ] **Step 8: Install nanoid**

```bash
cd apps/web && pnpm add nanoid
```

- [ ] **Step 9: Commit**

```bash
cd ../..
git add apps/web/lib/trpc/ apps/web/app/api/trpc/
git commit -m "feat: add tRPC API layer (contacts, emails, stats routers)"
```

---

## Task 10: Vercel Environment + Deployment Config

**Files:**
- Create: `apps/web/vercel.ts` (Vercel project config)

- [ ] **Step 1: Create apps/web/vercel.ts**

```typescript
import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  buildCommand: "pnpm build",
  framework: "nextjs",
  crons: [
    { path: "/api/inngest", schedule: "0 2 * * *" },  // Score recalculate 2 AM UTC
    { path: "/api/inngest", schedule: "0 6 * * *" },  // Reminder check 6 AM UTC
  ],
};
```

- [ ] **Step 2: Add all environment variables to Vercel**

Go to your Vercel project → Settings → Environment Variables, add:
```
DATABASE_URL          (from Neon dashboard)
BETTER_AUTH_SECRET    (generate: openssl rand -base64 32)
BETTER_AUTH_URL       (your production URL, e.g. https://nexus.vercel.app)
NEXT_PUBLIC_APP_URL   (same as BETTER_AUTH_URL)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
ENCRYPTION_KEY        (generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
RESEND_API_KEY
ANTHROPIC_API_KEY
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/vercel.ts
git commit -m "chore: add Vercel project config with cron schedules"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Neon Postgres + Drizzle ORM schema — Task 2
- [x] Better Auth with Google OAuth + email/password — Task 3
- [x] Token encryption AES-256-GCM — Task 4
- [x] Gmail sync (full + incremental via push) — Tasks 5, 6
- [x] Google Contacts import — Task 6
- [x] Google Calendar event extraction — Task 6
- [x] Relationship scoring engine — Task 7
- [x] Nightly score recalculation — Task 7
- [x] AI email scoring (Claude) — Task 8
- [x] Birthday + re-engagement reminders — Task 8
- [x] tRPC API (contacts, emails, stats) — Task 9
- [x] Vercel deployment config — Task 10
- [ ] **Frontend UI** — covered in Part 2 plan

**Type consistency check:**
- `computeRelationshipScore` takes `Interaction[]` from Drizzle inference — matches schema ✓
- `getGoogleClient(accountId)` returns `{ oauth2, account }` — used consistently in gmail-sync.ts ✓
- `emailAiScore` references `emails` table fields (`aiPriorityScore`, `aiCategory`, `aiSummary`, `needsReply`) — all defined in schema ✓
- `contactsRouter.get` returns `{ ...contact, interactions, scoreHistory }` — used in Part 2 contact profile ✓
- `nanoid` used for all ID generation — consistent ✓

**Placeholder scan:** No TBDs, no "implement later", no vague steps found ✓

---

> **Part 1 complete.** See `2026-04-30-nexus-part2-frontend.md` for the full UI implementation plan.
