import { router } from "../init";
import { contactsRouter } from "./contacts";
import { emailsRouter } from "./emails";
import { statsRouter } from "./stats";

export const appRouter = router({
  contacts: contactsRouter,
  emails: emailsRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
