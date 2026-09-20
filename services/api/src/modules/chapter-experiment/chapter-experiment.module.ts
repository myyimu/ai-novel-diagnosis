import { Module } from "@nestjs/common";
import { AiProviderModule } from "@/modules/ai-provider/ai-provider.module";
import { ChapterExperimentsRepository } from "@/dao/repositories/chapter-experiments.repository";
import { ChapterExperimentController } from "./chapter-experiment.controller";
import { ChapterExperimentService } from "./chapter-experiment.service";

@Module({
  imports: [AiProviderModule],
  controllers: [ChapterExperimentController],
  providers: [ChapterExperimentService, ChapterExperimentsRepository],
})
export class ChapterExperimentModule {}
