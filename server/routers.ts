import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { lensesRouter } from "./routers/lenses";
import { salesRouter } from "./routers/sales";
import { usersRouter } from "./routers/users";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  lenses: lensesRouter,
  sales: salesRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
