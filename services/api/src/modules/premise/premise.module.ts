import { Module } from "@nestjs/common";
import { AiProviderModule } from "@/modules/ai-provider/ai-provider.module";
import { ConsultationRecordsRepository } from "@/dao/repositories/consultation-records.repository";
import { PremiseConsultController } from "./premise-consult.controller";
import { PremiseConsultService } from "./premise-consult.service";
import { PremiseReviewController } from "./premise-review.controller";
import { PremiseReviewService } from "./premise-review.service";
import { PremiseLlmVerifier } from "./premise-llm-verifier";

@Module({
  imports: [AiProviderModule],
  controllers: [PremiseReviewController, PremiseConsultController],
  providers: [
    PremiseReviewService,
    PremiseConsultService,
    PremiseLlmVerifier,
    ConsultationRecordsRepository,
  ],
  exports: [PremiseReviewService],
})
export class PremiseModule {}
