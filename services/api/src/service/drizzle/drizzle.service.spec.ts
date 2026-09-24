import { DrizzleService } from "./drizzle.service";
import type { PathLike } from "node:fs";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";

/** Append garbage bytes to every file under dir so reopening PGlite fails. */
function corruptDataFiles(dir: string): void {
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const entryPath = join(current, entry);
      if (statSync(entryPath).isFile()) {
        appendFileSync(entryPath, Buffer.from([0x00, 0xff, 0x00, 0xff]));
      } else {
        walk(entryPath);
      }
    }
  };
  walk(dir);
}

describe("DrizzleService", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalPgliteDataDir = process.env.PGLITE_DATA_DIR;
  const originalNodeEnv = process.env.NODE_ENV;
  let tempPgliteDataDir: string | undefined;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalUrl;
    }
    if (originalPgliteDataDir === undefined) {
      delete process.env.PGLITE_DATA_DIR;
    } else {
      process.env.PGLITE_DATA_DIR = originalPgliteDataDir;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (tempPgliteDataDir) {
      rmSync(tempPgliteDataDir, { recursive: true, force: true });
      tempPgliteDataDir = undefined;
    }
  });

  describe("when DATABASE_URL is empty (PGlite fallback)", () => {
    beforeEach(() => {
      delete process.env.DATABASE_URL;
      tempPgliteDataDir = mkdtempSync(join(tmpdir(), "ai-novel-pglite-"));
      process.env.PGLITE_DATA_DIR = tempPgliteDataDir;
    });

    it("constructs without throwing and exposes a usable db handle", async () => {
      const svc = new DrizzleService();
      try {
        expect(svc.db).toBeDefined();
        expect(svc.isConfigured()).toBe(false);
      } finally {
        await svc.onModuleDestroy();
      }
    });

    it("onModuleInit bootstraps the schema in-memory", async () => {
      const svc = new DrizzleService();
      await expect(svc.onModuleInit()).resolves.toBeUndefined();
      await svc.onModuleDestroy();
    });

    it("isHealthy returns true once PGlite is ready", async () => {
      const svc = new DrizzleService();
      await expect(svc.isHealthy()).resolves.toBe(true);
      await svc.onModuleDestroy();
    });
  });

  describe("when DATABASE_URL is set", () => {
    beforeEach(() => {
      // Non-reachable host — Pool construction is lazy (no TCP). Tests
      // here exercise the configured branch without dialing.
      process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
    });

    it("constructs the Postgres driver and marks itself configured", async () => {
      const svc = new DrizzleService();
      try {
        expect(svc.db).toBeDefined();
        expect(svc.isConfigured()).toBe(true);
      } finally {
        await svc.onModuleDestroy();
      }
    });
  });

  describe("when DATABASE_URL is whitespace", () => {
    beforeEach(() => {
      process.env.DATABASE_URL = "   ";
      tempPgliteDataDir = mkdtempSync(join(tmpdir(), "ai-novel-pglite-"));
      process.env.PGLITE_DATA_DIR = tempPgliteDataDir;
    });

    it("is treated as empty and falls back to PGlite", async () => {
      const svc = new DrizzleService();
      try {
        expect(svc.isConfigured()).toBe(false);
      } finally {
        await svc.onModuleDestroy();
      }
    });
  });

  it("rejects the PGlite fallback in production", () => {
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = "production";

    expect(() => new DrizzleService()).toThrow(
      "DATABASE_URL is required in production",
    );
  });

  // NOTE: keep this describe LAST — aborted PGlite WASM instances can
  // poison later instantiations inside the same jest worker, so the
  // corruption tests must not run before the happy-path ones.
  describe("when the PGlite data dir is corrupted", () => {
    let seedDir: string;

    beforeEach(async () => {
      delete process.env.DATABASE_URL;
      seedDir = mkdtempSync(join(tmpdir(), "ai-novel-pglite-"));
      tempPgliteDataDir = seedDir;
      process.env.PGLITE_DATA_DIR = seedDir;
      const { PGlite } = await import("@electric-sql/pglite");
      const seed = new PGlite(seedDir);
      await seed.query("select 1");
      await seed.close();
      corruptDataFiles(seedDir);
    });

    afterEach(() => {
      // clean the -broken-/-fresh- siblings the recovery path creates
      const parent = dirname(seedDir);
      const base = basename(seedDir);
      for (const entry of readdirSync(parent)) {
        if (entry.startsWith(`${base}-`)) {
          rmSync(join(parent, entry), { recursive: true, force: true });
        }
      }
    });

    it("should back up the broken dir and rebuild in place when bootstrap fails", async () => {
      const svc = new DrizzleService();
      try {
        await expect(svc.onModuleInit()).resolves.toBeUndefined();
        expect(existsSync(seedDir)).toBe(true);
        const parent = dirname(seedDir);
        const backups = readdirSync(parent).filter((entry) =>
          entry.startsWith(`${basename(seedDir)}-broken-`),
        );
        expect(backups.length).toBe(1);
      } finally {
        await svc.onModuleDestroy().catch(() => undefined);
      }
    });

    it("should fall back to a fresh sibling dir when the rename keeps failing", async () => {
      const fs = await import("node:fs");
      const realRename = fs.renameSync;
      // Only the recovery rename of the broken dir fails; PGlite's own
      // internal renames on the fresh dir must keep working.
      const renameSpy = jest
        .spyOn(fs, "renameSync")
        .mockImplementation((from: PathLike, to: PathLike) => {
          if (from === seedDir) {
            throw Object.assign(
              new Error("EPERM: operation not permitted, rename"),
              { code: "EPERM" },
            );
          }
          return realRename(from, to);
        });
      const svc = new DrizzleService();
      try {
        await expect(svc.onModuleInit()).resolves.toBeUndefined();
        const parent = dirname(seedDir);
        const freshDirs = readdirSync(parent).filter((entry) =>
          entry.startsWith(`${basename(seedDir)}-fresh-`),
        );
        expect(freshDirs.length).toBe(1);
      } finally {
        await svc.onModuleDestroy().catch(() => undefined);
        renameSpy.mockRestore();
      }
    });
  });
});
