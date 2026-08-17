import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { HealthService } from "./health.service";

// /health 被 Electron sidecar 启动期以 500ms 间隔轮询（=120 次/分钟，
// 恰好等于全局限速阈值），必须豁免速率限制。
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("health")
  getHealth() {
    return this.healthService.getHealthStatus();
  }
}
