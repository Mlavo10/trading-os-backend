import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across hot reloads in dev,
// and across requests in production.
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma__ = prisma;
}
