import { inngest } from "./client";
import { db } from "@/lib/db";
import { emails, contacts } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface EmailScoreResult {
  priorityScore: number;
  category: string;
  summary: string;
  needsReply: boolean;
}

async function scoreEmail(
  subject: string,
  fromEmail: string,
  fromName: string,
  bodyPreview: string,
  senderRelationshipScore: number
): Promise<EmailScoreResult> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are an email prioritization assistant. Score this email and respond with ONLY valid JSON.

Email:
- From: ${fromName} <${fromEmail}>
- Subject: ${subject}
- Preview: ${bodyPreview.slice(0, 400)}
- Sender relationship score (0-100, higher = closer): ${senderRelationshipScore}

Respond with this exact JSON structure:
{
  "priorityScore": <0-100 integer>,
  "category": "<people|deadline|job_career|vip|newsletter|receipt|other>",
  "summary": "<one sentence summary, max 100 chars>",
  "needsReply": <true|false>
}

Scoring guide:
- 80-100: Requires immediate attention (professor, employer, urgent deadline, close contact)
- 60-79: Important, should reply within 24h (colleague, job application, meeting request)
- 40-59: Moderate priority (newsletter from someone you know, FYI email)
- 20-39: Low priority (automated notification, cold outreach)
- 0-19: Can ignore or archive (marketing, spam)`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    return JSON.parse(text) as EmailScoreResult;
  } catch {
    return { priorityScore: 30, category: "other", summary: subject, needsReply: false };
  }
}

export const emailAiScore = inngest.createFunction(
  {
    id: "email-ai-score",
    concurrency: { limit: 2 },
    throttle: { limit: 50, period: "1m" },
    triggers: [{ event: "emails/ai-score.requested" }],
  },
  async ({ event, step }) => {
    const { userId } = event.data as { userId: string };

    const unscoredEmails = await step.run("fetch-unscored", () =>
      db.select().from(emails)
        .where(and(eq(emails.userId, userId), isNull(emails.aiPriorityScore)))
        .limit(100)
    );

    const allContacts = await step.run("fetch-contacts", () =>
      db.select().from(contacts).where(eq(contacts.userId, userId))
    );

    let scored = 0;
    for (const email of unscoredEmails) {
      const senderContact = allContacts.find((c) =>
        c.emails.includes(email.fromEmail.toLowerCase())
      );
      const relationshipScore = senderContact
        ? Math.max(senderContact.personalScore, senderContact.professionalScore)
        : 0;

      const result = await step.run(`score-email-${email.id}`, () =>
        scoreEmail(
          email.subject ?? "",
          email.fromEmail,
          email.fromName ?? "",
          email.bodyPreview ?? "",
          relationshipScore
        )
      );

      await step.run(`update-email-${email.id}`, () =>
        db.update(emails).set({
          aiPriorityScore: result.priorityScore,
          aiCategory: result.category,
          aiSummary: result.summary,
          needsReply: result.needsReply,
        }).where(eq(emails.id, email.id))
      );
      scored++;
    }

    return { scored };
  }
);
