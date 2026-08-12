import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listSales: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(userId: number, role: "seller" | "master"): TrpcContext {
  return {
    user: {
      id: userId,
      openId: null,
      username: `user-${userId}`,
      passwordHash: null,
      securityQuestion: "Pergunta",
      securityAnswerHash: null,
      name: "Vendedora de Teste",
      storeUnit: role === "seller" ? "Unidade Centro" : null,
      email: null,
      loginMethod: "password",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("sales.report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.listSales.mockResolvedValue([
      { id: 1, userId: 90001, sellerName: "Cintia Seabra", rewardAmount: "35.00", saleAmount: "900.00", quantity: 1 },
      { id: 2, userId: 90001, sellerName: "Cintia Seabra", rewardAmount: "10.00", saleAmount: "450.00", quantity: 1 },
    ]);
  });

  it("retorna as vendas da vendedora e soma prêmio, vendas e quantidade", async () => {
    const caller = appRouter.createCaller(contextFor(90001, "seller"));
    const result = await caller.sales.report({
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:59.999Z",
    });

    expect(dbMocks.listSales).toHaveBeenCalledWith({
      userId: 90001,
      storeUnit: "Unidade Centro",
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-31T23:59:59.999Z"),
    });
    expect(result.rows).toHaveLength(2);
    expect(result.totalSales).toBe(1350);
    expect(result.totalReward).toBe(45);
    expect(result.totalQuantity).toBe(2);
  });

  it("permite ao Master consultar o relatório de uma vendedora específica", async () => {
    const caller = appRouter.createCaller(contextFor(1, "master"));
    await caller.sales.report({ sellerId: 90001 });

    expect(dbMocks.listSales).toHaveBeenCalledWith({ userId: 90001, storeUnit: undefined, from: undefined, to: undefined });
  });
});
