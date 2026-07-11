import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";

@ApiTags("app")
@Controller()
export class AppController {
  @ApiOperation({ summary: "Get API information" })
  @ApiResponse({
    status: 200,
    description: "API information retrieved successfully",
    schema: {
      type: "object",
      properties: {
        code: { type: "number", example: 0 },
        message: { type: "string", example: "success" },
        data: {
          type: "object",
          properties: {
            name: { type: "string", example: "AI网文诊断台 API" },
            version: { type: "string", example: "0.1.0" },
            description: {
              type: "string",
              example:
                "Local API for AI web-novel diagnosis, full-book import, and workspace assets",
            },
            endpoints: {
              type: "object",
              properties: {
                auth: { type: "string", example: "/api/v1/auth" },
                common: { type: "string", example: "/api/v1/common" },
                health: { type: "string", example: "/health" },
              },
            },
          },
        },
      },
    },
  })
  @Public()
  @Get()
  getRoot() {
    return {
      name: "AI网文诊断台 API",
      version: "0.1.0",
      description:
        "Local API for AI web-novel diagnosis, full-book import, and workspace assets",
      endpoints: {
        auth: "/api/v1/auth",
        common: "/api/v1/common",
        health: "/health",
      },
    };
  }
}
