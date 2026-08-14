import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { initLogger, setLogLevel } from "./shared/utils/logger";

async function bootstrap() {
  // Create the application instance
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });

  const logger = new Logger("Bootstrap");
  const configService = app.get(ConfigService);
  const port = configService.get<number>("server.port") || 3001;
  const host = configService.get<string>("server.host") || "127.0.0.1";
  const isProduction = configService.get<boolean>("server.isProduction");

  // Initialize logger with configuration (before any logging)
  initLogger({
    logsDir: configService.get<string>("logging.logsDir"),
    isProduction,
  });
  setLogLevel(isProduction ?? false);

  app.use(json({ limit: "10mb" }));
  app.use(urlencoded({ extended: true, limit: "10mb" }));

  // Enable CORS with custom configuration
  const allowedOrigins =
    configService.get<string[]>("server.allowedOrigins") || [];
  if (!allowedOrigins?.length) {
    if (isProduction) {
      throw new Error("ALLOWED_ORIGINS must be set in production.");
    }

    logger.warn(
      "ALLOWED_ORIGINS not set, CORS will allow all origins. Do NOT use in production!",
    );
  }
  app.enableCors({
    origin: allowedOrigins?.length ? allowedOrigins : "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: Boolean(allowedOrigins?.length),
  });

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // required for Swagger UI
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
    }),
  );

  // Set global prefix for all routes except /metrics and /health
  app.setGlobalPrefix("api/v1", {
    exclude: ["/metrics", "/health"],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("AI网文诊断台 API")
    .setDescription(
      "Local-first API for AI web-novel critique, reference analysis, rubric scoring, and BYOK model providers.",
    )
    .setVersion("0.1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth", // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag("auth", "Authentication endpoints")
    .addTag("analysis", "Novel critique and rubric preview endpoints")
    .addTag("common", "Common endpoints")
    .addTag("users", "User management endpoints")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Enable graceful shutdown hooks (triggers onModuleDestroy, onApplicationShutdown, etc.)
  app.enableShutdownHooks();

  // Startup security warning
  const accessToken = configService.get<string>("app.accessToken");
  if (host === "0.0.0.0" && !accessToken && !isProduction) {
    logger.warn(
      "SECURITY WARNING: API bound to 0.0.0.0 without authentication (APP_ACCESS_TOKEN not set). Do not expose to network.",
    );
  }

  // Desktop sidecars keep the default loopback host. Docker explicitly sets
  // HOST=0.0.0.0 so its Web container can reach the API over the private
  // Compose network.
  await app.listen(port, host);
  logger.log(`Application is running on: http://${host}:${port}`);
}

bootstrap().catch((err) => {
  new Logger("Bootstrap").error("Failed to start application", err);
  process.exit(1);
});
