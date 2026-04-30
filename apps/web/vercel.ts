import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  buildCommand: "pnpm build",
  framework: "nextjs",
  crons: [
    { path: "/api/inngest", schedule: "0 2 * * *" },
    { path: "/api/inngest", schedule: "0 6 * * *" },
  ],
};
