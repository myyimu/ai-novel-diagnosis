import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export async function runPostgresMigrations({
  databaseUrl = process.env.DATABASE_URL?.trim(),
  migrationsFolder = process.env.DRIZZLE_MIGRATIONS_FOLDER?.trim() ||
    resolve(process.cwd(), "drizzle", "migrations"),
}: {
  databaseUrl?: string;
  migrationsFolder?: string;
} = {}) {
  if (!databaseUrl) {
    console.log("DATABASE_URL 未设置，跳过 PostgreSQL migrations。");
    return;
  }
  if (!existsSync(migrationsFolder)) {
    throw new Error(`Drizzle migrations folder not found: ${migrationsFolder}`);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder });
    console.log(`Drizzle migrations applied from ${migrationsFolder}`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runPostgresMigrations().catch((error) => {
    console.error("Drizzle migrations failed");
    console.error(error);
    process.exit(1);
  });
}
