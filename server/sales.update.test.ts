import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getSaleById: vi.fn(),
  getUserById: vi.fn(),
  getLensById: vi.fn(),
  updateSale: vi.fn(),
  deleteSale: vi.fn(),
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
      name: "Usuário",
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

describe("sales.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getSaleById.mockResolvedValue({ id: 10, userId: 7 });
    dbMocks.getUserById.mockResolvedValue({ id: 7, storeUnit: "Unidade Centro" });
    dbMocks.getLensById.mockResolvedValue({ id: 4, name: "Lente Premium", rewardValue: "25.00" });
    dbMocks.updateSale.mockResolvedValue({ id: 10 });
    dbMocks.deleteSale.mockResolvedValue(true);
  });

  it("permite ao vendedor corrigir o próprio lançamento e recalcula o prêmio", async () => {
    const caller = appRouter.createCaller(contextFor(7, "seller"));
    await caller.sales.update({ id: 10, osNumber: "OS-99", lensId: 4, quantity: 2, saleAmount: 900, saleDate: "2026-08-12T12:00:00.000Z", storeName: "Óticas Único", observation: "Correção solicitada" });
    expect(dbMocks.updateSale).toHaveBeenCalledWith(10, expect.objectContaining({ lensId: 4, quantity: 2, rewardAmount: "50.00", osNumber: "OS-99", observation: "Correção solicitada" }));
  });

  it("bloqueia vendedor ao tentar editar lançamento de outra pessoa", async () => {
    const caller = appRouter.createCaller(contextFor(8, "seller"));
    await expect(caller.sales.update({ id: 10, osNumber: "OS-99", lensId: 4, quantity: 1, saleAmount: 900, saleDate: "2026-08-12T12:00:00.000Z", storeName: "Óticas Único" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.updateSale).not.toHaveBeenCalled();
  });

  it("permite ao Master corrigir lançamento de qualquer vendedor", async () => {
    const caller = appRouter.createCaller(contextFor(1, "master"));
    await caller.sales.update({ id: 10, osNumber: "OS-100", lensId: 4, quantity: 1, saleAmount: 500, saleDate: "2026-08-12T12:00:00.000Z", storeName: "Óticas Único" });
    expect(dbMocks.updateSale).toHaveBeenCalledTimes(1);
  });

  it("permite exclusão do próprio lançamento e bloqueia exclusão de outro vendedor", async () => {
    const owner = appRouter.createCaller(contextFor(7, "seller"));
    await owner.sales.delete({ id: 10 });
    expect(dbMocks.deleteSale).toHaveBeenCalledWith(10);

    vi.clearAllMocks();
    dbMocks.getSaleById.mockResolvedValue({ id: 10, userId: 7 });
    dbMocks.getUserById.mockResolvedValue({ id: 7, storeUnit: "Unidade Centro" });
    const other = appRouter.createCaller(contextFor(8, "seller"));
    await expect(other.sales.delete({ id: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.deleteSale).not.toHaveBeenCalled();
  });
});
