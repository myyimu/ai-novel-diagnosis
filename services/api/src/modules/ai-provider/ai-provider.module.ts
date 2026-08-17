import { Module } from "@nestjs/common";
import { ModelUsageRepository } from "@/dao/repositories/model-usage.repository";
import { ModelProviderService } from "./model-provider.service";

@Module({
  providers: [ModelUsageRepository, ModelProviderService],
  exports: [ModelProviderService],
})
export class AiProviderModule {}
