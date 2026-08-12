import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { hashSecret, normalizeAnswer, normalizeUsername } from "../auth";

export const usersRouter = router({
  list: adminProcedure.query(() => db.listUsers()),

  createSeller: adminProcedure.input(z.object({
    username: z.string().trim().min(3).max(64),
    password: z.string().min(6).max(128),
    name: z.string().trim().min(2).max(120),
    storeUnit: z.string().trim().min(2).max(255),
    email: z.string().trim().email().max(320).optional().or(z.literal("")),
    role: z.enum(["master", "seller"]).default("seller"),
    securityQuestion: z.string().trim().min(5).max(200),
    securityAnswer: z.string().trim().min(2).max(120),
  })).mutation(async ({ input }) => {
    const username = normalizeUsername(input.username);
    const existing = await db.getUserByUsername(username);
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Este usuário já está cadastrado." });
    }
    const user = await db.createUser({
      username,
      passwordHash: hashSecret(input.password),
      name: input.name,
      storeUnit: input.storeUnit,
      email: input.email || null,
      loginMethod: "password",
      role: input.role,
      securityQuestion: input.securityQuestion,
      securityAnswerHash: hashSecret(normalizeAnswer(input.securityAnswer)),
    });
    return user;
  }),

  updateUnit: adminProcedure.input(z.object({
    id: z.number().int().positive(),
    storeUnit: z.string().trim().min(2).max(255),
  })).mutation(async ({ input }) => {
    await db.updateUserUnit(input.id, input.storeUnit);
    return { success: true } as const;
  }),

  updateRole: adminProcedure.input(z.object({
    id: z.number().int().positive(),
    role: z.enum(["master", "seller"]),
  })).mutation(async ({ input, ctx }) => {
    if (input.id === ctx.user.id && input.role !== "master") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "O usuário Master atual não pode remover o próprio acesso." });
    }
    await db.updateUserRole(input.id, input.role);
    return { success: true } as const;
  }),

  delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    if (input.id === ctx.user.id) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode excluir o próprio usuário." });
    }
    await db.deleteUser(input.id);
    return { success: true } as const;
  }),
});
