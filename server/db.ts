import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { chats, InsertUser, users, workspaces } from "../drizzle/schema";
import fs from "fs";
import path from "path";

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

// Robust local JSON fallback database
const DB_FILE = path.resolve(import.meta.dirname, "mock_db.json");

interface MockDb {
  users: any[];
  chats: any[];
  workspaces: any[];
}

function loadMockDb(): MockDb {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn("[Database] Failed to load mock DB:", error);
  }
  return { users: [], chats: [], workspaces: [] };
}

function saveMockDb(data: MockDb) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.warn("[Database] Failed to save mock DB:", error);
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    const data = loadMockDb();
    let existing = data.users.find((u) => u.openId === user.openId);
    if (existing) {
      Object.assign(existing, user, { updatedAt: new Date(), lastSignedIn: new Date() });
    } else {
      const newId = data.users.length + 1;
      existing = {
        id: newId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        ...user,
      };
      data.users.push(existing);
    }
    saveMockDb(data);
    return;
  }

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
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    const data = loadMockDb();
    return data.users.find((u) => u.openId === openId);
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listChats(userId: number | null) {
  const db = await getDb();
  if (!db) {
    const data = loadMockDb();
    return data.chats
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      }));
  }
  if (userId === null) return [];
  return db.select({ id: chats.id, title: chats.title, createdAt: chats.createdAt, updatedAt: chats.updatedAt })
    .from(chats).where(eq(chats.userId, userId)).orderBy(desc(chats.updatedAt)).limit(30);
}

export async function getChat(id: string, userId: number | null) {
  const db = await getDb();
  if (!db) {
    const data = loadMockDb();
    return data.chats.find((c) => c.id === id && (userId === null || c.userId === userId));
  }
  const filters = userId === null ? eq(chats.id, id) : and(eq(chats.id, id), eq(chats.userId, userId));
  const result = await db.select().from(chats).where(filters).limit(1);
  return result[0];
}

export async function saveChat(input: { id: string; userId: number | null; title: string; messages: string }) {
  const db = await getDb();
  if (!db) {
    const data = loadMockDb();
    const index = data.chats.findIndex((c) => c.id === input.id);
    if (index >= 0) {
      data.chats[index] = {
        ...data.chats[index],
        ...input,
        updatedAt: new Date().toISOString(),
      };
    } else {
      data.chats.push({
        ...input,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    saveMockDb(data);
    return;
  }
  if (input.userId === null) return;
  await db.insert(chats).values(input).onDuplicateKeyUpdate({
    set: { title: input.title, messages: input.messages, updatedAt: new Date() },
  });
}

export async function deleteChat(id: string, userId: number) {
  const db = await getDb();
  if (!db) {
    const data = loadMockDb();
    data.chats = data.chats.filter((c) => !(c.id === id && c.userId === userId));
    saveMockDb(data);
    return;
  }
  await db.delete(chats).where(and(eq(chats.id, id), eq(chats.userId, userId)));
}

export async function getWorkspace(userId: number | null) {
  const db = await getDb();
  if (!db) {
    const data = loadMockDb();
    return data.workspaces.find((w) => w.userId === userId);
  }
  if (userId === null) return undefined;
  const result = await db.select().from(workspaces).where(eq(workspaces.userId, userId)).orderBy(desc(workspaces.updatedAt)).limit(1);
  return result[0];
}

export async function saveWorkspace(input: { id: string; userId: number | null; name: string; repository?: string; framework: string; files: string }) {
  const db = await getDb();
  if (!db) {
    const data = loadMockDb();
    const index = data.workspaces.findIndex((w) => w.userId === input.userId);
    if (index >= 0) {
      data.workspaces[index] = {
        ...data.workspaces[index],
        ...input,
        updatedAt: new Date().toISOString(),
      };
    } else {
      data.workspaces.push({
        ...input,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    saveMockDb(data);
    return;
  }
  if (input.userId === null) return;
  await db.insert(workspaces).values(input).onDuplicateKeyUpdate({
    set: { name: input.name, repository: input.repository, framework: input.framework, files: input.files, updatedAt: new Date() },
  });
}
