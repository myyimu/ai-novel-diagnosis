import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import * as configurations from "@/core/config/configuration";
import { HttpExceptionFilter } from "@/core/filters/http-exception.filter";
import { LoggingInterceptor } from "@/core/interceptors/logging.interceptor";
import { MetricsInterceptor } from "@/core/interceptors/metrics.interceptor";
import { ResponseInterceptor } from "@/core/interceptors/response.interceptor";
import { AuthModule } from "@/modules/auth/auth.module";
import { CommonModule } from "@/modules/common/common.module";
import { AnalysisModule } from "@/modules/analysis/analysis.module";
import { BookModule } from "@/modules/book/book.module";
import { HealthModule } from "@/modules/health/health.module";
import { LibraryModule } from "@/modules/library/library.module";
import { MetricsModule } from "@/modules/metrics/metrics.module";
import { UserModule } from "@/modules/user/user.module";
import { WorkspaceModule } from "@/modules/workspace/workspace.module";
import { DrizzleModule } from "@/service/drizzle/drizzle.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      load: Object.values(configurations),
    }),
    // 全局速率限制：防暴力破解 / 费用滥用（触发 LLM 调用的端点）。
    // 本地单用户默认较宽松（120 次/分钟）；网络部署时可通过
    // THROTTLE_TTL / THROTTLE_LIMIT 收紧。
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>("throttler.ttlMs", 60_000),
          limit: config.get<number>("throttler.limit", 120),
        },
      ],
    }),
    PrometheusModule.register({
      path: "/metrics",
      defaultLabels: {
        app: "nest-app",
      },
    }),
    DrizzleModule,
    HealthModule,
    MetricsModule,
    AuthModule,
    CommonModule,
    AnalysisModule,
    UserModule,
    WorkspaceModule,
    LibraryModule,
    BookModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
