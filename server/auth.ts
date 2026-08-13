import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";
import { ENV } from "./_core/env";

export const APP_SESSION_COOKIE = COOKIE_NAME;
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

type SessionPayload = {
  userId: number;
  username: string;
};

const sessionSecret = () => new TextEncoder().encode(ENV.cookieSecret || "folha-premio-development-secret");

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function hashSecret(value: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(value, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifySecret(value: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [algorithm, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const derived = scryptSync(value, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ userId: payload.userId, username: payload.username })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_DURATION_MS) / 1000))
    .sign(sessionSecret());
}

export async function verifySessionToken(token: string | undefined | null) {
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

export function getSessionTokenFromRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const cookieToken = cookies[APP_SESSION_COOKIE];
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.authorization;
  return typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
}

export async function setSessionCookie(res: Response, req: Request, user: { id: number; username: string }) {
  const token = await createSessionToken({ userId: user.id, username: user.username });
  res.cookie(APP_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(req),
    maxAge: SESSION_DURATION_MS,
  });
}

export function clearSessionCookie(res: Response, req: Request) {
  res.clearCookie(APP_SESSION_COOKIE, {
    ...getSessionCookieOptions(req),
  });
}
