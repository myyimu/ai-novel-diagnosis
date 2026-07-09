import "reflect-metadata";
import { buildProviderModule } from "@inversifyjs/binding-decorators";
import { app } from "electron";
import { Container } from "inversify";
import ElectronApp from "./app";

// 1. 容器：所有类默认单例
const container = new Container({ defaultScope: "Singleton" });

// 2. 单实例锁：重复启动时把焦点交给已有实例
const gotTheLock = app.requestSingleInstanceLock();

const start = async (): Promise<void> => {
  if (!gotTheLock) {
    app.quit();
    return;
  }

  await app.whenReady();

  // 3. 加载所有 @provide 装饰的类到容器
  await container.load(buildProviderModule());

  // 4. 取编排器并启动（会先拉起 sidecar，再开窗口）
  const application = container.get(ElectronApp);
  await application.init();

  // 5. Windows 惯例：关掉所有窗口 → 先关停 sidecar，再退出
  app.on("window-all-closed", () => {
    application.shutdown();
    app.quit();
  });
  app.on("second-instance", application.secondInstance);
};

void start();
