import { router, protectedProcedure } from "../init";
import { z } from "zod";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq, and, desc, isNotNull } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";

const CATEGORIES = ["people", "deadline", "job_career", "vip", "newsletter", "receipt", "other"] as const;

export const emailsRouter = router({
  list: protectedProcedure
    .input(z.object({
      category: z.enum(CATEGORIES).optional(),
      needsReply: z.boolean().optional(),
      limit: z.number().max(100).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(emails.userId, ctx.user.id),
        eq(emails.isArchived, false),
      ] as any[];

      if (input.category) {
        conditions.push(eq(emails.aiCategory, input.category));
      }
      if (input.needsReply) {
        conditions.push(eq(emails.needsReply, true));
      }

      return db.select().from(emails)
        .where(and(...conditions))
        .orderBy(desc(emails.aiPriorityScore), desc(emails.receivedAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(emails).set({ isArchived: true })
        .where(and(eq(emails.id, input.id), eq(emails.userId, ctx.user.id)));
      return { ok: true };
    }),

  markReplied: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(emails).set({ repliedAt: new Date(), needsReply: false })
        .where(and(eq(emails.id, input.id), eq(emails.userId, ctx.user.id)));
      return { ok: true };
    }),

  triggerSync: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await inngest.send({
        name: "gmail/full-sync.requested",
        data: { accountId: input.accountId, userId: ctx.user.id },
      });
      return { ok: true };
    }),

  priorityInbox: protectedProcedure.query(async ({ ctx }) => {
    return db.select().from(emails)
      .where(and(
        eq(emails.userId, ctx.user.id),
        eq(emails.isArchived, false),
        eq(emails.isRead, false),
        isNotNull(emails.aiPriorityScore),
      ))
      .orderBy(desc(emails.aiPriorityScore))
      .limit(5);
  }),
});
