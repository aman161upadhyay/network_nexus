import { inngest } from "./client";
import { db } from "@/lib/db";
import { connectedAccounts, contacts, interactions, contactSourceLinks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/integrations/encryption";
import { getConversations, refreshLongLivedToken } from "@/lib/integrations/instagram/client";
import { nanoid } from "nanoid";

export const instagramSync = inngest.createFunction(
  {
    id: "instagram-sync",
    concurrency: { limit: 3 },
    triggers: [{ event: "instagram/sync.requested" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, accountId } = event.data as {
      userId: string;
      accountId: string;
    };

    // Step 1: Get and refresh token if needed
    const account = await step.run("get-account", async () => {
      const rows = await db.select()
        .from(connectedAccounts)
        .where(
          and(
            eq(connectedAccounts.id, accountId),
            eq(connectedAccounts.userId, userId),
          ),
        );
      return rows[0] ?? null;
    });

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
    const processed = await step.run("process-conversations", async () => {
      let contactCount = 0;
      let interactionCount = 0;

      for (const convo of conversations) {
        for (const participant of convo.participants.data) {
          // Skip self
          if (participant.id === account.accountName?.replace("@", "")) continue;

          // Find existing contact by Instagram handle
          const allUserContacts = await db.select().from(contacts)
            .where(eq(contacts.userId, userId));

          let contact = allUserContacts.find(
            (c) => c.instagramHandle === participant.username,
          );

          if (!contact) {
            const contactId = nanoid();
            await db.insert(contacts).values({
              id: contactId,
              userId,
              displayName: participant.username,
              instagramHandle: participant.username,
            });

            await db.insert(contactSourceLinks).values({
              id: nanoid(),
              contactId,
              source: "instagram",
              sourceId: participant.id,
            }).onConflictDoNothing();

            contact = { id: contactId } as typeof allUserContacts[0];
            contactCount++;
          }

          // Record interaction from last message in conversation
          if (convo.messages?.data?.length) {
            const lastMsg = convo.messages.data[0];
            const direction = lastMsg.from.id === participant.id ? "inbound" : "outbound";

            await db.insert(interactions).values({
              id: nanoid(),
              userId,
              contactId: contact.id,
              channel: "instagram",
              direction,
              subject: null,
              bodyPreview: null, // Metadata-only by default
              externalId: lastMsg.id,
              occurredAt: new Date(lastMsg.created_time),
              metadata: { conversationId: convo.id },
            }).onConflictDoNothing();
            interactionCount++;
          }
        }
      }

      return { contactCount, interactionCount };
    });

    // Step 4: Update sync timestamp
    await step.run("update-timestamp", () =>
      db.update(connectedAccounts).set({
        lastSyncedAt: new Date(),
      }).where(eq(connectedAccounts.id, accountId))
    );

    return processed;
  },
);
