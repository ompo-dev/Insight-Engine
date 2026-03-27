import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun run ./src/seed.ts"
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/insight_engine?schema=public"
  }
});
