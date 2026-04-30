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
