import { Module } from "@nestjs/common";
import { BookModule } from "@/modules/book/book.module";
import { AnalysisModule } from "@/modules/analysis/analysis.module";
import { WorkspaceAssetsRepository } from "@/dao/repositories/workspace-assets.repository";
import { ConsultationRecordsRepository } from "@/dao/repositories/consultation-records.repository";
import { WorkspaceController } from "./workspace.controller";
import { PremiseAssetsController } from "./premise-assets.controller";
import { ConsultationAssetsController } from "./consultation-assets.controller";
import { RevisionRetestController } from "./revision-retest.controller";
import { RevisionRetestService } from "./revision-retest.service";
import { WorkspaceService } from "./workspace.service";

@Module({
  imports: [BookModule, AnalysisModule],
  controllers: [
    WorkspaceController,
    PremiseAssetsController,
    ConsultationAssetsController,
    RevisionRetestController,
  ],
  providers: [
    WorkspaceAssetsRepository,
    ConsultationRecordsRepository,
    WorkspaceService,
    RevisionRetestService,
  ],
})
export class WorkspaceModule {}
