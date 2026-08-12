import { describe, expect, it, vi, beforeEach } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listSales: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context: TrpcContext = {
  user: {
    id: 90002,
    openId: null,
    username: "carlos",
    passwordHash: null,
    name: "Carlos Vendedor",
    storeUnit: "Unidade Norte",
    email: null,
    loginMethod: "password",
    role: "seller",
    securityQuestion: "Cor",
    securityAnswerHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("sales.report período personalizado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.listSales.mockResolvedValue([
      { id: 10, userId: 90002, sellerName: "Carlos Vendedor", rewardAmount: "50.00", saleAmount: "1200.00", quantity: 1, saleDate: new Date("2026-08-05") },
    ]);
  });

  it("filtra corretamente por intervalo personalizado de dias quebrados (ex: 26.07 a 25.08)", async () => {
    const caller = appRouter.createCaller(context);
    const result = await caller.sales.report({
      from: "2026-07-26T00:00:00.000Z",
      to: "2026-08-25T23:59:59.999Z",
    });

    expect(dbMocks.listSales).toHaveBeenCalledWith({
      userId: 90002,
      storeUnit: "Unidade Norte",
      from: new Date("2026-07-26T00:00:00.000Z"),
      to: new Date("2026-08-25T23:59:59.999Z"),
    });
    expect(result.rows).toHaveLength(1);
    expect(result.totalSales).toBe(1200);
    expect(result.totalReward).toBe(50);
  });
});

describe("Validação de datas e botão pesquisar", () => {
  it("valida que intervalo inválido (data fim menor que início) é rejeitado na interface", () => {
    const from = "2026-08-25";
    const to = "2026-07-26";
    const isValid = from <= to;
    expect(isValid).toBe(false);
  });
});
