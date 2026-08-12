import type { Request } from "express";
import { ForbiddenError } from "@shared/_core/errors";
import type { ExchangeTokenResponse, GetUserInfoResponse } from "./types/manusTypes";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionTokenFromRequest, verifySessionToken } from "../auth";
import { SignJWT } from "jose";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

/**
 * A aplicação usa o cookie `folha-premio-session` criado pelo login próprio.
 * Estes métodos de OAuth existem somente para manter a infraestrutura legada
 * compilável; nenhuma tela ou fluxo da aplicação chama OAuth.
 */
class SDKServer {
  async exchangeCodeForToken(_code: string, _state: string): Promise<ExchangeTokenResponse> {
    throw new Error("OAuth desativado: use o login próprio da aplicação.");
  }

  async getUserInfo(_accessToken: string): Promise<GetUserInfoResponse> {
    throw new Error("OAuth desativado: use o login próprio da aplicação.");
  }

  async createSessionToken(openId: string, options: { expiresInMs?: number; name?: string } = {}) {
    return new SignJWT({ openId, appId: ENV.appId, name: options.name ?? "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime(Math.floor((Date.now() + (options.expiresInMs ?? 1000 * 60 * 60 * 24 * 30)) / 1000))
      .sign(new TextEncoder().encode(ENV.cookieSecret || "folha-premio-development-secret"));
  }

  async authenticateRequest(req: Request): Promise<User> {
    const session = await verifySessionToken(getSessionTokenFromRequest(req));
    if (!session) throw ForbiddenError("Sessão inválida ou expirada");
    const user = await db.getUserById(session.userId);
    if (!user) throw ForbiddenError("Usuário não encontrado");
    return user;
  }
}

export type AuthenticatedUser = User;
export const sdk = new SDKServer();
