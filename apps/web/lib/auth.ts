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
        "https://www.googleapis.com/auth/gmail.readonly",
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
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          const a = account as Record<string, unknown>;
          if (a.providerId === "google" && a.accessToken) {
            const { db } = await import("@/lib/db");
            const { connectedAccounts } = await import("@/lib/db/schema");
            const { encrypt } = await import("@/lib/integrations/encryption");
            const { inngest } = await import("@/lib/inngest/client");
            const { nanoid } = await import("nanoid");

            const accountId = nanoid();
            await db.insert(connectedAccounts).values({
              id: accountId,
              userId: a.userId as string,
              provider: "google",
              accessTokenEnc: encrypt(a.accessToken as string),
              refreshTokenEnc: a.refreshToken ? encrypt(a.refreshToken as string) : null,
              tokenExpiresAt: a.accessTokenExpiresAt ? new Date(a.accessTokenExpiresAt as string | number) : null,
              scopes: typeof a.scope === "string" ? (a.scope as string).split(" ") : [],
              isActive: true,
            }).onConflictDoNothing();

            await inngest.send([
              { name: "gmail/full-sync.requested", data: { accountId, userId: a.userId as string } },
              { name: "contacts/google-sync.requested", data: { accountId, userId: a.userId as string } },
            ]);
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
