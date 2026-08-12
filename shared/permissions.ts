export type AppRole = "user" | "admin" | "master" | "seller";

export function canEditSale(userId: number, role: AppRole, saleUserId: number) {
  return role === "master" || role === "admin" || userId === saleUserId;
}
