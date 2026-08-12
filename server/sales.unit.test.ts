import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getLensById: vi.fn(),
  createSale: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context: TrpcContext = {
  user: {
    id: 90001,
    openId: null,
    username: "cintia",
    passwordHash: null,
    name: "Cintia Seabra",
    storeUnit: "Unidade Centro",
    email: null,
    loginMethod: "password",
    role: "seller",
    securityQuestion: "Pergunta",
    securityAnswerHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("sales.create unidade", () => {
  it("usa a unidade do cadastro e ignora a loja enviada pelo formulário", async () => {
    dbMocks.getLensById.mockResolvedValue({ id: 4, name: "Lente Premium Completa", rewardValue: "25.00" });
    dbMocks.createSale.mockResolvedValue({ id: 1, storeName: "Unidade Centro" });

    const caller = appRouter.createCaller(context);
    await caller.sales.create({
      osNumber: "OS-UNIT-1",
      lensId: 4,
      quantity: 2,
      saleAmount: 900,
      saleDate: "2026-08-12T12:00:00.000Z",
      storeName: "Outra Loja",
      observation: "Teste de unidade",
    });

    expect(dbMocks.createSale).toHaveBeenCalledWith(expect.objectContaining({
      storeName: "Unidade Centro",
      sellerName: "Cintia Seabra",
      rewardAmount: "50.00",
    }));
  });
});
