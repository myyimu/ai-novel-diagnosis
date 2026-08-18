import { Module } from "@nestjs/common";
import { AiProviderModule } from "@/modules/ai-provider/ai-provider.module";
import { PremiseReviewController } from "./premise-review.controller";
import { PremiseReviewService } from "./premise-review.service";
import { PremiseLlmVerifier } from "./premise-llm-verifier";

@Module({
  imports: [AiProviderModule],
  controllers: [PremiseReviewController],
  providers: [PremiseReviewService, PremiseLlmVerifier],
  exports: [PremiseReviewService],
})
export class PremiseModule {}
