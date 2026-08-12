import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { calculateReward } from "../../shared/rewards";
import { canEditSale } from "../../shared/permissions";

const periodInput = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sellerId: z.number().int().positive().optional(),
});

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export const salesRouter = router({
  create: protectedProcedure.input(z.object({
    osNumber: z.string().trim().min(1).max(64),
    lensId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(100),
    saleAmount: z.number().min(0).max(10000000),
    saleDate: z.string().datetime(),
    storeName: z.string().trim().min(2).max(255).optional(),
    observation: z.string().trim().max(2000).optional(),
  })).mutation(async ({ input, ctx }) => {
    const lens = await db.getLensById(input.lensId);
    if (!lens) throw new TRPCError({ code: "NOT_FOUND", message: "Lente não encontrada." });
    const rewardAmount = calculateReward(lens.rewardValue, input.quantity);
    const storeName = ctx.user.storeUnit?.trim() || "Óticas Único";
    const sale = await db.createSale({
      userId: ctx.user.id,
      sellerName: ctx.user.name ?? ctx.user.username ?? "Vendedor",
      storeName,
      osNumber: input.osNumber,
      lensId: lens.id,
      lensName: lens.name,
      saleAmount: input.saleAmount.toFixed(2),
      rewardAmount: rewardAmount.toFixed(2),
      quantity: input.quantity,
      saleDate: new Date(input.saleDate),
      observation: input.observation || null,
    });
    return sale;
  }),

  update: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    osNumber: z.string().trim().min(1).max(64),
    lensId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(100),
    saleAmount: z.number().min(0).max(10000000),
    saleDate: z.string().datetime(),
    storeName: z.string().trim().min(2).max(255).optional(),
    observation: z.string().trim().max(2000).optional(),
  })).mutation(async ({ input, ctx }) => {
    const existing = await db.getSaleById(input.id);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado." });
    if (!canEditSale(ctx.user.id, ctx.user.role, existing.userId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode editar seus próprios lançamentos." });
    }
    const lens = await db.getLensById(input.lensId);
    if (!lens) throw new TRPCError({ code: "NOT_FOUND", message: "Lente não encontrada." });
    const owner = await db.getUserById(existing.userId);
    const storeName = owner?.storeUnit?.trim() || "Óticas Único";
    return db.updateSale(input.id, {
      osNumber: input.osNumber,
      lensId: lens.id,
      lensName: lens.name,
      quantity: input.quantity,
      saleAmount: input.saleAmount.toFixed(2),
      rewardAmount: calculateReward(lens.rewardValue, input.quantity).toFixed(2),
      saleDate: new Date(input.saleDate),
      storeName,
      observation: input.observation || null,
    });
  }),

  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const existing = await db.getSaleById(input.id);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado." });
    if (!canEditSale(ctx.user.id, ctx.user.role, existing.userId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode excluir seus próprios lançamentos." });
    }
    await db.deleteSale(input.id);
    return { success: true } as const;
  }),

  mine: protectedProcedure.input(periodInput.optional()).query(async ({ input, ctx }) => {
    return db.listSales({
      userId: ctx.user.id,
      storeUnit: ctx.user.storeUnit?.trim() || "Óticas Único",
      from: input?.from ? new Date(input.from) : undefined,
      to: input?.to ? new Date(input.to) : undefined,
    });
  }),

  report: protectedProcedure.input(periodInput.optional()).query(async ({ input, ctx }) => {
    const isMaster = ctx.user.role === "master" || ctx.user.role === "admin";
    const requestedSellerId = input?.sellerId;
    if (requestedSellerId && !isMaster && requestedSellerId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode consultar seus próprios lançamentos." });
    }
    const rows = await db.listSales({
      userId: isMaster ? requestedSellerId : ctx.user.id,
      storeUnit: isMaster ? undefined : (ctx.user.storeUnit?.trim() || "Óticas Único"),
      from: input?.from ? new Date(input.from) : undefined,
      to: input?.to ? new Date(input.to) : undefined,
    });
    const totalReward = rows.reduce((sum, row) => sum + toNumber(row.rewardAmount), 0);
    const totalSales = rows.reduce((sum, row) => sum + toNumber(row.saleAmount), 0);
    const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    const bySeller = Object.values(rows.reduce<Record<string, { sellerName: string; totalReward: number; totalSales: number; quantity: number }>>((acc, row) => {
      const key = String(row.userId);
      acc[key] ??= { sellerName: row.sellerName, totalReward: 0, totalSales: 0, quantity: 0 };
      acc[key].totalReward += toNumber(row.rewardAmount);
      acc[key].totalSales += toNumber(row.saleAmount);
      acc[key].quantity += row.quantity;
      return acc;
    }, {}));
    return { rows, totalReward, totalSales, totalQuantity, bySeller };
  }),

  sellers: adminProcedure.query(() => db.listUsers()),
});
