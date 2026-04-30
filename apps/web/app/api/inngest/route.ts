import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { gmailFullSync, gmailIncrementalSync } from "@/lib/inngest/gmail-sync";
import { googleContactSync } from "@/lib/inngest/contact-sync";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    gmailFullSync,
    gmailIncrementalSync,
    googleContactSync,
  ],
});
