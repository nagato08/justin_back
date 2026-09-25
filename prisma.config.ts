import "dotenv/config";
import { defineConfig } from "prisma/config";

process.env.DATABASE_URL ??=
  "postgresql://food_user:food_password@localhost:5432/food_orders?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
