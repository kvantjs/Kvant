import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const chats = mysqlTable("chats", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId"),
  title: varchar("title", { length: 180 }).notNull(),
  messages: text("messages").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workspaces = mysqlTable("workspaces", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId"),
  name: varchar("name", { length: 120 }).notNull(),
  repository: varchar("repository", { length: 255 }),
  framework: varchar("framework", { length: 80 }).notNull().default("React + Vite"),
  files: text("files").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
