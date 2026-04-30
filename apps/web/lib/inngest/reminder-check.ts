import { inngest } from "./client";
import { db } from "@/lib/db";
import { contacts, reminders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const reminderCheck = inngest.createFunction(
  {
    id: "reminder-check",
    triggers: [{ cron: "0 6 * * *" }],
  },
  async ({ step }) => {
    const allContacts = await step.run("fetch-all-contacts", () =>
      db.select().from(contacts)
    );

    const today = new Date();
    const todayMMDD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const in7Days = new Date(today.getTime() + 7 * 86_400_000);
    const in7DaysMMDD = `${String(in7Days.getMonth() + 1).padStart(2, "0")}-${String(in7Days.getDate()).padStart(2, "0")}`;

    let created = 0;

    for (const contact of allContacts) {
      if (contact.birthday) {
        const birthdayMMDD = contact.birthday.slice(5); // YYYY-MM-DD → MM-DD

        if (birthdayMMDD === todayMMDD || birthdayMMDD === in7DaysMMDD) {
          const dueAt = birthdayMMDD === todayMMDD ? today : in7Days;

          await step.run(`create-birthday-reminder-${contact.id}-${todayMMDD}`, () =>
            db.insert(reminders).values({
              id: nanoid(),
              userId: contact.userId,
              contactId: contact.id,
              type: "birthday",
              dueAt,
              title: `${contact.displayName}'s birthday`,
              body: birthdayMMDD === todayMMDD
                ? `Today is ${contact.displayName}'s birthday!`
                : `${contact.displayName}'s birthday is in 7 days.`,
            }).onConflictDoNothing()
          );
          created++;
        }
      }

      // Re-engagement: score > 20 but no contact in > 90 days
      if (
        (contact.personalScore > 20 || contact.professionalScore > 20) &&
        contact.lastContactAt &&
        Date.now() - new Date(contact.lastContactAt).getTime() > 90 * 86_400_000
      ) {
        const daysSince = Math.floor(
          (Date.now() - new Date(contact.lastContactAt).getTime()) / 86_400_000
        );

        await step.run(`re-engagement-${contact.id}-${todayMMDD}`, () =>
          db.insert(reminders).values({
            id: nanoid(),
            userId: contact.userId,
            contactId: contact.id,
            type: "re_engagement",
            dueAt: today,
            title: `Reconnect with ${contact.displayName}`,
            body: `You haven't been in touch with ${contact.displayName} in ${daysSince} days.`,
          }).onConflictDoNothing()
        );
        created++;
      }
    }

    return { created };
  }
);
