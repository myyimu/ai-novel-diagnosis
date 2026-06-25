import { runPostgresMigrations } from "./run-migrations";

describe("runPostgresMigrations", () => {
  it("skips migrations when DATABASE_URL is not configured", async () => {
    await expect(
      runPostgresMigrations({
        databaseUrl: "",
        migrationsFolder: "missing-folder",
      }),
    ).resolves.toBeUndefined();
  });

  it("fails fast when a configured database has no migrations folder", async () => {
    await expect(
      runPostgresMigrations({
        databaseUrl: "postgres://user:pass@127.0.0.1:5432/db",
        migrationsFolder: "missing-folder",
      }),
    ).rejects.toThrow("Drizzle migrations folder not found");
  });
});
