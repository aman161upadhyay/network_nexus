import { describe, it, expect } from "vitest";
import { computeRelationshipScore } from "../lib/scoring/relationship-score";

// Helper to create a mock interaction
function mockInteraction(overrides: {
  channel?: string;
  direction?: string;
  occurredAt?: Date;
}) {
  return {
    id: "test-id",
    contactId: "contact-1",
    userId: "user-1",
    accountId: null,
    externalId: null,
    subject: null,
    bodyPreview: null,
    channel: overrides.channel ?? "email",
    direction: overrides.direction ?? "inbound",
    occurredAt: overrides.occurredAt ?? new Date(),
    createdAt: new Date(),
  } as any;
}

describe("computeRelationshipScore", () => {
  it("returns zero scores for empty interactions", () => {
    const result = computeRelationshipScore([]);
    expect(result.personal).toBe(0);
    expect(result.professional).toBe(0);
  });

  it("scores are between 0 and 100", () => {
    // 100 recent email interactions
    const interactions = Array.from({ length: 100 }, () =>
      mockInteraction({ channel: "email", occurredAt: new Date() })
    );
    const result = computeRelationshipScore(interactions);
    expect(result.personal).toBeGreaterThanOrEqual(0);
    expect(result.personal).toBeLessThanOrEqual(100);
    expect(result.professional).toBeGreaterThanOrEqual(0);
    expect(result.professional).toBeLessThanOrEqual(100);
  });

  it("recent interactions score higher than old ones", () => {
    const recentDate = new Date();
    const oldDate = new Date(Date.now() - 365 * 86_400_000); // 1 year ago

    const recent = computeRelationshipScore([
      mockInteraction({ channel: "email", occurredAt: recentDate }),
    ]);
    const old = computeRelationshipScore([
      mockInteraction({ channel: "email", occurredAt: oldDate }),
    ]);

    // Recent interactions should score higher due to decay
    expect(recent.professional).toBeGreaterThan(old.professional);
  });

  it("inbound interactions score higher than outbound", () => {
    const inbound = computeRelationshipScore([
      mockInteraction({ channel: "email", direction: "inbound" }),
    ]);
    const outbound = computeRelationshipScore([
      mockInteraction({ channel: "email", direction: "outbound" }),
    ]);

    // inbound weight=1.0 vs outbound weight=0.7
    expect(inbound.professional).toBeGreaterThanOrEqual(outbound.professional);
  });

  it("whatsapp and instagram contribute more to personal score", () => {
    const personal = computeRelationshipScore([
      mockInteraction({ channel: "whatsapp" }),
      mockInteraction({ channel: "instagram" }),
    ]);
    const professional = computeRelationshipScore([
      mockInteraction({ channel: "email" }),
      mockInteraction({ channel: "linkedin" }),
    ]);

    expect(personal.personal).toBeGreaterThanOrEqual(personal.professional);
  });

  it("calendar has highest channel weight", () => {
    const calendarResult = computeRelationshipScore([
      mockInteraction({ channel: "calendar" }),
    ]);
    const emailResult = computeRelationshipScore([
      mockInteraction({ channel: "email" }),
    ]);

    // Calendar weight=1.5 vs email weight=1.0
    const calendarRaw = calendarResult.professional + calendarResult.personal;
    const emailRaw = emailResult.professional + emailResult.personal;
    expect(calendarRaw).toBeGreaterThan(emailRaw);
  });

  it("more interactions produce higher scores up to the cap", () => {
    const few = computeRelationshipScore([
      mockInteraction({ channel: "email" }),
    ]);
    const many = computeRelationshipScore(
      Array.from({ length: 20 }, () => mockInteraction({ channel: "email" }))
    );

    const fewTotal = few.personal + few.professional;
    const manyTotal = many.personal + many.professional;
    expect(manyTotal).toBeGreaterThan(fewTotal);
  });
});
