import { router, protectedProcedure } from "../init";
import { z } from "zod";
import { db } from "@/lib/db";
import { contacts, interactions, scoreHistory } from "@/lib/db/schema";
import { eq, and, desc, asc, ilike, or, sql } from "drizzle-orm";

export const contactsRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      sortBy: z.enum(["personal_score", "professional_score", "last_contact", "name"]).default("personal_score"),
      limit: z.number().max(200).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      let baseQuery = db.select().from(contacts)
        .where(eq(contacts.userId, ctx.user.id));

      if (input.search) {
        baseQuery = db.select().from(contacts).where(
          and(
            eq(contacts.userId, ctx.user.id),
            or(
              ilike(contacts.displayName, `%${input.search}%`),
              ilike(contacts.company, `%${input.search}%`),
            )
          )
        );
      }

      const orderCol = {
        personal_score: desc(contacts.personalScore),
        professional_score: desc(contacts.professionalScore),
        last_contact: desc(contacts.lastContactAt),
        name: asc(contacts.displayName),
      }[input.sortBy];

      return baseQuery.orderBy(orderCol).limit(input.limit).offset(input.offset);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [contact] = await db.select().from(contacts)
        .where(and(eq(contacts.id, input.id), eq(contacts.userId, ctx.user.id)));
      if (!contact) return null;

      const contactInteractions = await db.select().from(interactions)
        .where(eq(interactions.contactId, input.id))
        .orderBy(desc(interactions.occurredAt))
        .limit(50);

      const history = await db.select().from(scoreHistory)
        .where(eq(scoreHistory.contactId, input.id))
        .orderBy(asc(scoreHistory.recordedAt))
        .limit(90);

      return { ...contact, interactions: contactInteractions, scoreHistory: history };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      isVip: z.boolean().optional(),
      birthday: z.string().optional(),
      company: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      await db.update(contacts).set({ ...fields, updatedAt: new Date() })
        .where(and(eq(contacts.id, id), eq(contacts.userId, ctx.user.id)));
      return { ok: true };
    }),

  networkGraph: protectedProcedure.query(async ({ ctx }) => {
    const nodes = await db.select({
      id: contacts.id,
      displayName: contacts.displayName,
      company: contacts.company,
      personalScore: contacts.personalScore,
      professionalScore: contacts.professionalScore,
      photoUrl: contacts.photoUrl,
      isVip: contacts.isVip,
    }).from(contacts).where(eq(contacts.userId, ctx.user.id));

    return { nodes, edges: [] as { source: string; target: string }[] };
  }),

  coolingContacts: protectedProcedure.query(async ({ ctx }) => {
    return db.select().from(contacts)
      .where(
        and(
          eq(contacts.userId, ctx.user.id),
          sql`(${contacts.personalScore} > 30 OR ${contacts.professionalScore} > 30)`,
          sql`${contacts.lastContactAt} < NOW() - INTERVAL '60 days' OR ${contacts.lastContactAt} IS NULL`,
        )
      )
      .orderBy(desc(contacts.personalScore))
      .limit(10);
  }),
});
