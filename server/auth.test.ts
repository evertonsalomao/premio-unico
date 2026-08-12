import { describe, expect, it } from "vitest";
import { hashSecret, normalizeAnswer, normalizeUsername, verifySecret } from "./auth";
import { calculateReward } from "../shared/rewards";

describe("autenticação própria", () => {
  it("normaliza usuário e resposta da pergunta-chave", () => {
    expect(normalizeUsername("  Vendedor.Ana ")).toBe("vendedor.ana");
    expect(normalizeAnswer("  Minha Resposta  ")).toBe("minha resposta");
  });

  it("gera e valida um hash de senha sem armazenar o texto original", () => {
    const secret = "senha-segura-123";
    const hash = hashSecret(secret);
    expect(hash).not.toContain(secret);
    expect(verifySecret(secret, hash)).toBe(true);
    expect(verifySecret("outra-senha", hash)).toBe(false);
  });
});

describe("cálculo de premiação", () => {
  it("multiplica o prêmio unitário pela quantidade lançada", () => {
    expect(calculateReward("35.00", 2)).toBe(70);
    expect(calculateReward(65, 3)).toBe(195);
  });
});
