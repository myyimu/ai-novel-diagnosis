import { provide } from "@inversifyjs/binding-decorators";
import { inject, injectable } from "inversify";
import Window from "../core/window";
import { APP_URL } from "../constants";
import ElectronStore from "../vendor/ElectronStore";

// 主窗口：始终加载本地 Next 服务
// - dev：由 `one dev` 在 3000 提供（HMR）
// - 打包：由 SidecarSupervisor 拉起的 Next standalone 在 3000 提供
// 关闭前把窗口大小/位置存到 ElectronStore，下次启动恢复
@injectable()
@provide()
export default class MainWindow extends Window {
  constructor(
    @inject(ElectronStore)
    private readonly store: ElectronStore,
  ) {
    const bounds = store.get("mainBounds");
    super({
      width: bounds?.width ?? 1280,
      height: bounds?.height ?? 800,
      x: bounds?.x,
      y: bounds?.y,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.url = APP_URL;
  }

  showStartup(): void {
    this.loadStatusPage(
      "正在启动本地服务",
      "正在启动 API 与 Web 服务，请稍候。",
    );
  }

  showStartupError(message: string, logPath: string): void {
    this.loadStatusPage("启动失败", message, logPath);
  }

  loadApp(): void {
    this.url = APP_URL;
    if (!this.window) {
      this.init();
      return;
    }
    void this.window.loadURL(APP_URL);
    this.window.show();
  }

  init(): void {
    if (this.window) {
      this.window.show();
      return;
    }
    const win = this.create();
    this.window = win;
    // 注意：基类 windowClose 先执行并把 this.window 置 null，
    // 因此这里必须闭包捕获 win 引用，否则 bounds 永远不会保存。
    win.on("close", () => {
      this.store.set("mainBounds", win.getBounds());
    });
  }

  private loadStatusPage(
    title: string,
    message: string,
    logPath?: string,
  ): void {
    this.url = this.statusPageUrl(title, message, logPath);
    if (!this.window) {
      const win = this.create();
      this.window = win;
      win.show();
      // 闭包捕获 win：基类 windowClose 会先置空 this.window
      win.on("close", () => {
        this.store.set("mainBounds", win.getBounds());
      });
      return;
    }
    void this.window.loadURL(this.url);
    this.window.show();
  }

  private statusPageUrl(
    title: string,
    message: string,
    logPath?: string,
  ): string {
    const escapedTitle = this.escapeHtml(title);
    const escapedMessage = this.escapeHtml(message);
    const escapedLogPath = logPath ? this.escapeHtml(logPath) : "";
    const logBlock = escapedLogPath
      ? `<p class="label">日志文件</p><pre>${escapedLogPath}</pre>`
      : "";
    const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapedTitle}</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #101114;
      color: #f4f0e8;
      font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
    }
    main {
      width: min(640px, calc(100vw - 48px));
      padding: 28px;
      border: 1px solid rgba(244, 240, 232, 0.16);
      background: #181a1f;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 22px;
      font-weight: 650;
    }
    p {
      margin: 0;
      color: #c8c0b4;
      line-height: 1.7;
      font-size: 14px;
    }
    .label {
      margin-top: 22px;
      color: #f4f0e8;
      font-size: 13px;
      font-weight: 650;
    }
    pre {
      margin: 8px 0 0;
      padding: 12px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
      color: #d7e9ff;
      background: #0b0c0f;
      border: 1px solid rgba(244, 240, 232, 0.12);
      font-size: 12px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <main>
    <h1>${escapedTitle}</h1>
    <p>${escapedMessage}</p>
    ${logBlock}
  </main>
</body>
</html>`;
    return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}
