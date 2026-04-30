import type { InferSelectModel } from "drizzle-orm";
import type { interactions } from "@/lib/db/schema";

type Interaction = InferSelectModel<typeof interactions>;

interface ScoreResult {
  personal: number;
  professional: number;
}

const DECAY_LAMBDA = 0.0077; // half-life ~90 days: ln(2)/90

const CHANNEL_WEIGHTS: Record<string, number> = {
  email: 1.0,
  whatsapp: 1.2,
  calendar: 1.5,
  instagram: 0.6,
  linkedin: 0.4,
  phone: 1.3,
};

export function computeRelationshipScore(
  contactInteractions: Interaction[]
): ScoreResult {
  if (contactInteractions.length === 0) return { personal: 0, professional: 0 };

  const now = Date.now();
  let rawScore = 0;
  let emailCount = 0;
  let personalChannelCount = 0;

  for (const i of contactInteractions) {
    const ageDays = (now - new Date(i.occurredAt).getTime()) / 86_400_000;
    const decayFactor = Math.exp(-DECAY_LAMBDA * ageDays);
    const channelWeight = CHANNEL_WEIGHTS[i.channel] ?? 0.5;
    const directionWeight = i.direction === "inbound" ? 1.0 : 0.7;

    rawScore += channelWeight * directionWeight * decayFactor;

    if (i.channel === "email" || i.channel === "calendar" || i.channel === "linkedin") {
      emailCount++;
    }
    if (i.channel === "whatsapp" || i.channel === "instagram" || i.channel === "phone") {
      personalChannelCount++;
    }
  }

  // Normalize: ~50 weighted interactions over 90 days = score of 100
  const normalized = Math.min(100, Math.round((rawScore / 50) * 100));

  const total = emailCount + personalChannelCount + 1;
  const professionalRatio = emailCount / total;
  const personalRatio = personalChannelCount / total;

  const professional = Math.min(100, Math.round(normalized * (professionalRatio + 0.3)));
  const personal = Math.min(100, Math.round(normalized * (personalRatio + 0.2)));

  return { personal, professional };
}
