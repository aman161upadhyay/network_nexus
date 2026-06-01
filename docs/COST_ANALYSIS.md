# Nexus CRM -- Cost Analysis

> Last updated: 2026-05-30
>
> All pricing sourced from official documentation and verified third-party comparisons.
> Prices are in USD/month unless noted otherwise.

---

## Service Stack Overview

| Service | Current Tier | Purpose |
|---------|-------------|---------|
| Vercel | Hobby (Free) | Hosting, serverless functions, CI/CD |
| Neon Postgres | Free (via Vercel integration) | Primary database |
| Inngest | Free | Background jobs, cron scheduling |
| Resend | Free | Transactional email (reminders) |
| Google Cloud Vertex AI | Pay-as-you-go (credits) | Email scoring with Gemini |
| Google Workspace APIs | Free (quota-based) | Gmail, People, Calendar sync |
| Domain | Optional | Custom domain |

---

## Scenario Definitions

| Metric | Personal (1 user) | Light (5 users) | Growth (50 users) |
|--------|-------------------|------------------|---------------------|
| Initial email sync | 500 | 2,500 | 25,000 |
| New emails/day | 20 | 100 | 1,000 |
| New emails/month | ~600 | ~3,000 | ~30,000 |
| Contacts | 300 | 1,500 | 15,000 |
| Scoring runs | 1x nightly | 1x nightly | 1x nightly |
| Reminder emails sent/month | ~30 | ~150 | ~1,500 |

---

## 1. Vercel

**Source:** [Vercel Pricing](https://vercel.com/pricing) | [Vercel Hobby Plan Docs](https://vercel.com/docs/plans/hobby)

| | Hobby (Free) | Pro ($20/seat/mo) |
|---|---|---|
| Bandwidth | 100 GB/mo | 1 TB/mo |
| Serverless invocations | 100K/mo | 1M/mo |
| Serverless execution time | 100 GB-hrs | 1,000 GB-hrs |
| Function duration limit | 10s | 60s |
| Build minutes | 6,000 min/mo | 6,000 min/mo |
| Concurrent builds | 1 | 1 (3 on Team) |
| Commercial use | **Not allowed** | Allowed |
| Overage (bandwidth) | Hard cutoff | $0.40/GB |

### Usage Estimates

| Metric | Personal | Light | Growth |
|--------|----------|-------|--------|
| Bandwidth/mo | ~2 GB | ~10 GB | ~80 GB |
| Serverless invocations/mo | ~3K | ~15K | ~150K |
| Serverless exec time | ~5 GB-hrs | ~25 GB-hrs | ~200 GB-hrs |

### Cost by Scenario

| Scenario | Tier Needed | Monthly Cost | Notes |
|----------|------------|-------------|-------|
| Personal | Hobby | **$0** | Well within limits. Note: Hobby prohibits commercial use. |
| Light | Pro | **$20** | 5 users requires team/commercial; Hobby TOS violation otherwise. |
| Growth | Pro | **$20 + seats** | 150K invocations fits Pro (1M limit). Cost = $20 base + additional seats if multiple devs. |

> **Breaking point:** Hobby plan prohibits commercial use entirely. If Nexus is ever offered as a paid product, Pro is mandatory from day one. For pure personal use, Hobby is fine.

---

## 2. Neon Postgres

**Source:** [Neon Pricing](https://neon.com/pricing) | [Neon Plans](https://neon.com/docs/introduction/plans)

| | Free | Launch ($5/mo min) |
|---|---|---|
| Storage | 0.5 GB/branch | Usage-based ($0.35/GB-mo) |
| Compute | 100 CU-hours/mo | Usage-based ($0.106/CU-hr) |
| Autoscaling | 0.25-2 CU | 0.25-8 CU |
| Branches | 10 | 500 |
| Projects | 100 | Unlimited |
| Auto-suspend | After 5 min idle | Configurable |
| Connections | Pooled (via PgBouncer) | Pooled |

### Storage Estimates

| Data | Personal | Light | Growth |
|------|----------|-------|--------|
| Emails (avg 2 KB/row) | ~2 MB | ~10 MB | ~100 MB |
| Contacts | ~0.3 MB | ~1.5 MB | ~15 MB |
| Scores + metadata | ~1 MB | ~5 MB | ~50 MB |
| Indexes + overhead | ~5 MB | ~25 MB | ~200 MB |
| **Total storage** | **~8 MB** | **~42 MB** | **~365 MB** |

### Compute Estimates

With auto-suspend at 0.25 CU, compute is consumed only when queries run:
- Nightly scoring cron: ~5 min active
- API requests throughout day: ~30 min active (personal), ~2 hrs (light), ~8 hrs (growth)
- Monthly CU-hours: Personal ~7 CU-hrs, Light ~35 CU-hrs, Growth ~180 CU-hrs

### Cost by Scenario

| Scenario | Tier Needed | Monthly Cost | Notes |
|----------|------------|-------------|-------|
| Personal | Free | **$0** | 8 MB storage, ~7 CU-hrs -- well within 0.5 GB / 100 CU-hrs. |
| Light | Free | **$0** | 42 MB storage, ~35 CU-hrs -- still fits free tier. |
| Growth | Launch | **~$24** | ~365 MB storage ($0.13) + ~180 CU-hrs ($19.08) + $5 base. |

> **Breaking point:** Compute hours are the constraint, not storage. At ~100+ active compute hours/month (roughly 15-20 users with moderate activity), you exceed the free tier.

---

## 3. Inngest

**Source:** [Inngest Pricing](https://www.inngest.com/pricing) | [Inngest Usage Limits](https://www.inngest.com/docs/usage-limits/inngest)

| | Free | Starter ($75/mo) |
|---|---|---|
| Function runs/mo | 50,000 | 250,000 |
| Concurrent steps | 5 | 50 |
| Max steps per function | 1,000 | 1,000 |
| Max sleep duration | 7 days | 90 days |
| Trace retention | 7 days | 30 days |

### Nexus Functions (6 total)

1. **sync-emails** (cron, daily) -- syncs new emails per user
2. **sync-contacts** (cron, daily) -- syncs contacts per user
3. **score-emails** (cron, nightly) -- runs AI scoring on unscored emails
4. **process-webhook** (event-driven) -- handles Gmail push notifications
5. **sync-calendar** (cron or event-driven) -- calendar sync
6. **send-reminders** (cron, daily) -- sends follow-up reminders

### Run Estimates

| Function | Personal (1 user) | Light (5 users) | Growth (50 users) |
|----------|-------------------|------------------|---------------------|
| sync-emails | 30 runs/mo | 150 | 1,500 |
| sync-contacts | 30 | 150 | 1,500 |
| score-emails | 30 | 150 | 1,500 |
| process-webhook | ~600 (20/day) | ~3,000 | ~30,000 |
| sync-calendar | 30 | 150 | 1,500 |
| send-reminders | 30 | 150 | 1,500 |
| **Total runs/mo** | **~750** | **~3,750** | **~37,500** |

### Cost by Scenario

| Scenario | Tier Needed | Monthly Cost | Notes |
|----------|------------|-------------|-------|
| Personal | Free | **$0** | 750 runs << 50K limit. |
| Light | Free | **$0** | 3,750 runs << 50K limit. |
| Growth | Free | **$0** | 37,500 runs < 50K limit. Tight but fits. |

> **Breaking point:** At ~65+ users with webhook-driven sync, you exceed 50K runs. The 5-concurrent-step limit on Free may also cause queuing delays at 50 users during the nightly scoring batch. Consider Starter ($75/mo) at ~50 users for reliability.

---

## 4. Resend

**Source:** [Resend Pricing](https://resend.com/pricing)

| | Free | Pro ($20/mo) |
|---|---|---|
| Emails/month | 3,000 | 50,000 |
| Emails/day | 100 | No daily cap |
| Domains | 1 | 10 |
| Log retention | 30 days | 30 days |

### Usage Estimates

Reminder emails (follow-up nudges, digest summaries):

| Scenario | Emails/mo | Emails/day (peak) |
|----------|-----------|-------------------|
| Personal | ~30 | ~3 |
| Light | ~150 | ~15 |
| Growth | ~1,500 | ~100 |

### Cost by Scenario

| Scenario | Tier Needed | Monthly Cost | Notes |
|----------|------------|-------------|-------|
| Personal | Free | **$0** | 30 emails/mo << 3K limit. |
| Light | Free | **$0** | 150 emails/mo << 3K limit. |
| Growth | Free | **$0** | 1,500 emails/mo < 3K limit. Peak 100/day = daily cap. Borderline. |

> **Breaking point:** The 100 emails/day cap is the real constraint. At 50 users, if reminders cluster (e.g., Monday morning batch), you hit the daily limit. Pro ($20/mo) removes the daily cap.

---

## 5. Google Cloud Vertex AI (Email Scoring)

**Source:** [Vertex AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)

**Note:** Gemini 1.5 Flash was discontinued in mid-2025. The recommended replacement is **Gemini 2.5 Flash-Lite**, which is cheaper and faster.

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|----------------------|
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 |
| Gemini 2.5 Flash-Lite (Batch) | $0.05 | $0.20 |

### Token Estimates per Email Scored

| Component | Tokens |
|-----------|--------|
| System prompt (scoring criteria) | ~300 |
| Email body (average) | ~500 |
| Email metadata (from, to, subject, date) | ~100 |
| **Total input per email** | **~900** |
| Output (score + reasoning JSON) | ~150 |
| **Total output per email** | **~150** |

### Monthly Token Usage

| Scenario | Emails scored/mo | Input tokens | Output tokens |
|----------|-----------------|-------------|--------------|
| Personal | ~600 | 540K | 90K |
| Light | ~3,000 | 2.7M | 450K |
| Growth | ~30,000 | 27M | 4.5M |

### Cost by Scenario (Gemini 2.5 Flash-Lite, standard pricing)

| Scenario | Input Cost | Output Cost | **Total/mo** |
|----------|-----------|------------|-------------|
| Personal | $0.054 | $0.036 | **$0.09** |
| Light | $0.27 | $0.18 | **$0.45** |
| Growth | $2.70 | $1.80 | **$4.50** |

> With **Batch API** (nightly scoring is a perfect use case): costs drop to ~50% of the above.

### Google Cloud Credits Impact

| Credit Source | Amount | Duration |
|-------------|--------|----------|
| Existing credits | ~$289 | Expires ~28 days |
| Developer Program | $10/mo | Ongoing |

At personal usage ($0.09/mo), the $289 in credits would last **~267 years** (effectively infinite until expiration). The $10/mo Developer Program credit alone covers all scenarios up to Growth and well beyond.

> **Breaking point:** Vertex AI costs are negligible for this use case. Even at 50 users, $4.50/mo is trivially covered by the $10/mo Developer Program credit.

---

## 6. Google Workspace APIs

**Source:** [Gmail API Quotas](https://developers.google.com/workspace/gmail/api/reference/quota) | [Calendar API Quotas](https://developers.google.com/workspace/calendar/api/guides/quota)

| API | Cost | Daily Quota (per project) | Per-user Rate Limit |
|-----|------|--------------------------|---------------------|
| Gmail API | Free (for now) | 80M quota units | 6,000 units/min |
| People API | Free | 90K requests/day | 1,500 requests/min |
| Calendar API | Free (for now) | Similar to Gmail | Per-user limits |

### Usage Estimates (Gmail API quota units)

| Operation | Units | Personal/day | Light/day | Growth/day |
|-----------|-------|-------------|-----------|------------|
| messages.list | 5 | 100 | 500 | 5,000 |
| messages.get (x20/day/user) | 20 | 400 | 2,000 | 20,000 |
| history.list | 2 | 50 | 250 | 2,500 |
| **Total quota units/day** | | **~550** | **~2,750** | **~27,500** |

### Cost by Scenario

| Scenario | Monthly Cost | Notes |
|----------|-------------|-------|
| All scenarios | **$0** | 27,500 units/day << 80M daily limit. Google has announced potential billing for API overages later in 2026 but usage here is far below thresholds. |

> **Breaking point:** Not a concern at any realistic scale. Google API quotas are designed for much larger applications.

---

## 7. Domain (Optional)

| TLD | Registration (Year 1) | Renewal (Year 2+) |
|-----|----------------------|-------------------|
| .com | $10 -- $15 | $15 -- $20 |
| .app | $13 -- $15 | $14 -- $20 |
| .dev | $12 -- $15 | $14 -- $20 |

Vercel provides free `*.vercel.app` subdomains. A custom domain is optional.

| Scenario | Monthly Cost | Notes |
|----------|-------------|-------|
| Personal | **$0 -- $1.25** | Optional. Vercel subdomain is fine. |
| Light/Growth | **~$1.25** | ~$15/yr for a .com or .app domain. |

---

## Summary: Total Monthly Cost

### Personal Use (1 User)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Hobby | $0 |
| Neon Postgres | Free | $0 |
| Inngest | Free | $0 |
| Resend | Free | $0 |
| Vertex AI | Pay-as-you-go | $0.09 |
| Google APIs | Free | $0 |
| Domain | Optional | $0 -- $1.25 |
| **Total** | | **$0.09 -- $1.34** |

> Effectively free. Vertex AI costs covered entirely by $10/mo Developer Program credit.

### Light Use (5 Users)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Pro (if commercial) | $20 |
| Neon Postgres | Free | $0 |
| Inngest | Free | $0 |
| Resend | Free | $0 |
| Vertex AI | Pay-as-you-go | $0.45 |
| Google APIs | Free | $0 |
| Domain | Recommended | $1.25 |
| **Total** | | **$21.70** |

> Vercel Pro is the only real cost, and only required if offering Nexus commercially. If sharing with friends/family (non-commercial), Hobby still works: **$1.70/mo**.

### Growth (50 Users)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Pro | $20 |
| Neon Postgres | Launch | $24 |
| Inngest | Free (or Starter) | $0 -- $75 |
| Resend | Free (or Pro) | $0 -- $20 |
| Vertex AI | Pay-as-you-go | $4.50 |
| Google APIs | Free | $0 |
| Domain | Yes | $1.25 |
| **Total** | | **$49.75 -- $144.75** |

> Conservative estimate: ~$50/mo if you can stay on Inngest/Resend free tiers. ~$145/mo if you need upgrades for reliability.

---

## What Breaks First (Scaling Pressure Points)

| Priority | Service | Breaks At | Upgrade Cost | Trigger |
|----------|---------|-----------|-------------|---------|
| 1 | **Vercel** | Any commercial use | +$20/mo | TOS requires Pro for commercial apps |
| 2 | **Neon Postgres** | ~15-20 users | +$5-24/mo | Compute hours exceed 100 CU-hrs/mo |
| 3 | **Resend** | ~50 users | +$20/mo | Daily email cap (100/day) hit during batch sends |
| 4 | **Inngest** | ~65 users | +$75/mo | 50K runs/mo exceeded; concurrent step limit causes delays |
| 5 | **Vertex AI** | Never (practical) | Already paid | $10/mo credit covers up to ~2,200 users at current token costs |
| 6 | **Google APIs** | Never (practical) | $0 | Quotas are orders of magnitude above usage |

---

## Recommendations

1. **Migrate from Gemini 1.5 Flash to Gemini 2.5 Flash-Lite.** The 1.5 series is discontinued. Flash-Lite is cheaper ($0.10/M input vs the old $0.075/M) and faster. Use the Batch API for nightly scoring to halve costs further.

2. **Use the $289 in expiring credits strategically.** At $0.09/mo personal usage, these credits will expire unused. Consider using them for experimentation, testing other Vertex AI features, or development workloads.

3. **Stay on Hobby until commercial launch.** The free tier is more than sufficient for personal/development use. Only upgrade to Pro when you need commercial TOS compliance.

4. **Inngest is the best value.** 50K runs/mo for free is generous. The 6 Nexus functions produce minimal run volume. This is the last service you will need to upgrade.

5. **Budget for growth:** Plan for ~$50/mo at 50 users, scaling to ~$145/mo if you need paid tiers on all services. Revenue of $3/user/mo would make 50 users profitable.

---

## Sources

- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel Hobby Plan Docs](https://vercel.com/docs/plans/hobby)
- [Vercel Free vs Pro 2026](https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing)
- [Neon Pricing](https://neon.com/pricing)
- [Neon Plans Documentation](https://neon.com/docs/introduction/plans)
- [Inngest Pricing](https://www.inngest.com/pricing)
- [Inngest Usage Limits](https://www.inngest.com/docs/usage-limits/inngest)
- [Resend Pricing](https://resend.com/pricing)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Gmail API Quotas](https://developers.google.com/workspace/gmail/api/reference/quota)
- [Calendar API Quotas](https://developers.google.com/workspace/calendar/api/guides/quota)
- [Gemini API Pricing Guide](https://www.metacto.com/blogs/the-true-cost-of-google-gemini-a-guide-to-api-pricing-and-integration)
