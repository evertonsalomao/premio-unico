import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(): { ctx: TrpcContext; cookies: Record<string, string> } {
  const cookies: Record<string, string> = {};
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => { cookies[name] = value; },
      clearCookie: (name: string) => { delete cookies[name]; },
    } as TrpcContext["res"],
  };
  return { ctx, cookies };
}

describe("router de autenticação própria", () => {
  it("permite verificar pergunta-chave para recuperação", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.recoveryQuestion({ username: "inexistente" });
    expect(result.found).toBe(false);
  });
});
