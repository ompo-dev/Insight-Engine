import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __workspacePrisma__: PrismaClient | undefined;
}

export function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });
}

export function getPrismaClient() {
  if (!globalThis.__workspacePrisma__) {
    globalThis.__workspacePrisma__ = createPrismaClient();
  }

  return globalThis.__workspacePrisma__;
}

export * from "@prisma/client";
