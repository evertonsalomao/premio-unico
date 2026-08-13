import { and, desc, eq, gte, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertLens, InsertSale, InsertUser, lenses, sales, users } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(users).values(user);
  return getUserById(Number(result[0].insertId));
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ passwordHash, lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function updateUserRole(id: number, role: "master" | "seller") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function updateUserUnit(id: number, storeUnit: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ storeUnit }).where(eq(users.id, id));
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    storeUnit: users.storeUnit,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(users).where(eq(users.id, id));
}

export async function listLenses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lenses).orderBy(lenses.category, lenses.name);
}

export async function getLensById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(lenses).where(eq(lenses.id, id)).limit(1);
  return result[0];
}

export async function createLens(lens: InsertLens) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(lenses).values(lens);
  return getLensById(Number(result[0].insertId));
}

export async function updateLens(id: number, values: Partial<InsertLens>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(lenses).set(values).where(eq(lenses.id, id));
  return getLensById(id);
}

export async function deleteLens(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(lenses).where(eq(lenses.id, id));
}

export async function seedDefaultLenses(items: { category: string; name: string; rewardValue: number | string; notes?: string | null }[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  let count = 0;
  for (const item of items) {
    const existing = await db.select().from(lenses).where(and(eq(lenses.category, item.category), eq(lenses.name, item.name))).limit(1);
    if (existing.length === 0) {
      await db.insert(lenses).values({
        category: item.category,
        name: item.name,
        rewardValue: Number(item.rewardValue).toFixed(2),
        notes: item.notes || null,
      });
      count++;
    } else {
      await db.update(lenses).set({
        rewardValue: Number(item.rewardValue).toFixed(2),
        notes: item.notes || null,
      }).where(eq(lenses.id, existing[0].id));
    }
  }
  return count;
}

export async function createSale(sale: InsertSale) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(sales).values(sale);
  const created = await db.select().from(sales).where(eq(sales.id, Number(result[0].insertId))).limit(1);
  return created[0];
}

export async function getSaleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  return result[0];
}

export async function updateSale(id: number, values: Partial<InsertSale>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(sales).set(values).where(eq(sales.id, id));
  return getSaleById(id);
}

export async function deleteSale(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(sales).where(eq(sales.id, id));
  return true;
}

export async function listSales(options: { userId?: number; storeUnit?: string; from?: Date; to?: Date } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (options.userId) conditions.push(eq(sales.userId, options.userId));
  if (options.storeUnit) conditions.push(eq(sales.storeName, options.storeUnit));
  if (options.from) conditions.push(gte(sales.saleDate, options.from));
  if (options.to) conditions.push(lte(sales.saleDate, options.to));
  return db.select().from(sales)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(sales.saleDate), desc(sales.createdAt));
}

export async function listSalesForSellerIds(userIds: number[], from?: Date, to?: Date) {
  const db = await getDb();
  if (!db || userIds.length === 0) return [];
  const conditions = [or(...userIds.map(id => eq(sales.userId, id)))!];
  if (from) conditions.push(gte(sales.saleDate, from));
  if (to) conditions.push(lte(sales.saleDate, to));
  return db.select().from(sales).where(and(...conditions)).orderBy(desc(sales.saleDate), desc(sales.createdAt));
}

/** Compatibilidade somente para a rota OAuth legada, que não é exposta pela UI. */
export async function upsertUser(user: InsertUser) {
  const db = await getDb();
  if (!db || !user.openId) return;
  await db.insert(users).values(user).onDuplicateKeyUpdate({
    set: {
      name: user.name,
      email: user.email,
      loginMethod: user.loginMethod,
      lastSignedIn: user.lastSignedIn ?? new Date(),
    },
  });
}
