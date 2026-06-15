import { Module } from "@nestjs/common";
import { AnalysisController } from "./analysis.controller";
import { AnalysisPersistenceRepository } from "./analysis-persistence.repository";
import { AnalysisService } from "./analysis.service";
import { BookAnalysisJobService } from "./book-analysis-job.service";
import { BookUploadService } from "./book-upload.service";
import { ModelProviderService } from "./model-provider.service";
import { TextPreprocessorService } from "./text-preprocessor.service";

@Module({
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    AnalysisPersistenceRepository,
    BookAnalysisJobService,
    BookUploadService,
    ModelProviderService,
    TextPreprocessorService,
  ],
})
export class AnalysisModule {}
