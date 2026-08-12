// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { and, desc, eq, gte, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  storeUnit: varchar("storeUnit", { length: 255 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "master", "seller"]).default("seller").notNull(),
  securityQuestion: text("securityQuestion"),
  securityAnswerHash: varchar("securityAnswerHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var lenses = mysqlTable("lenses", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  rewardValue: decimal("rewardValue", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sellerName: varchar("sellerName", { length: 255 }).notNull(),
  storeName: varchar("storeName", { length: 255 }).default("\xD3ticas \xDAnico").notNull(),
  osNumber: varchar("osNumber", { length: 64 }).notNull(),
  lensId: int("lensId").notNull(),
  lensName: varchar("lensName", { length: 255 }).notNull(),
  saleAmount: decimal("saleAmount", { precision: 10, scale: 2 }).notNull(),
  rewardAmount: decimal("rewardAmount", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  saleDate: timestamp("saleDate").notNull(),
  observation: text("observation"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
async function getUserByUsername(username) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}
async function createUser(user) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  const result = await db.insert(users).values(user);
  return getUserById(Number(result[0].insertId));
}
async function updateUserPassword(id, passwordHash) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.update(users).set({ passwordHash, lastSignedIn: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
}
async function updateUserRole(id, role) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.update(users).set({ role }).where(eq(users.id, id));
}
async function updateUserUnit(id, storeUnit) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.update(users).set({ storeUnit }).where(eq(users.id, id));
}
async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    storeUnit: users.storeUnit,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn
  }).from(users).orderBy(desc(users.createdAt));
}
async function deleteUser(id) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.delete(users).where(eq(users.id, id));
}
async function listLenses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lenses).orderBy(lenses.category, lenses.name);
}
async function getLensById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(lenses).where(eq(lenses.id, id)).limit(1);
  return result[0];
}
async function createLens(lens) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  const result = await db.insert(lenses).values(lens);
  return getLensById(Number(result[0].insertId));
}
async function updateLens(id, values) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.update(lenses).set(values).where(eq(lenses.id, id));
  return getLensById(id);
}
async function deleteLens(id) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.delete(lenses).where(eq(lenses.id, id));
}
async function createSale(sale) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  const result = await db.insert(sales).values(sale);
  const created = await db.select().from(sales).where(eq(sales.id, Number(result[0].insertId))).limit(1);
  return created[0];
}
async function getSaleById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  return result[0];
}
async function updateSale(id, values) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.update(sales).set(values).where(eq(sales.id, id));
  return getSaleById(id);
}
async function deleteSale(id) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.delete(sales).where(eq(sales.id, id));
  return true;
}
async function listSales(options = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (options.userId) conditions.push(eq(sales.userId, options.userId));
  if (options.storeUnit) conditions.push(eq(sales.storeName, options.storeUnit));
  if (options.from) conditions.push(gte(sales.saleDate, options.from));
  if (options.to) conditions.push(lte(sales.saleDate, options.to));
  return db.select().from(sales).where(conditions.length ? and(...conditions) : void 0).orderBy(desc(sales.saleDate), desc(sales.createdAt));
}
async function upsertUser(user) {
  const db = await getDb();
  if (!db || !user.openId) return;
  await db.insert(users).values(user).onDuplicateKeyUpdate({
    set: {
      name: user.name,
      email: user.email,
      loginMethod: user.loginMethod,
      lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date()
    }
  });
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/auth.ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/auth.ts
var APP_SESSION_COOKIE = COOKIE_NAME;
var SESSION_DURATION_MS = 1e3 * 60 * 60 * 24 * 30;
var sessionSecret = () => new TextEncoder().encode(ENV.cookieSecret || "folha-premio-development-secret");
function normalizeUsername(value) {
  return value.trim().toLowerCase();
}
function normalizeAnswer(value) {
  return value.trim().toLocaleLowerCase("pt-BR");
}
function hashSecret(value) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(value, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}
function verifySecret(value, stored) {
  if (!stored) return false;
  const [algorithm, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const derived = scryptSync(value, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
async function createSessionToken(payload) {
  return new SignJWT({ userId: payload.userId, username: payload.username }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject(String(payload.userId)).setIssuedAt().setExpirationTime(Math.floor((Date.now() + SESSION_DURATION_MS) / 1e3)).sign(sessionSecret());
}
async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    const userId = Number(payload.userId ?? payload.sub);
    const username = typeof payload.username === "string" ? payload.username : "";
    if (!Number.isInteger(userId) || userId <= 0 || !username) return null;
    return { userId, username };
  } catch {
    return null;
  }
}
function getSessionTokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const cookieToken = cookies[APP_SESSION_COOKIE];
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.authorization;
  return typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
}
async function setSessionCookie(res, req, user) {
  const token = await createSessionToken({ userId: user.id, username: user.username });
  res.cookie(APP_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(req),
    maxAge: SESSION_DURATION_MS
  });
}
function clearSessionCookie(res, req) {
  res.clearCookie(APP_SESSION_COOKIE, {
    ...getSessionCookieOptions(req),
    maxAge: -1
  });
}

// server/_core/sdk.ts
import { SignJWT as SignJWT2 } from "jose";
var SDKServer = class {
  async exchangeCodeForToken(_code, _state) {
    throw new Error("OAuth desativado: use o login pr\xF3prio da aplica\xE7\xE3o.");
  }
  async getUserInfo(_accessToken) {
    throw new Error("OAuth desativado: use o login pr\xF3prio da aplica\xE7\xE3o.");
  }
  async createSessionToken(openId, options = {}) {
    return new SignJWT2({ openId, appId: ENV.appId, name: options.name ?? "" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime(Math.floor((Date.now() + (options.expiresInMs ?? 1e3 * 60 * 60 * 24 * 30)) / 1e3)).sign(new TextEncoder().encode(ENV.cookieSecret || "folha-premio-development-secret"));
  }
  async authenticateRequest(req) {
    const session = await verifySessionToken(getSessionTokenFromRequest(req));
    if (!session) throw ForbiddenError("Sess\xE3o inv\xE1lida ou expirada");
    const user = await getUserById(session.userId);
    if (!user) throw ForbiddenError("Usu\xE1rio n\xE3o encontrado");
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "master" && ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/auth.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";
var credentialsSchema = z2.object({
  username: z2.string().trim().min(3).max(64),
  password: z2.string().min(6).max(128)
});
var profileSchema = z2.object({
  name: z2.string().trim().min(2).max(120),
  storeUnit: z2.string().trim().min(2).max(255),
  email: z2.string().trim().email().max(320).optional().or(z2.literal("")),
  securityQuestion: z2.string().trim().min(5).max(200),
  securityAnswer: z2.string().trim().min(2).max(120)
});
var authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),
  register: publicProcedure.input(credentialsSchema.extend(profileSchema.shape)).mutation(async ({ input, ctx }) => {
    const username = normalizeUsername(input.username);
    const existing = await getUserByUsername(username);
    if (existing) throw new TRPCError3({ code: "CONFLICT", message: "Este usu\xE1rio j\xE1 est\xE1 cadastrado." });
    const currentUsers = await listUsers();
    const role = currentUsers.length === 0 ? "master" : "seller";
    const user = await createUser({
      username,
      passwordHash: hashSecret(input.password),
      name: input.name,
      storeUnit: input.storeUnit,
      email: input.email || null,
      loginMethod: "password",
      role,
      securityQuestion: input.securityQuestion,
      securityAnswerHash: hashSecret(normalizeAnswer(input.securityAnswer))
    });
    if (!user) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "N\xE3o foi poss\xEDvel criar o usu\xE1rio." });
    await setSessionCookie(ctx.res, ctx.req, { id: user.id, username });
    return { user, firstUserIsMaster: role === "master" };
  }),
  login: publicProcedure.input(credentialsSchema).mutation(async ({ input, ctx }) => {
    const username = normalizeUsername(input.username);
    const user = await getUserByUsername(username);
    if (!user || !verifySecret(input.password, user.passwordHash)) {
      throw new TRPCError3({ code: "UNAUTHORIZED", message: "Usu\xE1rio ou senha inv\xE1lidos." });
    }
    await updateUserPassword(user.id, user.passwordHash ?? "");
    await setSessionCookie(ctx.res, ctx.req, { id: user.id, username });
    return { user };
  }),
  recoveryQuestion: publicProcedure.input(z2.object({ username: z2.string().trim().min(3).max(64) })).query(async ({ input }) => {
    const user = await getUserByUsername(normalizeUsername(input.username));
    return { found: Boolean(user?.securityQuestion), question: user?.securityQuestion ?? null };
  }),
  resetPassword: publicProcedure.input(z2.object({
    username: z2.string().trim().min(3).max(64),
    securityAnswer: z2.string().trim().min(2).max(120),
    newPassword: z2.string().min(6).max(128)
  })).mutation(async ({ input, ctx }) => {
    const user = await getUserByUsername(normalizeUsername(input.username));
    if (!user || !verifySecret(normalizeAnswer(input.securityAnswer), user.securityAnswerHash)) {
      throw new TRPCError3({ code: "UNAUTHORIZED", message: "Resposta da pergunta-chave incorreta." });
    }
    await updateUserPassword(user.id, hashSecret(input.newPassword));
    await setSessionCookie(ctx.res, ctx.req, { id: user.id, username: user.username ?? normalizeUsername(input.username) });
    return { success: true };
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.res, ctx.req);
    return { success: true };
  })
});

// server/routers/lenses.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z3 } from "zod";
var lensInput = z3.object({
  category: z3.string().trim().min(2).max(128),
  name: z3.string().trim().min(2).max(255),
  rewardValue: z3.coerce.number().min(0).max(1e5),
  notes: z3.string().trim().max(1e3).optional().or(z3.literal(""))
});
var lensesRouter = router({
  list: protectedProcedure.query(() => listLenses()),
  create: adminProcedure.input(lensInput).mutation(async ({ input }) => {
    const lens = await createLens({
      category: input.category,
      name: input.name,
      rewardValue: input.rewardValue.toFixed(2),
      notes: input.notes || null
    });
    if (!lens) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "N\xE3o foi poss\xEDvel cadastrar a lente." });
    return lens;
  }),
  update: adminProcedure.input(lensInput.extend({ id: z3.number().int().positive() })).mutation(async ({ input }) => {
    const lens = await updateLens(input.id, {
      category: input.category,
      name: input.name,
      rewardValue: input.rewardValue.toFixed(2),
      notes: input.notes || null
    });
    if (!lens) throw new TRPCError4({ code: "NOT_FOUND", message: "Lente n\xE3o encontrada." });
    return lens;
  }),
  delete: adminProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ input }) => {
    await deleteLens(input.id);
    return { success: true };
  })
});

// server/routers/sales.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z4 } from "zod";

// shared/rewards.ts
function calculateReward(rewardValue, quantity) {
  return Number(rewardValue) * quantity;
}

// shared/permissions.ts
function canEditSale(userId, role, saleUserId) {
  return role === "master" || role === "admin" || userId === saleUserId;
}

// server/routers/sales.ts
var periodInput = z4.object({
  from: z4.string().datetime().optional(),
  to: z4.string().datetime().optional(),
  sellerId: z4.number().int().positive().optional()
});
function toNumber(value) {
  return Number(value ?? 0);
}
var salesRouter = router({
  create: protectedProcedure.input(z4.object({
    osNumber: z4.string().trim().min(1).max(64),
    lensId: z4.number().int().positive(),
    quantity: z4.number().int().min(1).max(100),
    saleAmount: z4.number().min(0).max(1e7),
    saleDate: z4.string().datetime(),
    storeName: z4.string().trim().min(2).max(255).optional(),
    observation: z4.string().trim().max(2e3).optional()
  })).mutation(async ({ input, ctx }) => {
    const lens = await getLensById(input.lensId);
    if (!lens) throw new TRPCError5({ code: "NOT_FOUND", message: "Lente n\xE3o encontrada." });
    const rewardAmount = calculateReward(lens.rewardValue, input.quantity);
    const storeName = ctx.user.storeUnit?.trim() || "\xD3ticas \xDAnico";
    const sale = await createSale({
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
      observation: input.observation || null
    });
    return sale;
  }),
  update: protectedProcedure.input(z4.object({
    id: z4.number().int().positive(),
    osNumber: z4.string().trim().min(1).max(64),
    lensId: z4.number().int().positive(),
    quantity: z4.number().int().min(1).max(100),
    saleAmount: z4.number().min(0).max(1e7),
    saleDate: z4.string().datetime(),
    storeName: z4.string().trim().min(2).max(255).optional(),
    observation: z4.string().trim().max(2e3).optional()
  })).mutation(async ({ input, ctx }) => {
    const existing = await getSaleById(input.id);
    if (!existing) throw new TRPCError5({ code: "NOT_FOUND", message: "Lan\xE7amento n\xE3o encontrado." });
    if (!canEditSale(ctx.user.id, ctx.user.role, existing.userId)) {
      throw new TRPCError5({ code: "FORBIDDEN", message: "Voc\xEA s\xF3 pode editar seus pr\xF3prios lan\xE7amentos." });
    }
    const lens = await getLensById(input.lensId);
    if (!lens) throw new TRPCError5({ code: "NOT_FOUND", message: "Lente n\xE3o encontrada." });
    const owner = await getUserById(existing.userId);
    const storeName = owner?.storeUnit?.trim() || "\xD3ticas \xDAnico";
    return updateSale(input.id, {
      osNumber: input.osNumber,
      lensId: lens.id,
      lensName: lens.name,
      quantity: input.quantity,
      saleAmount: input.saleAmount.toFixed(2),
      rewardAmount: calculateReward(lens.rewardValue, input.quantity).toFixed(2),
      saleDate: new Date(input.saleDate),
      storeName,
      observation: input.observation || null
    });
  }),
  delete: protectedProcedure.input(z4.object({ id: z4.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const existing = await getSaleById(input.id);
    if (!existing) throw new TRPCError5({ code: "NOT_FOUND", message: "Lan\xE7amento n\xE3o encontrado." });
    if (!canEditSale(ctx.user.id, ctx.user.role, existing.userId)) {
      throw new TRPCError5({ code: "FORBIDDEN", message: "Voc\xEA s\xF3 pode excluir seus pr\xF3prios lan\xE7amentos." });
    }
    await deleteSale(input.id);
    return { success: true };
  }),
  mine: protectedProcedure.input(periodInput.optional()).query(async ({ input, ctx }) => {
    return listSales({
      userId: ctx.user.id,
      storeUnit: ctx.user.storeUnit?.trim() || "\xD3ticas \xDAnico",
      from: input?.from ? new Date(input.from) : void 0,
      to: input?.to ? new Date(input.to) : void 0
    });
  }),
  report: protectedProcedure.input(periodInput.optional()).query(async ({ input, ctx }) => {
    const isMaster = ctx.user.role === "master" || ctx.user.role === "admin";
    const requestedSellerId = input?.sellerId;
    if (requestedSellerId && !isMaster && requestedSellerId !== ctx.user.id) {
      throw new TRPCError5({ code: "FORBIDDEN", message: "Voc\xEA s\xF3 pode consultar seus pr\xF3prios lan\xE7amentos." });
    }
    const rows = await listSales({
      userId: isMaster ? requestedSellerId : ctx.user.id,
      storeUnit: isMaster ? void 0 : ctx.user.storeUnit?.trim() || "\xD3ticas \xDAnico",
      from: input?.from ? new Date(input.from) : void 0,
      to: input?.to ? new Date(input.to) : void 0
    });
    const totalReward = rows.reduce((sum, row) => sum + toNumber(row.rewardAmount), 0);
    const totalSales = rows.reduce((sum, row) => sum + toNumber(row.saleAmount), 0);
    const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    const bySeller = Object.values(rows.reduce((acc, row) => {
      const key = String(row.userId);
      acc[key] ??= { sellerName: row.sellerName, totalReward: 0, totalSales: 0, quantity: 0 };
      acc[key].totalReward += toNumber(row.rewardAmount);
      acc[key].totalSales += toNumber(row.saleAmount);
      acc[key].quantity += row.quantity;
      return acc;
    }, {}));
    return { rows, totalReward, totalSales, totalQuantity, bySeller };
  }),
  sellers: adminProcedure.query(() => listUsers())
});

// server/routers/users.ts
import { TRPCError as TRPCError6 } from "@trpc/server";
import { z as z5 } from "zod";
var usersRouter = router({
  list: adminProcedure.query(() => listUsers()),
  createSeller: adminProcedure.input(z5.object({
    username: z5.string().trim().min(3).max(64),
    password: z5.string().min(6).max(128),
    name: z5.string().trim().min(2).max(120),
    storeUnit: z5.string().trim().min(2).max(255),
    email: z5.string().trim().email().max(320).optional().or(z5.literal("")),
    role: z5.enum(["master", "seller"]).default("seller"),
    securityQuestion: z5.string().trim().min(5).max(200),
    securityAnswer: z5.string().trim().min(2).max(120)
  })).mutation(async ({ input }) => {
    const username = normalizeUsername(input.username);
    const existing = await getUserByUsername(username);
    if (existing) {
      throw new TRPCError6({ code: "CONFLICT", message: "Este usu\xE1rio j\xE1 est\xE1 cadastrado." });
    }
    const user = await createUser({
      username,
      passwordHash: hashSecret(input.password),
      name: input.name,
      storeUnit: input.storeUnit,
      email: input.email || null,
      loginMethod: "password",
      role: input.role,
      securityQuestion: input.securityQuestion,
      securityAnswerHash: hashSecret(normalizeAnswer(input.securityAnswer))
    });
    return user;
  }),
  updateUnit: adminProcedure.input(z5.object({
    id: z5.number().int().positive(),
    storeUnit: z5.string().trim().min(2).max(255)
  })).mutation(async ({ input }) => {
    await updateUserUnit(input.id, input.storeUnit);
    return { success: true };
  }),
  updateRole: adminProcedure.input(z5.object({
    id: z5.number().int().positive(),
    role: z5.enum(["master", "seller"])
  })).mutation(async ({ input, ctx }) => {
    if (input.id === ctx.user.id && input.role !== "master") {
      throw new TRPCError6({ code: "BAD_REQUEST", message: "O usu\xE1rio Master atual n\xE3o pode remover o pr\xF3prio acesso." });
    }
    await updateUserRole(input.id, input.role);
    return { success: true };
  }),
  delete: adminProcedure.input(z5.object({ id: z5.number().int().positive() })).mutation(async ({ input, ctx }) => {
    if (input.id === ctx.user.id) {
      throw new TRPCError6({ code: "BAD_REQUEST", message: "Voc\xEA n\xE3o pode excluir o pr\xF3prio usu\xE1rio." });
    }
    await deleteUser(input.id);
    return { success: true };
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: authRouter,
  lenses: lensesRouter,
  sales: salesRouter,
  users: usersRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var isProd = process.env.NODE_ENV === "production";
var plugins = [
  react(),
  tailwindcss(),
  ...isProd ? [] : [jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()]
];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
