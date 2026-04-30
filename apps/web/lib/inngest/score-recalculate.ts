import { inngest } from "./client";
import { db } from "@/lib/db";
import { contacts, interactions, scoreHistory } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { computeRelationshipScore } from "@/lib/scoring/relationship-score";
import { nanoid } from "nanoid";

export const scoreRecalculate = inngest.createFunction(
  {
    id: "score-recalculate",
    concurrency: { limit: 3 },
    triggers: [{ cron: "0 2 * * *" }],
  },
  async ({ step }) => {
    const allContacts = await step.run("fetch-all-contacts", () =>
      db.select({ id: contacts.id, userId: contacts.userId }).from(contacts)
    );

    let updated = 0;
    for (const contact of allContacts) {
      await step.run(`score-contact-${contact.id}`, async () => {
        const contactInteractions = await db
          .select()
          .from(interactions)
          .where(eq(interactions.contactId, contact.id))
          .orderBy(desc(interactions.occurredAt));

        const { personal, professional } = computeRelationshipScore(contactInteractions);

        await db.update(contacts).set({
          personalScore: personal,
          professionalScore: professional,
          updatedAt: new Date(),
        }).where(eq(contacts.id, contact.id));

        await db.insert(scoreHistory).values({
          id: nanoid(),
          contactId: contact.id,
          personalScore: personal,
          professionalScore: professional,
        });
      });
      updated++;
    }

    return { updated };
  }
);
