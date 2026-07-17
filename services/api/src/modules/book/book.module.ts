import { Module } from "@nestjs/common";
import { AiProviderModule } from "@/modules/ai-provider/ai-provider.module";
import { StoryAuditModule } from "@/modules/story-audit/story-audit.module";
import { AnalysisPersistenceRepository } from "./analysis-persistence.repository";
import { BookAnalysisJobService } from "./book-analysis-job.service";
import { BookAnalysisService } from "./book-analysis.service";
import { BookController } from "./book.controller";
import { BookExportService } from "./book-export.service";
import { BookUploadService } from "./book-upload.service";
import { TextPreprocessorService } from "./text-preprocessor.service";

@Module({
  imports: [AiProviderModule, StoryAuditModule],
  controllers: [BookController],
  providers: [
    AnalysisPersistenceRepository,
    BookAnalysisJobService,
    BookAnalysisService,
    BookExportService,
    BookUploadService,
    TextPreprocessorService,
  ],
  // Exported for LibraryModule (distillBookSkill needs BookAnalysisService;
  // research-library aggregations need AnalysisPersistenceRepository).
  exports: [AnalysisPersistenceRepository, BookAnalysisService],
})
export class BookModule {}
