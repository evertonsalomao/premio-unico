import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Usuários da aplicação. Os campos openId/loginMethod permanecem opcionais para
 * compatibilidade com a tabela original do template, mas a autenticação da
 * aplicação usa username/passwordHash e a pergunta-chave abaixo.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  storeUnit: varchar("storeUnit", { length: 255 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "master", "seller"]).default("seller").notNull(),
  securityQuestion: text("securityQuestion"),
  securityAnswerHash: varchar("securityAnswerHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const lenses = mysqlTable("lenses", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  rewardValue: decimal("rewardValue", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sellerName: varchar("sellerName", { length: 255 }).notNull(),
  storeName: varchar("storeName", { length: 255 }).default("Óticas Único").notNull(),
  osNumber: varchar("osNumber", { length: 64 }).notNull(),
  lensId: int("lensId").notNull(),
  lensName: varchar("lensName", { length: 255 }).notNull(),
  saleAmount: decimal("saleAmount", { precision: 10, scale: 2 }).notNull(),
  rewardAmount: decimal("rewardAmount", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  saleDate: timestamp("saleDate").notNull(),
  observation: text("observation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Lens = typeof lenses.$inferSelect;
export type InsertLens = typeof lenses.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;
