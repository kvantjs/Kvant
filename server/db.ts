import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { chats, InsertUser, users, workspaces } from "../drizzle/schema";
import { ENV } from "./_core/env";

type Db = ReturnType<typeof drizzle>;
let _db: Db | null = null;

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listChats(userId: number | null) {
  const db = await getDb();
  if (!db || userId === null) return [];
  return db.select({ id: chats.id, title: chats.title, createdAt: chats.createdAt, updatedAt: chats.updatedAt })
    .from(chats).where(eq(chats.userId, userId)).orderBy(desc(chats.updatedAt)).limit(30);
}

export async function getChat(id: string, userId: number | null) {
  const db = await getDb();
  if (!db) return undefined;
  const filters = userId === null ? eq(chats.id, id) : and(eq(chats.id, id), eq(chats.userId, userId));
  const result = await db.select().from(chats).where(filters).limit(1);
  return result[0];
}

export async function saveChat(input: { id: string; userId: number | null; title: string; messages: string }) {
  const db = await getDb();
  if (!db || input.userId === null) return;
  await db.insert(chats).values(input).onDuplicateKeyUpdate({
    set: { title: input.title, messages: input.messages, updatedAt: new Date() },
  });
}

export async function deleteChat(id: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(chats).where(and(eq(chats.id, id), eq(chats.userId, userId)));
}

export async function getWorkspace(userId: number | null) {
  const db = await getDb();
  if (!db || userId === null) return undefined;
  const result = await db.select().from(workspaces).where(eq(workspaces.userId, userId)).orderBy(desc(workspaces.updatedAt)).limit(1);
  return result[0];
}

export async function saveWorkspace(input: { id: string; userId: number | null; name: string; repository?: string; framework: string; files: string }) {
  const db = await getDb();
  if (!db || input.userId === null) return;
  await db.insert(workspaces).values(input).onDuplicateKeyUpdate({
    set: { name: input.name, repository: input.repository, framework: input.framework, files: input.files, updatedAt: new Date() },
  });
}
