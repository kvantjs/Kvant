export const ENV = {
  appId: process.env.APP_ID ?? "",
  cookieSecret: process.env.SESSION_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  authServerUrl: process.env.AUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  aiApiUrl: process.env.AI_API_URL ?? "",
  aiApiKey: process.env.AI_API_KEY ?? "",
};
