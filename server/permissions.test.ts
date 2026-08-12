import { describe, expect, it } from "vitest";
import { canEditSale } from "../shared/permissions";

describe("permissões de edição de lançamentos", () => {
  it("permite ao vendedor editar o próprio lançamento", () => {
    expect(canEditSale(7, "seller", 7)).toBe(true);
    expect(canEditSale(7, "seller", 8)).toBe(false);
  });

  it("permite ao Master revisar lançamentos de qualquer vendedor", () => {
    expect(canEditSale(7, "master", 8)).toBe(true);
    expect(canEditSale(7, "admin", 8)).toBe(true);
  });
});
