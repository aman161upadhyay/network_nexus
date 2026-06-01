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

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/instagram`;
    const { accessToken } = await exchangeCodeForToken(code, redirectUri);

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
  } catch (error) {
    console.error("Instagram OAuth error:", error);
    return NextResponse.redirect(new URL("/settings/integrations?error=instagram_auth_failed", request.url));
  }
}
