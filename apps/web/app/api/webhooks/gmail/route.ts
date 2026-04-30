import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: NextRequest) {
  const body = await req.json();

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
