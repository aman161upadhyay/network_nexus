import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { contacts, interactions, emails, reminders } from "@/lib/db/schema";
import { eq, and, gte, count, sql } from "drizzle-orm";

export const statsRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);

    const [totalContactsRow] = await db
      .select({ count: count() }).from(contacts).where(eq(contacts.userId, userId));

    const [totalInteractionsRow] = await db
      .select({ count: count() }).from(interactions)
      .where(and(eq(interactions.userId, userId), gte(interactions.occurredAt, ninetyDaysAgo)));

    const [pendingRemindersRow] = await db
      .select({ count: count() }).from(reminders)
      .where(and(eq(reminders.userId, userId), sql`${reminders.dismissedAt} IS NULL`));

    const [needsReplyRow] = await db
      .select({ count: count() }).from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.needsReply, true), eq(emails.isArchived, false)));

    const topContacts = await db.select().from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(sql`GREATEST(${contacts.personalScore}, ${contacts.professionalScore}) DESC`)
      .limit(10);

    return {
      totalContacts: totalContactsRow.count,
      totalInteractions: totalInteractionsRow.count,
      pendingReminders: pendingRemindersRow.count,
      needsReplyCount: needsReplyRow.count,
      topContacts,
    };
  }),

  interactionTimeline: protectedProcedure.query(async ({ ctx }) => {
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
