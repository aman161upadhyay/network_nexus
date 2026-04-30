import { inngest } from "./client";
import { db } from "@/lib/db";
import { connectedAccounts, emails } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getGoogleClient } from "@/lib/integrations/google/client";
import { listMessages, getMessage, parseMessage, getProfile, getHistoryList } from "@/lib/integrations/google/gmail";
import type { OAuth2Client } from "google-auth-library";
import { nanoid } from "nanoid";

export const gmailFullSync = inngest.createFunction(
  {
    id: "gmail-full-sync",
    concurrency: { limit: 5 },
    triggers: [{ event: "gmail/full-sync.requested" }],
  },
  async ({ event, step }) => {
    const { accountId, userId } = event.data as { accountId: string; userId: string };

    // getGoogleClient is called outside step.run to avoid OAuth2Client serialization issues
    const { oauth2 } = await getGoogleClient(accountId);
    const typedOauth2 = oauth2 as OAuth2Client;

    const profile = await step.run("get-profile", () => getProfile(typedOauth2));

    await step.run("update-account-profile", () =>
      db.update(connectedAccounts).set({
        accountEmail: profile.emailAddress ?? undefined,
        gmailHistoryId: profile.historyId ?? undefined,
        lastSyncedAt: new Date(),
      }).where(eq(connectedAccounts.id, accountId))
    );

    let pageToken: string | undefined;
    let totalSynced = 0;
    const ninetyDaysAgo = Math.floor((Date.now() - 90 * 86_400_000) / 1000);

    do {
      const page = await step.run(`fetch-messages-page-${pageToken ?? "first"}`, () =>
        listMessages(typedOauth2, {
          maxResults: 100,
          pageToken,
          q: `after:${ninetyDaysAgo} -category:promotions -category:social`,
        })
      );

      const messageIds = (page.messages ?? []).map((m: { id?: string | null }) => m.id!);

      for (const messageId of messageIds) {
        await step.run(`sync-message-${messageId}`, async () => {
          const raw = await getMessage(typedOauth2, messageId);
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
          }).onConflictDoNothing({ target: emails.messageId });
        });
        totalSynced++;
      }

      pageToken = page.nextPageToken ?? undefined;
    } while (pageToken && totalSynced < 2000);

    await step.sendEvent("trigger-ai-scoring", {
      name: "emails/ai-score.requested",
      data: { userId, accountId },
    });

    return { synced: totalSynced };
  }
);

export const gmailIncrementalSync = inngest.createFunction(
  {
    id: "gmail-incremental-sync",
    triggers: [{ event: "gmail/incremental-sync.requested" }],
  },
  async ({ event, step }) => {
    const { accountId, userId, historyId } = event.data as {
      accountId: string; userId: string; historyId: string;
    };

    const { oauth2, account } = await getGoogleClient(accountId);
    const typedOauth2 = oauth2 as OAuth2Client;

    if (!account.gmailHistoryId) return { skipped: true };

    const history = await step.run("get-history", () =>
      getHistoryList(typedOauth2, account.gmailHistoryId as string)
    );

    const newMessageIds = (history.history ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((h: any) => (h.messagesAdded ?? []) as any[])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m.message?.id as string | null | undefined)
      .filter((id): id is string => Boolean(id));

    for (const messageId of newMessageIds) {
      await step.run(`sync-new-message-${messageId}`, async () => {
        const raw = await getMessage(typedOauth2, messageId);
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
        }).onConflictDoNothing({ target: emails.messageId });
      });
    }

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
