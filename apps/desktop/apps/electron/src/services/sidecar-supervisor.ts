import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { app } from "electron";
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
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
}

// 负责打包模式下两个本地子进程的生命周期：
// API(127.0.0.1:3001) → 等 /health → Next standalone(127.0.0.1:3000) → 等就绪
// dev 模式下 start() 直接返回（窗口加载 one dev 的 3000）。
@injectable()
@provide()
export default class SidecarSupervisor {
  private api: ManagedChild | null = null;
  private web: ManagedChild | null = null;
  // 重入保护：start() 并发调用时复用同一次启动 Promise，
  // 避免快速连续 activate 事件拉起重复子进程 / 端口冲突。
  private starting: Promise<void> | null = null;
  // 取消信号：stop() 时中止 waitForHttp 轮询，防止关闭窗口后仍空转 60s。
  private startupAbort: AbortController | null = null;

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

    if (this.starting) {
      this.logger.warn("sidecar start() called while already starting — reusing in-flight startup");
      return this.starting;
    }

    this.startupAbort = new AbortController();
    this.starting = this.doStart(this.startupAbort.signal).finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  private async doStart(abort: AbortSignal): Promise<void> {
    try {
      const userData = app.getPath("userData");
      const jwtSecret = this.ensureJwtSecret();

      this.logger.info("starting API sidecar on 127.0.0.1:3001");
      this.api = this.spawnChild(
        "api",
        nodeExe(),
        [apiEntry()],
        apiDir(),
        buildApiEnv({ userData, jwtSecret }),
      );
      await this.waitForHttp(API_HEALTH_URL, 60_000, "API", this.api, abort); // 首次启动 PGlite 建表较慢

      this.logger.info("starting Next sidecar on 127.0.0.1:3000");
      const webRoot = webDir();
      this.web = this.spawnChild(
        "web",
        nodeExe(),
        [webEntry()],
        webRoot,
        buildWebEnv({ webRoot }),
      );
      await this.waitForHttp(APP_URL, 30_000, "Next", this.web, abort);
    } catch (err) {
      this.logger.error("sidecar startup failed", err);
      this.stop();
      throw err;
    }
  }

  // 同步关停：Windows 用 taskkill /T /F 连子进程一起回收（Next worker、PGlite worker）
  stop(): void {
    // 先中止启动期轮询，再杀子进程，最后清引用
    this.startupAbort?.abort();
    this.startupAbort = null;
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
    proc.stdout?.on("data", (d: Buffer) =>
      this.logger.info(`[${name}] ${d.toString().trimEnd()}`),
    );
    proc.stderr?.on("data", (d: Buffer) =>
      this.logger.error(`[${name}] ${d.toString().trimEnd()}`),
    );
    const child: ManagedChild = { proc, name, exitCode: null, signal: null };
    proc.on("exit", (code, signal) => {
      child.exitCode = code;
      child.signal = signal;
      this.logger.warn(`${name} exited code=${code} signal=${signal}`);
    });
    return child;
  }

  private async waitForHttp(
    url: string,
    timeoutMs: number,
    label: string,
    child: ManagedChild,
    abort: AbortSignal,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (abort.aborted) {
        throw new Error(`${label} 启动等待被中止（应用正在关闭）`);
      }
      if (child.exitCode !== null || child.signal !== null) {
        throw new Error(
          `${label} 子进程已退出 code=${child.exitCode} signal=${child.signal}`,
        );
      }
      try {
        const res = await fetch(url, { method: "GET", signal: abort });
        // 200 或 404 都说明服务已起来（有的根路径返回 404）
        if (res.status < 500) {
          this.logger.info(`${label} ready (HTTP ${res.status})`);
          return;
        }
      } catch (err) {
        if (abort.aborted || (err as Error)?.name === "AbortError") {
          throw new Error(`${label} 启动等待被中止（应用正在关闭）`, {
            cause: err,
          });
        }
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
