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

  init(): void {
    if (this.window) {
      this.window.show();
      return;
    }
    this.window = this.create();
    this.window.on("close", () => {
      if (!this.window) return;
      this.store.set("mainBounds", this.window.getBounds());
    });
  }
}
