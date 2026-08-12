import { describe, expect, it } from "vitest";

type SaleItem = {
  id: number;
  sellerName: string;
  rewardAmount: string;
  saleAmount: string;
  quantity: number;
};

describe("agregador de relatórios e premiação", () => {
  it("calcula somas de prêmio e vendas corretamente", () => {
    const rows: SaleItem[] = [
      { id: 1, sellerName: "Ana", rewardAmount: "35.00", saleAmount: "450.00", quantity: 1 },
      { id: 2, sellerName: "Ana", rewardAmount: "50.00", saleAmount: "980.00", quantity: 2 },
      { id: 3, sellerName: "Carlos", rewardAmount: "20.00", saleAmount: "300.00", quantity: 1 },
    ];

    const totalReward = rows.reduce((sum, r) => sum + Number(r.rewardAmount), 0);
    const totalSales = rows.reduce((sum, r) => sum + Number(r.saleAmount), 0);
    const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);

    expect(totalReward).toBe(105);
    expect(totalSales).toBe(1730);
    expect(totalQuantity).toBe(4);
  });
});
