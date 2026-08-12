import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { clearSessionCookie, hashSecret, normalizeAnswer, normalizeUsername, setSessionCookie, verifySecret } from "../auth";

const credentialsSchema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(6).max(128),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  storeUnit: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  securityQuestion: z.string().trim().min(5).max(200),
  securityAnswer: z.string().trim().min(2).max(120),
});

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  register: publicProcedure
    .input(credentialsSchema.extend(profileSchema.shape))
    .mutation(async ({ input, ctx }) => {
      const username = normalizeUsername(input.username);
      const existing = await db.getUserByUsername(username);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Este usuário já está cadastrado." });
      const currentUsers = await db.listUsers();
      const role = currentUsers.length === 0 ? "master" : "seller";
      const user = await db.createUser({
        username,
        passwordHash: hashSecret(input.password),
        name: input.name,
        storeUnit: input.storeUnit,
        email: input.email || null,
        loginMethod: "password",
        role,
        securityQuestion: input.securityQuestion,
        securityAnswerHash: hashSecret(normalizeAnswer(input.securityAnswer)),
      });
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar o usuário." });
      await setSessionCookie(ctx.res, ctx.req, { id: user.id, username: username });
      return { user, firstUserIsMaster: role === "master" };
    }),

  login: publicProcedure
    .input(credentialsSchema)
    .mutation(async ({ input, ctx }) => {
      const username = normalizeUsername(input.username);
      const user = await db.getUserByUsername(username);
      if (!user || !verifySecret(input.password, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos." });
      }
      await db.updateUserPassword(user.id, user.passwordHash ?? "");
      await setSessionCookie(ctx.res, ctx.req, { id: user.id, username });
      return { user };
    }),

  recoveryQuestion: publicProcedure
    .input(z.object({ username: z.string().trim().min(3).max(64) }))
    .query(async ({ input }) => {
      const user = await db.getUserByUsername(normalizeUsername(input.username));
      return { found: Boolean(user?.securityQuestion), question: user?.securityQuestion ?? null };
    }),

  resetPassword: publicProcedure
    .input(z.object({
      username: z.string().trim().min(3).max(64),
      securityAnswer: z.string().trim().min(2).max(120),
      newPassword: z.string().min(6).max(128),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByUsername(normalizeUsername(input.username));
      if (!user || !verifySecret(normalizeAnswer(input.securityAnswer), user.securityAnswerHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Resposta da pergunta-chave incorreta." });
      }
      await db.updateUserPassword(user.id, hashSecret(input.newPassword));
      await setSessionCookie(ctx.res, ctx.req, { id: user.id, username: user.username ?? normalizeUsername(input.username) });
      return { success: true };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.res, ctx.req);
    return { success: true } as const;
  }),
});
