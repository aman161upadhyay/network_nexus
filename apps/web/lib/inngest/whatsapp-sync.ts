import { inngest } from "./client";
import { db } from "@/lib/db";
import { connectedAccounts, contacts, interactions, contactSourceLinks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export const whatsappSync = inngest.createFunction(
  {
    id: "whatsapp-sync",
    concurrency: { limit: 2 },
    triggers: [{ event: "whatsapp/sync.requested" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, accountId } = event.data as {
      userId: string;
      accountId: string;
    };

    // Step 1: Connect to WhatsApp using stored auth state and fetch recent messages
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

      // Collect incoming messages for a short window
      const collected: {
        jid: string;
        pushName: string | null;
        messageId: string;
        timestamp: number;
        fromMe: boolean;
      }[] = [];

      // Fetch recent chats metadata from store
      // In the hybrid approach we collect messages that arrive during our brief connection
      socket.ev.on("messages.upsert", ({ messages: msgs }) => {
        for (const msg of msgs) {
          if (msg.key.remoteJid && msg.message) {
            collected.push({
              jid: msg.key.remoteJid,
              pushName: msg.pushName ?? null,
              messageId: msg.key.id ?? nanoid(),
              timestamp: typeof msg.messageTimestamp === "number"
                ? msg.messageTimestamp
                : Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000),
              fromMe: msg.key.fromMe ?? false,
            });
          }
        }
      });

      // Brief wait to collect any pending messages
      await new Promise((resolve) => setTimeout(resolve, 5000));

      socket.end(undefined);
      return collected;
    });

    // Step 2: Upsert contacts and record interactions
    await step.run("process-messages", async () => {
      for (const msg of messages) {
        // Skip group chats (JIDs ending with @g.us)
        if (msg.jid.endsWith("@g.us")) continue;

        // Extract phone number from JID (format: <number>@s.whatsapp.net)
        const phoneNumber = msg.jid.replace("@s.whatsapp.net", "");
        const formattedPhone = `+${phoneNumber}`;

        // Find existing contact by WhatsApp number or phone
        const allUserContacts = await db.select().from(contacts)
          .where(eq(contacts.userId, userId));

        let contact = allUserContacts.find(
          (c) =>
            c.whatsappNumber === formattedPhone ||
            c.phones.includes(formattedPhone) ||
            c.phones.includes(phoneNumber),
        );

        if (!contact) {
          // Create new contact
          const contactId = nanoid();
          const displayName = msg.pushName ?? formattedPhone;
          await db.insert(contacts).values({
            id: contactId,
            userId,
            displayName,
            whatsappNumber: formattedPhone,
            phones: [formattedPhone],
          });

          await db.insert(contactSourceLinks).values({
            id: nanoid(),
            contactId,
            source: "whatsapp",
            sourceId: msg.jid,
          }).onConflictDoNothing();

          contact = { id: contactId } as typeof allUserContacts[0];
        } else if (!contact.whatsappNumber) {
          // Update existing contact with WhatsApp number
          await db.update(contacts).set({
            whatsappNumber: formattedPhone,
            updatedAt: new Date(),
          }).where(eq(contacts.id, contact.id));
        }

        // Record interaction
        await db.insert(interactions).values({
          id: nanoid(),
          userId,
          contactId: contact.id,
          channel: "whatsapp",
          direction: msg.fromMe ? "outbound" : "inbound",
          subject: null,
          bodyPreview: null, // Metadata-only by default
          externalId: msg.messageId,
          occurredAt: new Date(msg.timestamp * 1000),
          metadata: { jid: msg.jid },
        }).onConflictDoNothing();
      }
    });

    // Step 3: Update last synced timestamp
    await step.run("update-sync-timestamp", () =>
      db.update(connectedAccounts).set({
        lastSyncedAt: new Date(),
      }).where(eq(connectedAccounts.id, accountId))
    );

    return { synced: messages.length };
  },
);
