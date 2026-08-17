import { Module } from "@nestjs/common";
import { ModelUsageRepository } from "@/dao/repositories/model-usage.repository";
import { ModelUsageController } from "./model-usage.controller";
import { ModelUsageService } from "./model-usage.service";

@Module({
  controllers: [ModelUsageController],
  providers: [ModelUsageRepository, ModelUsageService],
})
export class ModelUsageModule {}
