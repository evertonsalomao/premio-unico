import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

import { DEFAULT_LENSES } from "../../shared/defaultLenses";

const lensInput = z.object({
  category: z.string().trim().min(2).max(128),
  name: z.string().trim().min(2).max(255),
  rewardValue: z.coerce.number().min(0).max(100000),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const lensesRouter = router({
  list: protectedProcedure.query(() => db.listLenses()),

  create: adminProcedure.input(lensInput).mutation(async ({ input }) => {
    const lens = await db.createLens({
      category: input.category,
      name: input.name,
      rewardValue: input.rewardValue.toFixed(2),
      notes: input.notes || null,
    });
    if (!lens) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível cadastrar a lente." });
    return lens;
  }),

  update: adminProcedure.input(lensInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const lens = await db.updateLens(input.id, {
      category: input.category,
      name: input.name,
      rewardValue: input.rewardValue.toFixed(2),
      notes: input.notes || null,
    });
    if (!lens) throw new TRPCError({ code: "NOT_FOUND", message: "Lente não encontrada." });
    return lens;
  }),

  delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await db.deleteLens(input.id);
    return { success: true } as const;
  }),

  seedDefault: adminProcedure.mutation(async () => {
    const count = await db.seedDefaultLenses(DEFAULT_LENSES);
    return { success: true, count, total: DEFAULT_LENSES.length };
  }),

  batchImport: adminProcedure.input(z.array(lensInput)).mutation(async ({ input }) => {
    const count = await db.seedDefaultLenses(input);
    return { success: true, count, total: input.length };
  }),
});
