import { app, BrowserWindow } from "electron";
import { provide } from "@inversifyjs/binding-decorators";
import { inject, injectable } from "inversify";
import ElectronLogger from "./vendor/ElectronLogger";
import MainWindow from "./windows/main.window";
import SidecarSupervisor from "./services/sidecar-supervisor";

// 编排器：定义启动顺序
// 1. sidecar 启动（打包模式：API → /health → Next → 就绪；dev 模式跳过）
// 2. 平台事件（activate / second-instance）
// 3. 主窗口创建（加载 http://127.0.0.1:3000）
@injectable()
@provide()
export default class ElectronApp {
  constructor(
    @inject(MainWindow) private readonly mainWindow: MainWindow,
    @inject(SidecarSupervisor) private readonly supervisor: SidecarSupervisor,
    @inject(ElectronLogger) private readonly logger: ElectronLogger,
  ) {}

  async init(): Promise<void> {
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) this.mainWindow.init();
    });

    this.mainWindow.showStartup();

    try {
      await this.supervisor.start();
      this.mainWindow.loadApp();
      this.logger.info("app ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error("app startup failed", err);
      this.mainWindow.showStartupError(
        `本地服务未能启动：${message}`,
        this.logger.logPath,
      );
    }
  }

  // 第二实例启动时把焦点还给已有窗口
  secondInstance = (): void => {
    this.mainWindow.init();
  };

  // 关停 sidecar（窗口关闭 / 退出前调用）
  shutdown = (): void => {
    this.supervisor.stop();
  };
}
