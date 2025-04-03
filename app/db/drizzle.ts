import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "./pool";

export const db = drizzle(pool, {
  casing: "snake_case",
});
