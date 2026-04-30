import { inngest } from "./client";
import { db } from "@/lib/db";
import { contacts, contactSourceLinks, interactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getGoogleClient } from "@/lib/integrations/google/client";
import { listConnections } from "@/lib/integrations/google/contacts";
import { listEvents } from "@/lib/integrations/google/calendar";
import type { OAuth2Client } from "google-auth-library";
import { nanoid } from "nanoid";

export const googleContactSync = inngest.createFunction(
  {
    id: "google-contact-sync",
    triggers: [{ event: "contacts/google-sync.requested" }],
  },
  async ({ event, step }) => {
    const { accountId, userId } = event.data as { accountId: string; userId: string };
    const { oauth2 } = await getGoogleClient(accountId);
    const typedOauth2 = oauth2 as OAuth2Client;

    const googleContacts = await step.run("list-connections", () => listConnections(typedOauth2));

    let upserted = 0;
    for (const gc of googleContacts) {
      await step.run(`upsert-contact-${gc.resourceName}`, async () => {
        const existing = await db
          .select({ contactId: contactSourceLinks.contactId })
          .from(contactSourceLinks)
          .where(and(
            eq(contactSourceLinks.source, "google"),
            eq(contactSourceLinks.sourceId, gc.resourceName)
          ));

        if (existing.length > 0) {
          await db.update(contacts).set({
            displayName: gc.displayName,
            firstName: gc.firstName,
            lastName: gc.lastName,
            company: gc.company,
            title: gc.title,
            photoUrl: gc.photoUrl,
            birthday: gc.birthday,
            updatedAt: new Date(),
          }).where(eq(contacts.id, existing[0].contactId));
        } else {
          const allUserContacts = await db.select().from(contacts)
            .where(eq(contacts.userId, userId));

          const matchedContact = gc.emails.length > 0
            ? allUserContacts.find((c) => c.emails.some((e) => gc.emails.includes(e)))
            : undefined;

          let contactId: string;
          if (matchedContact) {
            contactId = matchedContact.id;
          } else {
            contactId = nanoid();
            await db.insert(contacts).values({
              id: contactId,
              userId,
              displayName: gc.displayName,
              firstName: gc.firstName,
              lastName: gc.lastName,
              emails: gc.emails,
              phones: gc.phones,
              company: gc.company,
              title: gc.title,
              photoUrl: gc.photoUrl,
              birthday: gc.birthday,
            });
          }

          await db.insert(contactSourceLinks).values({
            id: nanoid(),
            contactId,
            source: "google",
            sourceId: gc.resourceName,
            rawData: gc as any,
          }).onConflictDoNothing();
        }
        upserted++;
      });
    }

    const events = await step.run("list-calendar-events", () =>
      listEvents(typedOauth2, { timeMin: new Date(Date.now() - 90 * 86_400_000) })
    );

    for (const calEvent of events) {
      for (const email of calEvent.attendeeEmails) {
        await step.run(`calendar-interaction-${calEvent.id}-${email}`, async () => {
          const allContacts = await db.select().from(contacts)
            .where(eq(contacts.userId, userId));
          const contact = allContacts.find((c) => c.emails.includes(email));
          if (!contact) return;

          await db.insert(interactions).values({
            id: nanoid(),
            userId,
            contactId: contact.id,
            channel: "calendar",
            direction: "inbound",
            subject: calEvent.summary,
            externalId: calEvent.id,
            occurredAt: new Date(calEvent.startAt),
          }).onConflictDoNothing();
        });
      }
    }

    return { upserted, calendarEvents: events.length };
  }
);
