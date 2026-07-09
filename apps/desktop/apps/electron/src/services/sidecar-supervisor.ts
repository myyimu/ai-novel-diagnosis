import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { app, dialog } from "electron";
import { provide } from "@inversifyjs/binding-decorators";
import { inject, injectable } from "inversify";
import ElectronLogger from "../vendor/ElectronLogger";
import ElectronStore from "../vendor/ElectronStore";
import { API_HEALTH_URL, APP_URL } from "../constants";
import { apiDir, apiEntry, nodeExe, webDir, webEntry } from "./paths";
import { buildApiEnv, buildWebEnv } from "./env";

interface ManagedChild {
  proc: ChildProcess | null;
  name: string;
}

// 负责打包模式下两个本地子进程的生命周期：
// API(127.0.0.1:3001) → 等 /health → Next standalone(127.0.0.1:3000) → 等就绪
// dev 模式下 start() 直接返回（窗口加载 one dev 的 3000）。
@injectable()
@provide()
export default class SidecarSupervisor {
  private api: ManagedChild | null = null;
  private web: ManagedChild | null = null;

  constructor(
    @inject(ElectronLogger) private readonly logger: ElectronLogger,
    @inject(ElectronStore) private readonly store: ElectronStore,
  ) {}

  async start(): Promise<void> {
    if (!app.isPackaged) {
      // dev：由 `one dev` 提供服务，不 spawn
      this.logger.info("dev mode: skipping sidecar spawn");
      return;
    }

    try {
      const userData = app.getPath("userData");
      const jwtSecret = this.ensureJwtSecret();

      this.logger.info("starting API sidecar on 127.0.0.1:3001");
      this.api = this.spawnChild("api", nodeExe(), [apiEntry()], apiDir(), buildApiEnv({ userData, jwtSecret }));
      await this.waitForHttp(API_HEALTH_URL, 60_000, "API"); // 首次启动 PGlite 建表较慢

      this.logger.info("starting Next sidecar on 127.0.0.1:3000");
      this.web = this.spawnChild("web", nodeExe(), [webEntry()], webDir(), buildWebEnv());
      await this.waitForHttp(APP_URL, 30_000, "Next");
    } catch (err) {
      this.logger.error("sidecar startup failed", err);
      void dialog.showMessageBox({
        type: "error",
        title: "启动失败",
        message: "本地服务启动失败",
        detail: String(err instanceof Error ? err.message : err),
      });
      throw err;
    }
  }

  // 同步关停：Windows 用 taskkill /T /F 连子进程一起回收（Next worker、PGlite worker）
  stop(): void {
    this.kill(this.api);
    this.kill(this.web);
    this.api = null;
    this.web = null;
  }

  private spawnChild(
    name: string,
    exe: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
  ): ManagedChild {
    this.logger.info(`spawn ${name}: ${exe} ${args.join(" ")} (cwd=${cwd})`);
    const proc = spawn(exe, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    proc.stdout?.on("data", (d: Buffer) => this.logger.info(`[${name}] ${d.toString().trimEnd()}`));
    proc.stderr?.on("data", (d: Buffer) => this.logger.error(`[${name}] ${d.toString().trimEnd()}`));
    proc.on("exit", (code, signal) => {
      this.logger.warn(`${name} exited code=${code} signal=${signal}`);
    });
    return { proc, name };
  }

  private async waitForHttp(url: string, timeoutMs: number, label: string): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(url, { method: "GET" });
        // 200 或 404 都说明服务已起来（有的根路径返回 404）
        if (res.status < 500) {
          this.logger.info(`${label} ready (HTTP ${res.status})`);
          return;
        }
      } catch {
        // 尚未就绪，继续轮询
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`${label} 未在 ${timeoutMs}ms 内就绪（${url}）`);
  }

  private kill(child: ManagedChild | null): void {
    const proc = child?.proc;
    if (!proc || proc.pid == null) return;
    try {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], {
          shell: true,
          stdio: "ignore",
        });
      } else {
        proc.kill("SIGTERM");
      }
      this.logger.info(`stopped ${child!.name} (pid=${proc.pid})`);
    } catch (err) {
      this.logger.error(`failed to stop ${child!.name}`, err);
    }
  }

  // 稳定的 JWT 密钥：首次随机生成并存入 ElectronStore，之后复用。
  // 否则每次重启都会让所有 token 失效。
  private ensureJwtSecret(): string {
    let secret = this.store.get("jwtSecret");
    if (!secret) {
      secret = randomBytes(32).toString("hex");
      this.store.set("jwtSecret", secret);
    }
    return secret;
  }
}
