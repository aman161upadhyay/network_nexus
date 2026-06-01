import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { useDBAuthState } from "@/lib/integrations/whatsapp/db-auth-state";
import { inngest } from "@/lib/inngest/client";
import { nanoid } from "nanoid";
import QRCode from "qrcode";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Dynamically import Baileys to avoid bundling issues
    const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion } =
      await import("@whiskeysockets/baileys");
    const { Boom } = await import("@hapi/boom");

    const { state, saveCreds } = await useDBAuthState(userId);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      getMessage: async () => undefined,
    });

    socket.ev.on("creds.update", saveCreds);

    // Wait for either QR code or connection
    const result = await new Promise<{ qrDataUrl?: string; jid?: string; error?: string }>(
      (resolve) => {
        const timeout = setTimeout(() => {
          socket.end(undefined);
          resolve({ error: "Timeout waiting for QR code" });
        }, 30_000);

        socket.ev.on("connection.update", async (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            clearTimeout(timeout);
            try {
              const dataUrl = await QRCode.toDataURL(qr);
              // Don't close the socket yet - user needs to scan
              // But we do need to return the QR code
              // The socket will be cleaned up after timeout or connection
              resolve({ qrDataUrl: dataUrl });
            } catch {
              resolve({ error: "Failed to generate QR code" });
            }
          }

          if (connection === "open") {
            clearTimeout(timeout);
            const jid = socket.user?.id ?? "unknown";

            // Store connected account
            const accountId = nanoid();
            await db.insert(connectedAccounts).values({
              id: accountId,
              userId,
              provider: "whatsapp",
              accountEmail: null,
              accountName: jid,
              accessTokenEnc: null, // Auth state stored in whatsappAuthState table
              refreshTokenEnc: null,
              tokenExpiresAt: null,
              scopes: [],
              isActive: true,
              lastSyncedAt: null,
            }).onConflictDoNothing();

            // Trigger initial sync
            await inngest.send({
              name: "whatsapp/sync.requested",
              data: { userId, accountId },
            });

            socket.end(undefined);
            resolve({ jid });
          }

          if (connection === "close") {
            clearTimeout(timeout);
            const reason = (lastDisconnect?.error as InstanceType<typeof Boom>)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
              resolve({ error: "Logged out" });
            }
          }
        });
      },
    );

    if (result.error) {
      return NextResponse.json({ status: "error", error: result.error }, { status: 500 });
    }

    if (result.qrDataUrl) {
      return NextResponse.json({
        status: "qr_ready",
        qrCode: result.qrDataUrl,
      });
    }

    if (result.jid) {
      return NextResponse.json({
        status: "connected",
        jid: result.jid,
      });
    }

    return NextResponse.json({ status: "unknown" }, { status: 500 });
  } catch (error) {
    console.error("WhatsApp pairing error:", error);
    return NextResponse.json(
      { status: "error", error: "Failed to initiate pairing" },
      { status: 500 },
    );
  }
}
