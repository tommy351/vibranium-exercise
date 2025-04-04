import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DB_URL,
  host: process.env.DB_HOST,
  ...(process.env.DB_PORT && { port: parseInt(process.env.DB_PORT, 10) }),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
