import { defineConfig } from "drizzle-kit";
import { requireEnv } from "~/util/env";

export default defineConfig({
  out: "./drizzle",
  schema: "./app/db/schema.ts",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    ...(process.env.DB_PORT && { port: parseInt(process.env.DB_PORT, 10) }),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: requireEnv("DB_NAME"),
    ssl: false,
  },
});
