# Nexus CRM -- Integration Guide: WhatsApp, Instagram, and LinkedIn

> Last updated: 2026-05-30
> Phase: 2 (post-MVP -- Gmail, Google Contacts, and Calendar already implemented)

This guide covers the step-by-step process for connecting WhatsApp, Instagram, and LinkedIn to the Nexus CRM platform. It assumes the existing architecture is in place: Next.js 16.2.4 App Router, Drizzle ORM on Neon Postgres, tRPC v11, Inngest v4 for background jobs, and AES-256-GCM token encryption.

---

## Table of Contents

1. [WhatsApp Integration (Baileys)](#1-whatsapp-integration-baileys)
2. [Instagram Integration (Graph API)](#2-instagram-integration-graph-api)
3. [LinkedIn Integration (Plasmo Browser Extension)](#3-linkedin-integration-plasmo-browser-extension)
4. [Shared Infrastructure](#4-shared-infrastructure)
5. [Database Migration Summary](#5-database-migration-summary)

---

## 1. WhatsApp Integration (Baileys)

### 1.1 Prerequisites

| Requirement | Details |
|---|---|
| WhatsApp account | Personal account with multi-device linked devices enabled |
| Node.js runtime | Baileys requires a persistent Node.js process (not a short-lived serverless function) |
| Infrastructure | A long-running compute environment -- Vercel Fluid Compute, Railway, Fly.io, or a VPS |
| No API keys needed | Baileys connects via WhatsApp Web protocol (QR code pairing) |

### 1.2 Architecture

```
User scans QR code in Nexus UI
        |
        v
+------------------+     WebSocket      +------------------------+
| Next.js Frontend | <================> | WhatsApp Worker Service |
| (QR display)     |                    | (Baileys + Node.js)    |
+------------------+                    +------------------------+
                                               |
                                               | Inngest events
                                               v
                                        +-------------+
                                        | Inngest      |
                                        | (process     |
                                        |  messages)   |
                                        +------+------+
                                               |
                                               v
                                        +-------------+
                                        | Neon Postgres|
                                        | (interactions|
                                        |  + contacts) |
                                        +-------------+
```

**Why a separate worker?** Baileys maintains a persistent WebSocket connection to WhatsApp servers. Vercel serverless functions have a 60s timeout (300s with Fluid Compute). WhatsApp sessions must stay alive continuously to receive messages. Options:

1. **Vercel Fluid Compute** -- extended timeout, but still not truly persistent. Workable if you reconnect on each invocation using stored session credentials.
2. **Dedicated microservice** (Railway/Fly.io/VPS) -- simplest, most reliable. Runs a Node.js process that stays connected and pushes events to Inngest.
3. **Hybrid** -- store Baileys auth state in the database; spin up a Fluid Compute function that reconnects on demand, processes pending messages, then exits.

**Recommended approach for personal use:** Option 3 (Hybrid). Store Baileys auth credentials encrypted in the database. Use an Inngest cron function that runs every 5 minutes, reconnects using stored creds, fetches new messages, records interactions, and disconnects.

### 1.3 Step-by-Step Implementation

#### Step 1: Install dependencies

```bash
cd apps/web
pnpm add @whiskeysockets/baileys @hapi/boom qrcode
pnpm add -D @types/qrcode
```

#### Step 2: Create the Baileys client wrapper

Create `apps/web/lib/integrations/whatsapp/client.ts`:

```typescript
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";

// In production, replace file-based auth with database-backed auth
// See Step 4 for the database auth state adapter

export interface WhatsAppConnection {
  socket: WASocket;
  qrCode: string | null;
  isConnected: boolean;
}

export async function createWhatsAppSession(
  authStatePath: string,
  onQR: (qr: string) => void,
  onConnected: (jid: string) => void,
  onMessage: (message: any) => void,
): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(authStatePath);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    // Minimize data usage -- metadata only by default
    getMessage: async () => undefined,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      onQR(qr);
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        // Reconnect unless user explicitly logged out
        createWhatsAppSession(authStatePath, onQR, onConnected, onMessage);
      }
    }

    if (connection === "open") {
      onConnected(socket.user?.id ?? "unknown");
    }
  });

  socket.ev.on("messages.upsert", ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && msg.message) {
        onMessage(msg);
      }
    }
  });

  return socket;
}
```

#### Step 3: Create the database auth state adapter

Create `apps/web/lib/integrations/whatsapp/db-auth-state.ts`:

```typescript
import { db } from "@/lib/db";
import { whatsappAuthState } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/integrations/encryption";
import type { AuthenticationState, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { proto } from "@whiskeysockets/baileys";
import { initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";

export async function useDBAuthState(userId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const writeData = async (key: string, data: any) => {
    const serialized = JSON.stringify(data, BufferJSON.replacer);
    const encrypted = encrypt(serialized);
    await db.insert(whatsappAuthState)
      .values({ userId, key, dataEnc: encrypted })
      .onConflictDoUpdate({
        target: [whatsappAuthState.userId, whatsappAuthState.key],
        set: { dataEnc: encrypted, updatedAt: new Date() },
      });
  };

  const readData = async (key: string): Promise<any | null> => {
    const row = await db.query.whatsappAuthState.findFirst({
      where: and(
        eq(whatsappAuthState.userId, userId),
        eq(whatsappAuthState.key, key),
      ),
    });
    if (!row) return null;
    return JSON.parse(decrypt(row.dataEnc), BufferJSON.reviver);
  };

  const removeData = async (key: string) => {
    await db.delete(whatsappAuthState).where(
      and(
        eq(whatsappAuthState.userId, userId),
        eq(whatsappAuthState.key, key),
      ),
    );
  };

  const creds = (await readData("creds")) ?? initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const result: Record<string, SignalDataTypeMap[keyof SignalDataTypeMap]> = {};
          for (const id of ids) {
            const data = await readData(`${type}-${id}`);
            if (data) {
              result[id] = type === "app-state-sync-key"
                ? proto.Message.AppStateSyncKeyData.fromObject(data)
                : data;
            }
          }
          return result;
        },
        set: async (data: Record<string, Record<string, any>>) => {
          for (const [type, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries)) {
              if (value) {
                await writeData(`${type}-${id}`, value);
              } else {
                await removeData(`${type}-${id}`);
              }
            }
          }
        },
      },
    },
    saveCreds: () => writeData("creds", creds),
  };
}
```

#### Step 4: Create the Inngest sync function

Create `apps/web/lib/inngest/whatsapp-sync.ts`:

```typescript
import { inngest } from "./client";
import { db } from "@/lib/db";
import { connectedAccounts, contacts, interactions, contactSourceLinks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export const whatsappSync = inngest.createFunction(
  {
    id: "whatsapp-sync",
    concurrency: { limit: 2 },
  },
  { event: "whatsapp/sync.requested" },
  async ({ event, step }) => {
    const { userId, accountId } = event.data as {
      userId: string;
      accountId: string;
    };

    // Step 1: Connect to WhatsApp using stored auth state
    const messages = await step.run("fetch-new-messages", async () => {
      // Import dynamically to avoid bundling Baileys in non-worker contexts
      const { useDBAuthState } = await import(
        "@/lib/integrations/whatsapp/db-auth-state"
      );
      const makeWASocket = (await import("@whiskeysockets/baileys")).default;

      const { state, saveCreds } = await useDBAuthState(userId);
      const socket = makeWASocket({ auth: state, printQRInTerminal: false });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 30_000);
        socket.ev.on("connection.update", ({ connection }) => {
          if (connection === "open") { clearTimeout(timeout); resolve(); }
          if (connection === "close") { clearTimeout(timeout); reject(new Error("Disconnected")); }
        });
        socket.ev.on("creds.update", saveCreds);
      });

      // Fetch recent chats
      const chats = await socket.groupFetchAllParticipating();
      // ... process chats and recent messages

      socket.end(undefined);
      return []; // Return processed message metadata
    });

    // Step 2: Upsert contacts and record interactions
    await step.run("process-messages", async () => {
      for (const msg of messages) {
        // Find or create contact by WhatsApp JID
        // Record interaction with channel: "whatsapp"
        // See interaction recording pattern in gmail-sync.ts
      }
    });

    // Step 3: Update last synced timestamp
    await step.run("update-sync-timestamp", () =>
      db.update(connectedAccounts).set({
        lastSyncedAt: new Date(),
      }).where(eq(connectedAccounts.id, accountId))
    );
  },
);
```

#### Step 5: Create the QR code pairing API route

Create `apps/web/app/api/whatsapp/pair/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Start a WhatsApp pairing session
  // Return QR code data for the frontend to display
  // The actual connection flow depends on whether you use
  // a worker service or hybrid approach

  return NextResponse.json({
    status: "pairing_initiated",
    // qrCode will be sent via WebSocket or polling
  });
}
```

#### Step 6: Create the onboarding UI component

Create `apps/web/components/integrations/whatsapp-connect.tsx`:

A modal component that:
1. Calls `POST /api/whatsapp/pair` to initiate pairing
2. Displays the QR code using the `qrcode` package (renders to canvas/SVG)
3. Polls for connection status
4. On success, creates a `connectedAccounts` row with provider `whatsapp`
5. Triggers the `whatsapp/sync.requested` Inngest event

#### Step 7: Register the Inngest function

Modify `apps/web/app/api/inngest/route.ts` -- add `whatsappSync` to the `functions` array in the `serve()` call.

### 1.4 Database Changes

Add a new table for WhatsApp auth state storage. Modify `apps/web/lib/db/schema.ts`:

```typescript
export const whatsappAuthState = pgTable("whatsapp_auth_state", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  dataEnc: text("data_enc").notNull(), // AES-256-GCM encrypted
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("wa_auth_user_key_unique").on(t.userId, t.key),
  index("wa_auth_user_id_idx").on(t.userId),
]);
```

The `connectedAccounts` table already supports provider `whatsapp` (defined in `providerEnum`). The `interactions` table already supports channel `whatsapp` (defined in `channelEnum`). The `contactSourceLinks` table already supports source `whatsapp` (defined in `sourceEnum`). No enum changes needed.

Run the migration after adding the table:

```bash
cd apps/web
pnpm drizzle-kit push
```

### 1.5 Security Considerations

| Concern | Details |
|---|---|
| **ToS risk (HIGH)** | Baileys reverse-engineers the WhatsApp Web protocol. WhatsApp ToS prohibit unofficial clients. Risk: account ban. Mitigations: use only for personal accounts, do not automate sending, label clearly in the UI as "experimental / personal use only" |
| **Auth state sensitivity** | Baileys auth credentials grant full access to the user's WhatsApp. Store encrypted (AES-256-GCM) in the `whatsapp_auth_state` table. Never log or expose raw credentials |
| **Rate limits** | WhatsApp will throttle or ban accounts that make too many requests. Limit sync to every 5-15 minutes. Never auto-send messages |
| **Data minimization** | Default to metadata-only sync (timestamps, contact JIDs, message counts). Require explicit opt-in for full message content. Document this clearly in the privacy policy |
| **Session persistence** | If the Baileys session disconnects, the user must re-scan the QR code. Store creds in DB to minimize re-pairing frequency |

### 1.6 Cost

| Item | Cost |
|---|---|
| Baileys library | Free (MIT license) |
| Persistent compute (if using dedicated worker) | ~$5-15/month on Railway or Fly.io |
| Vercel Fluid Compute (if using hybrid approach) | Included in Pro plan (within function execution limits) |
| Database storage for auth state | Negligible (a few KB per user) |

### 1.7 Estimated Effort

| Task | Complexity | Time |
|---|---|---|
| Baileys client wrapper + DB auth state adapter | Medium | 4-6 hours |
| Inngest sync function with message processing | Medium | 4-6 hours |
| QR code pairing flow (API + UI) | Medium | 3-4 hours |
| Contact upsert + interaction recording | Low | 2-3 hours |
| Testing with real WhatsApp account | Medium | 2-3 hours |
| **Total** | | **15-22 hours** |

---

## 2. Instagram Integration (Graph API)

### 2.1 Prerequisites

| Requirement | Details |
|---|---|
| Instagram account type | **Creator** or **Business** account (personal accounts cannot use Graph API) |
| Facebook Developer account | Required at [developers.facebook.com](https://developers.facebook.com) |
| Facebook App | Create a new app with "Instagram" product added |
| App Review | Required for production use of `instagram_manage_messages` permission |
| HTTPS callback URL | For OAuth redirect (Vercel provides this) |

**Important:** The Instagram Basic Display API reached end-of-life in December 2024. The only supported API for Instagram is the Graph API, which requires a Business or Creator account linked to a Facebook Page.

### 2.2 Architecture

```
User clicks "Connect Instagram" in Nexus
        |
        v
+------------------+    OAuth 2.0     +------------------+
| Next.js          | ===============> | Facebook/Meta    |
| (Better Auth or  |    redirect      | OAuth Server     |
|  manual OAuth)   | <=============== | (Graph API)      |
+------------------+                  +------------------+
        |
        | Store encrypted tokens in connectedAccounts
        v
+------------------+     Inngest      +------------------+
| Token stored     | ==============>  | instagram-sync   |
| event fired      |     event        | (Inngest fn)     |
+------------------+                  +------------------+
                                             |
                                             | Graph API calls
                                             v
                                      +------------------+
                                      | Instagram        |
                                      | Graph API        |
                                      | - /me/conversations
                                      | - /me (profile)  |
                                      +------------------+
```

### 2.3 Step-by-Step Implementation

#### Step 1: Create Facebook App and configure Instagram

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app (type: "Business")
3. Add the "Instagram" product
4. Under Instagram > Basic Display, note: this is EOL -- skip it
5. Under Instagram > API Setup:
   - Add your Instagram Business/Creator account as a test user
   - Generate a test user token (valid for 60 days)
6. Configure OAuth redirect URI: `https://nexus-build-amanupadhyay.vercel.app/api/auth/callback/instagram`
7. Note your App ID and App Secret

#### Step 2: Set environment variables

Add to Vercel (and `.env.local`):

```
INSTAGRAM_APP_ID=your_facebook_app_id
INSTAGRAM_APP_SECRET=your_facebook_app_secret
```

#### Step 3: Install dependencies

No additional packages needed -- use the native `fetch` API for Graph API calls. Alternatively:

```bash
cd apps/web
# Optional: use a lightweight HTTP client if preferred
# The Graph API is simple REST, no SDK needed
```

#### Step 4: Create the Instagram Graph API client

Create `apps/web/lib/integrations/instagram/client.ts`:

```typescript
const GRAPH_API_BASE = "https://graph.instagram.com/v21.0";
const FACEBOOK_GRAPH_BASE = "https://graph.facebook.com/v21.0";

export interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  profilePictureUrl: string;
  followersCount: number;
  mediaCount: number;
}

export interface InstagramConversation {
  id: string;
  participants: { data: { id: string; username: string }[] };
  updatedTime: string;
  messages?: {
    data: { id: string; message: string; from: { id: string }; created_time: string }[];
  };
}

export async function getInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const res = await fetch(
    `${GRAPH_API_BASE}/me?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${accessToken}`,
  );
  if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
  return res.json();
}

export async function getConversations(
  accessToken: string,
  pageId: string,
): Promise<InstagramConversation[]> {
  // Instagram DM access requires the Page-scoped token
  const res = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${pageId}/conversations?platform=instagram&fields=participants,updated_time,messages.limit(5){message,from,created_time}&access_token=${accessToken}`,
  );
  if (!res.ok) throw new Error(`Instagram Conversations API error: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
  accessToken: string;
  userId: string;
}> {
  // Short-lived token exchange
  const res = await fetch(`${FACEBOOK_GRAPH_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const data = await res.json();

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `${FACEBOOK_GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_APP_ID}&client_secret=${process.env.INSTAGRAM_APP_SECRET}&fb_exchange_token=${data.access_token}`,
  );
  const longData = await longRes.json();

  return {
    accessToken: longData.access_token,
    userId: data.user_id,
  };
}

export async function refreshLongLivedToken(token: string): Promise<string> {
  const res = await fetch(
    `${FACEBOOK_GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_APP_ID}&client_secret=${process.env.INSTAGRAM_APP_SECRET}&fb_exchange_token=${token}`,
  );
  const data = await res.json();
  return data.access_token;
}
```

#### Step 5: Create the OAuth route handler

Create `apps/web/app/api/auth/callback/instagram/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { encrypt } from "@/lib/integrations/encryption";
import { exchangeCodeForToken, getInstagramProfile } from "@/lib/integrations/instagram/client";
import { inngest } from "@/lib/inngest/client";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/settings/integrations?error=no_code", request.url));
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/instagram`;
  const { accessToken, userId: igUserId } = await exchangeCodeForToken(code, redirectUri);

  // Get profile info
  const profile = await getInstagramProfile(accessToken);

  // Store encrypted token in connectedAccounts
  const accountId = nanoid();
  await db.insert(connectedAccounts).values({
    id: accountId,
    userId: session.user.id,
    provider: "instagram",
    accountEmail: null, // Instagram doesn't expose email
    accountName: `@${profile.username}`,
    accessTokenEnc: encrypt(accessToken),
    refreshTokenEnc: null,
    tokenExpiresAt: new Date(Date.now() + 60 * 86_400_000), // 60 days
    scopes: ["instagram_basic", "instagram_manage_messages", "pages_show_list"],
    isActive: true,
    lastSyncedAt: null,
  });

  // Trigger initial sync
  await inngest.send({
    name: "instagram/sync.requested",
    data: { userId: session.user.id, accountId },
  });

  return NextResponse.redirect(new URL("/settings/integrations?connected=instagram", request.url));
}
```

#### Step 6: Create the connect button (OAuth initiation)

The OAuth flow starts by redirecting to Facebook's authorization URL. Add to the integrations settings page:

```typescript
// OAuth authorization URL builder
function getInstagramAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/instagram`,
    scope: "instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata",
    response_type: "code",
    state: crypto.randomUUID(), // CSRF protection
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}
```

#### Step 7: Create the Inngest sync function

Create `apps/web/lib/inngest/instagram-sync.ts`:

```typescript
import { inngest } from "./client";
import { db } from "@/lib/db";
import { connectedAccounts, contacts, interactions, contactSourceLinks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/integrations/encryption";
import { getConversations, getInstagramProfile, refreshLongLivedToken } from "@/lib/integrations/instagram/client";
import { encrypt } from "@/lib/integrations/encryption";
import { nanoid } from "nanoid";

export const instagramSync = inngest.createFunction(
  {
    id: "instagram-sync",
    concurrency: { limit: 3 },
  },
  { event: "instagram/sync.requested" },
  async ({ event, step }) => {
    const { userId, accountId } = event.data as {
      userId: string;
      accountId: string;
    };

    // Step 1: Get and refresh token if needed
    const account = await step.run("get-account", () =>
      db.query.connectedAccounts.findFirst({
        where: and(
          eq(connectedAccounts.id, accountId),
          eq(connectedAccounts.userId, userId),
        ),
      }),
    );

    if (!account || !account.accessTokenEnc) {
      throw new Error("Instagram account not found or no token");
    }

    let accessToken = decrypt(account.accessTokenEnc);

    // Refresh token if expiring within 7 days
    if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() - Date.now() < 7 * 86_400_000) {
      accessToken = await step.run("refresh-token", async () => {
        const newToken = await refreshLongLivedToken(accessToken);
        await db.update(connectedAccounts).set({
          accessTokenEnc: encrypt(newToken),
          tokenExpiresAt: new Date(Date.now() + 60 * 86_400_000),
        }).where(eq(connectedAccounts.id, accountId));
        return newToken;
      });
    }

    // Step 2: Fetch conversations (DM metadata)
    const conversations = await step.run("fetch-conversations", () =>
      getConversations(accessToken, account.accountName ?? ""),
    );

    // Step 3: Process each conversation into contacts + interactions
    await step.run("process-conversations", async () => {
      for (const convo of conversations) {
        for (const participant of convo.participants.data) {
          // Skip self
          if (participant.id === account.accountName) continue;

          // Find or create contact by Instagram username
          let contact = await db.query.contacts.findFirst({
            where: and(
              eq(contacts.userId, userId),
              eq(contacts.instagramHandle, participant.username),
            ),
          });

          if (!contact) {
            const contactId = nanoid();
            await db.insert(contacts).values({
              id: contactId,
              userId,
              displayName: participant.username,
              instagramHandle: participant.username,
            });

            await db.insert(contactSourceLinks).values({
              contactId,
              source: "instagram",
              sourceId: participant.id,
            });

            contact = { id: contactId } as any;
          }

          // Record interaction from last message in conversation
          if (convo.messages?.data?.length) {
            const lastMsg = convo.messages.data[0];
            const direction = lastMsg.from.id === participant.id ? "inbound" : "outbound";

            await db.insert(interactions).values({
              userId,
              contactId: contact!.id,
              channel: "instagram",
              direction,
              subject: null,
              bodyPreview: null, // Metadata-only by default
              externalId: lastMsg.id,
              occurredAt: new Date(lastMsg.created_time),
              metadata: { conversationId: convo.id },
            }).onConflictDoNothing();
          }
        }
      }
    });

    // Step 4: Update sync timestamp
    await step.run("update-timestamp", () =>
      db.update(connectedAccounts).set({
        lastSyncedAt: new Date(),
      }).where(eq(connectedAccounts.id, accountId))
    );
  },
);
```

#### Step 8: Add token refresh cron

Create or add to `apps/web/lib/inngest/instagram-token-refresh.ts`:

```typescript
import { inngest } from "./client";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/integrations/encryption";
import { refreshLongLivedToken } from "@/lib/integrations/instagram/client";

export const instagramTokenRefresh = inngest.createFunction(
  {
    id: "instagram-token-refresh",
    triggers: [{ cron: "0 3 * * *" }], // Daily at 3 AM UTC
  },
  async ({ step }) => {
    // Find tokens expiring within 7 days
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86_400_000);
    const expiringAccounts = await step.run("find-expiring", () =>
      db.query.connectedAccounts.findMany({
        where: and(
          eq(connectedAccounts.provider, "instagram"),
          eq(connectedAccounts.isActive, true),
          lt(connectedAccounts.tokenExpiresAt, sevenDaysFromNow),
        ),
      }),
    );

    for (const account of expiringAccounts) {
      await step.run(`refresh-${account.id}`, async () => {
        if (!account.accessTokenEnc) return;
        const oldToken = decrypt(account.accessTokenEnc);
        const newToken = await refreshLongLivedToken(oldToken);
        await db.update(connectedAccounts).set({
          accessTokenEnc: encrypt(newToken),
          tokenExpiresAt: new Date(Date.now() + 60 * 86_400_000),
        }).where(eq(connectedAccounts.id, account.id));
      });
    }
  },
);
```

#### Step 9: Register Inngest functions

Add `instagramSync` and `instagramTokenRefresh` to the `serve()` call in `apps/web/app/api/inngest/route.ts`.

### 2.4 Database Changes

No new tables needed. The existing schema fully supports Instagram:

- `connectedAccounts` with `provider: "instagram"` -- stores the encrypted long-lived token
- `contacts` with `instagramHandle` field -- links contacts to their Instagram identity
- `interactions` with `channel: "instagram"` -- records DM interactions
- `contactSourceLinks` with `source: "instagram"` -- maps contacts to Instagram user IDs

The only schema change is that `connectedAccounts.accountEmail` should be nullable (it already is -- Instagram accounts don't have email exposure via API).

### 2.5 Security Considerations

| Concern | Details |
|---|---|
| **Account type requirement** | Users must convert to Business/Creator account. Communicate this clearly in the UI. Personal accounts will fail to authenticate |
| **App Review (CRITICAL)** | The `instagram_manage_messages` permission requires Meta App Review for production use. Without it, only test users added in the Facebook Developer Console can use the integration. Plan for a 2-6 week review process |
| **Token expiration** | Long-lived tokens last 60 days. Must be refreshed before expiry or the user loses access. The cron job in Step 8 handles this |
| **Rate limits** | Graph API rate limits: 200 calls per user per hour. The sync function should batch requests and respect `X-Business-Use-Case-Usage` headers |
| **Data access** | DM content access is sensitive. Default to metadata-only (timestamps, participant IDs). Full message content requires explicit user consent |
| **Facebook Page requirement** | Instagram Graph API requires the account to be linked to a Facebook Page. This is a significant UX friction point |

### 2.6 Cost

| Item | Cost |
|---|---|
| Facebook Developer account | Free |
| Graph API usage | Free (within rate limits) |
| App Review | Free (but requires time investment for documentation) |
| Token storage (Neon) | Negligible |

### 2.7 Estimated Effort

| Task | Complexity | Time |
|---|---|---|
| Facebook App setup + Instagram product configuration | Low | 1-2 hours |
| OAuth flow (callback route + token exchange) | Medium | 3-4 hours |
| Graph API client (profile, conversations, token refresh) | Medium | 3-4 hours |
| Inngest sync function | Medium | 3-4 hours |
| Token refresh cron | Low | 1-2 hours |
| Settings UI (connect button, status display) | Low | 2-3 hours |
| App Review submission (documentation, screencasts) | High | 4-8 hours |
| **Total** | | **17-27 hours** |

Note: The App Review process itself may take 2-6 weeks after submission, but it is not active work.

---

## 3. LinkedIn Integration (Plasmo Browser Extension)

LinkedIn's official API is heavily restricted. The Marketing API and Community Management API require partner-level access. For personal CRM use, a browser extension that reads visible profile data from the LinkedIn DOM is the only practical approach.

### 3.1 Prerequisites

| Requirement | Details |
|---|---|
| Chrome or Chromium-based browser | Extension target platform |
| LinkedIn account | Standard (free) account is sufficient |
| Plasmo framework | Browser extension framework with React + TypeScript support |
| Nexus API endpoint | For the extension to POST contact data to |

### 3.2 Architecture

```
+-------------------+                    +------------------+
| LinkedIn.com      |                    | Nexus Web App    |
| (browser tab)     |                    | (Next.js)        |
+-------------------+                    +------------------+
        |                                        ^
        | DOM scraping                           | POST /api/extension/import
        v                                        |
+-------------------+                            |
| Plasmo Extension  | =========================>+
| (content script   |    authenticated API call
|  + popup UI)      |
+-------------------+
```

The extension runs as a Chrome content script on `linkedin.com/*` pages. When the user visits a LinkedIn profile, the extension:

1. Reads visible profile data from the DOM (name, title, company, location, profile URL)
2. Shows a floating "Add to Nexus" button or sidebar panel
3. On click, sends the data to the Nexus API via an authenticated POST request
4. The API upserts the contact and creates a `contactSourceLinks` entry with source `manual` (since it's user-initiated)

### 3.3 Step-by-Step Implementation

#### Step 1: Scaffold the extension

```bash
# From the repo root
cd packages
pnpm create plasmo linkedin-nexus
cd linkedin-nexus
```

This creates a `packages/linkedin-nexus/` directory with the Plasmo extension scaffold.

#### Step 2: Configure extension manifest

Edit `packages/linkedin-nexus/package.json`:

```json
{
  "name": "linkedin-nexus",
  "displayName": "Nexus - LinkedIn Import",
  "version": "0.1.0",
  "description": "Import LinkedIn contacts into Nexus CRM",
  "manifest": {
    "permissions": ["storage", "activeTab"],
    "host_permissions": ["https://www.linkedin.com/*"]
  }
}
```

#### Step 3: Create the content script (DOM scraper)

Create `packages/linkedin-nexus/contents/linkedin-profile.ts`:

```typescript
import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://www.linkedin.com/in/*"],
  run_at: "document_idle",
};

export interface LinkedInProfileData {
  fullName: string;
  headline: string | null;
  company: string | null;
  title: string | null;
  location: string | null;
  profileUrl: string;
  photoUrl: string | null;
  connectionDegree: string | null;
}

export function scrapeProfile(): LinkedInProfileData | null {
  // These selectors target LinkedIn's current DOM structure
  // They may break when LinkedIn updates their UI -- requires maintenance
  const nameEl = document.querySelector("h1.text-heading-xlarge");
  if (!nameEl) return null;

  const headlineEl = document.querySelector(".text-body-medium.break-words");
  const locationEl = document.querySelector(".text-body-small.inline.t-black--light.break-words");
  const photoEl = document.querySelector<HTMLImageElement>(
    "img.pv-top-card-profile-picture__image--show",
  );

  // Extract company and title from headline (e.g., "Software Engineer at Google")
  const headline = headlineEl?.textContent?.trim() ?? null;
  let company: string | null = null;
  let title: string | null = null;
  if (headline?.includes(" at ")) {
    const parts = headline.split(" at ");
    title = parts[0].trim();
    company = parts[1].trim();
  }

  return {
    fullName: nameEl.textContent?.trim() ?? "Unknown",
    headline,
    company,
    title,
    location: locationEl?.textContent?.trim() ?? null,
    profileUrl: window.location.href.split("?")[0],
    photoUrl: photoEl?.src ?? null,
    connectionDegree: null,
  };
}
```

#### Step 4: Create the popup/sidebar UI

Create `packages/linkedin-nexus/popup.tsx`:

```tsx
import { useState, useEffect } from "react";

function Popup() {
  const [nexusUrl, setNexusUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    // Load saved settings from chrome.storage
    chrome.storage.sync.get(["nexusUrl", "apiToken"], (result) => {
      setNexusUrl(result.nexusUrl ?? "");
      setApiToken(result.apiToken ?? "");
    });
  }, []);

  const saveSettings = () => {
    chrome.storage.sync.set({ nexusUrl, apiToken });
    setStatus("saved");
  };

  const importCurrentProfile = async () => {
    setStatus("saving");
    try {
      // Send message to content script to scrape the current page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id!, { action: "scrape" });

      // POST to Nexus API
      const res = await fetch(`${nexusUrl}/api/extension/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(response.profile),
      });

      if (res.ok) {
        setStatus("saved");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={{ width: 320, padding: 16, fontFamily: "Inter, sans-serif" }}>
      <h2>Nexus LinkedIn Import</h2>
      <label>
        Nexus URL:
        <input value={nexusUrl} onChange={(e) => setNexusUrl(e.target.value)} placeholder="https://your-nexus.vercel.app" />
      </label>
      <label>
        API Token:
        <input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} />
      </label>
      <button onClick={saveSettings}>Save Settings</button>
      <hr />
      <button onClick={importCurrentProfile} disabled={status === "saving"}>
        {status === "saving" ? "Importing..." : "Import This Profile"}
      </button>
      {status === "saved" && <p>Imported successfully.</p>}
      {status === "error" && <p>Import failed. Check your settings.</p>}
    </div>
  );
}

export default Popup;
```

#### Step 5: Create the Nexus API endpoint for extension imports

Create `apps/web/app/api/extension/import/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts, contactSourceLinks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  // Validate the extension API token
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up user by extension API token
  // You'll need to add an `extensionApiToken` field to userSettings
  // or create a dedicated API keys table
  // For now, validate against a stored token
  const userSetting = await db.query.userSettings.findFirst({
    // where: eq(userSettings.extensionApiToken, token),
    // Placeholder -- implement token lookup
  });

  // if (!userSetting) {
  //   return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  // }

  const body = await request.json();
  const { fullName, headline, company, title, location, profileUrl, photoUrl } = body;

  // Check if contact already exists by LinkedIn URL
  const existing = await db.query.contacts.findFirst({
    where: and(
      // eq(contacts.userId, userSetting.userId),
      eq(contacts.linkedinUrl, profileUrl),
    ),
  });

  if (existing) {
    // Update existing contact with fresh data
    await db.update(contacts).set({
      company: company ?? existing.company,
      title: title ?? existing.title,
      photoUrl: photoUrl ?? existing.photoUrl,
      updatedAt: new Date(),
    }).where(eq(contacts.id, existing.id));

    return NextResponse.json({ status: "updated", contactId: existing.id });
  }

  // Create new contact
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");
  const contactId = nanoid();

  await db.insert(contacts).values({
    id: contactId,
    userId: "TODO", // From token lookup
    displayName: fullName,
    firstName,
    lastName,
    company,
    title,
    linkedinUrl: profileUrl,
    photoUrl,
  });

  await db.insert(contactSourceLinks).values({
    contactId,
    source: "manual", // LinkedIn extension imports are treated as manual
    sourceId: profileUrl,
    rawData: { fullName, headline, company, title, location, profileUrl },
  });

  return NextResponse.json({ status: "created", contactId });
}
```

#### Step 6: Generate extension API token in settings

Add to the Settings > Integrations page a section for "Browser Extension" that:
1. Generates a random API token (stored in `userSettings` or a new `apiTokens` table)
2. Shows a "Copy Token" button
3. Displays installation instructions for the Chrome extension

#### Step 7: CSV import alternative

For users who do not want a browser extension, add a LinkedIn CSV import feature:

1. User goes to LinkedIn > Settings > Data Privacy > Get a copy of your data > Connections
2. Downloads `Connections.csv`
3. Uploads to Nexus Settings > Import > LinkedIn CSV
4. Parse the CSV (columns: First Name, Last Name, Email Address, Company, Position, Connected On)
5. Upsert contacts with source `manual`

This is a simpler alternative and should be implemented first.

### 3.4 Database Changes

Add an `extensionApiToken` column to `userSettings` or create a new table:

```typescript
// Option A: Add to userSettings
// In schema.ts, add to the userSettings table:
extensionApiToken: text("extension_api_token"),

// Option B: New table for API keys (more extensible)
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "LinkedIn Extension"
  tokenHash: text("token_hash").notNull(), // bcrypt hash of the token
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 3.5 Security Considerations

| Concern | Details |
|---|---|
| **ToS compliance (LOW RISK)** | The extension reads publicly visible profile data that the user is already looking at. It does not scrape at scale or access private data. This is similar to how many CRM browser extensions work (e.g., HubSpot, Apollo) |
| **DOM selector brittleness** | LinkedIn frequently changes their DOM structure. Selectors will break. Plan for maintenance and consider using `aria-label` or data attributes when available |
| **Extension API token** | Treat like a password. Hash with bcrypt before storing. Transmit only over HTTPS |
| **No automated scraping** | The extension only acts when the user clicks "Import". It does not crawl or automate profile visits |
| **Chrome Web Store review** | If distributing via Chrome Web Store, the extension must pass review. Host permissions for `linkedin.com` are scrutinized -- clearly explain the use case |

### 3.6 Cost

| Item | Cost |
|---|---|
| Plasmo framework | Free (MIT license) |
| Chrome Web Store developer fee | $5 one-time |
| LinkedIn account | Free (no API costs) |

### 3.7 Estimated Effort

| Task | Complexity | Time |
|---|---|---|
| Plasmo scaffold + manifest config | Low | 1-2 hours |
| Content script (DOM scraper) | Medium | 3-4 hours |
| Popup UI | Low | 2-3 hours |
| Nexus API endpoint for imports | Low | 2-3 hours |
| API token generation in settings | Low | 1-2 hours |
| LinkedIn CSV import (alternative) | Low | 2-3 hours |
| Chrome Web Store submission | Low | 1-2 hours |
| **Total** | | **12-19 hours** |

---

## 4. Shared Infrastructure

### 4.1 Inngest Function Registration

All new Inngest functions must be registered in `apps/web/app/api/inngest/route.ts`. After implementing the integrations, the `serve()` call should include:

```typescript
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { gmailFullSync, gmailIncrementalSync } from "@/lib/inngest/gmail-sync";
import { googleContactsSync } from "@/lib/inngest/contact-sync";
import { emailAiScore } from "@/lib/inngest/email-ai-score";
import { scoreRecalculate } from "@/lib/inngest/score-recalculate";
import { reminderCheck } from "@/lib/inngest/reminder-check";
// Phase 2 additions:
import { whatsappSync } from "@/lib/inngest/whatsapp-sync";
import { instagramSync } from "@/lib/inngest/instagram-sync";
import { instagramTokenRefresh } from "@/lib/inngest/instagram-token-refresh";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    gmailFullSync,
    gmailIncrementalSync,
    googleContactsSync,
    emailAiScore,
    scoreRecalculate,
    reminderCheck,
    // Phase 2:
    whatsappSync,
    instagramSync,
    instagramTokenRefresh,
  ],
});
```

### 4.2 Settings Integrations Page Updates

The integrations settings page at `apps/web/app/(dashboard)/settings/integrations/` needs cards for each new integration:

| Integration | Connect Action | Status Display |
|---|---|---|
| WhatsApp | "Scan QR Code" button (opens modal) | Connected as +1234567890, last synced 5m ago |
| Instagram | "Connect Instagram" button (OAuth redirect) | Connected as @username, last synced 2h ago |
| LinkedIn | "Install Extension" link + "Import CSV" button | X contacts imported |

### 4.3 Contact Deduplication

When importing contacts from new channels, check for duplicates:

1. **Exact match on email** -- if the contact from Instagram/LinkedIn has an email that matches an existing contact
2. **Exact match on phone** -- WhatsApp JID contains the phone number
3. **LinkedIn URL match** -- check `contacts.linkedinUrl`
4. **Instagram handle match** -- check `contacts.instagramHandle`
5. **Fuzzy name match** -- as a fallback, use Levenshtein distance on `displayName` (low threshold)

When a match is found, merge the data (update missing fields, add the new `contactSourceLinks` entry) rather than creating a duplicate.

### 4.4 Interaction Recording Pattern

All integrations should follow the same pattern for recording interactions, consistent with the existing Gmail sync:

```typescript
await db.insert(interactions).values({
  userId,
  contactId,
  channel: "whatsapp" | "instagram" | "linkedin",
  direction: "inbound" | "outbound",
  subject: null,           // WhatsApp/Instagram don't have subjects
  bodyPreview: null,        // Metadata-only by default
  externalId: messageId,    // Platform-specific message ID
  occurredAt: messageDate,
  metadata: { /* platform-specific data */ },
}).onConflictDoNothing();   // Prevent duplicate interactions
```

### 4.5 Scoring Engine Compatibility

The existing scoring engine at `apps/web/lib/scoring/relationship-score.ts` already supports all channels with the following weights:

- `whatsapp`: 1.2 (personal channel)
- `instagram`: 0.6 (lighter signal)
- `linkedin`: 0.4 (weakest signal)
- `calendar`: 1.5 (strongest -- in-person)
- `email`: 1.0 (baseline)
- `phone`: 1.3

WhatsApp and Instagram interactions will automatically contribute to the **personal score** dimension. LinkedIn interactions contribute to the **professional score**. No changes to the scoring engine are needed.

---

## 5. Database Migration Summary

### New Tables

| Table | Integration | Purpose |
|---|---|---|
| `whatsapp_auth_state` | WhatsApp | Encrypted Baileys session credentials |
| `api_keys` (optional) | LinkedIn Extension | Extension API token storage |

### Modified Tables

| Table | Change | Integration |
|---|---|---|
| `user_settings` | Add `extensionApiToken` column (if not using separate `api_keys` table) | LinkedIn |

### No Changes Needed

The following existing tables already support the new integrations via their enum columns:

- `connectedAccounts` -- `providerEnum` includes `whatsapp`, `instagram`, `linkedin`
- `interactions` -- `channelEnum` includes `whatsapp`, `instagram`, `linkedin`
- `contacts` -- has `whatsappNumber`, `instagramHandle`, `linkedinUrl` fields
- `contactSourceLinks` -- `sourceEnum` includes `whatsapp`, `instagram`

### Migration Command

After adding the new table(s) to `apps/web/lib/db/schema.ts`:

```bash
cd apps/web
pnpm drizzle-kit push
```

---

## Appendix: Implementation Priority

| Integration | Priority | Reason |
|---|---|---|
| LinkedIn CSV Import | 1st | Simplest to implement (2-3 hours), no dependencies, immediate value |
| Instagram Graph API | 2nd | Standard OAuth flow, fits existing patterns, but requires App Review lead time -- start early |
| WhatsApp (Baileys) | 3rd | Most complex (persistent connections, session management), highest ToS risk |
| LinkedIn Extension | 4th | Nice-to-have after CSV import covers the basic use case |

**Total estimated effort across all integrations: 44-68 hours (6-9 working days)**
