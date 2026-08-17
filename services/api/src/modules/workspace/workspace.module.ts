import { Module } from "@nestjs/common";
import { BookModule } from "@/modules/book/book.module";
import { AnalysisModule } from "@/modules/analysis/analysis.module";
import { WorkspaceAssetsRepository } from "@/dao/repositories/workspace-assets.repository";
import { WorkspaceController } from "./workspace.controller";
import { RevisionRetestController } from "./revision-retest.controller";
import { RevisionRetestService } from "./revision-retest.service";
import { WorkspaceService } from "./workspace.service";

@Module({
  imports: [BookModule, AnalysisModule],
  controllers: [WorkspaceController, RevisionRetestController],
  providers: [
    WorkspaceAssetsRepository,
    WorkspaceService,
    RevisionRetestService,
  ],
})
export class WorkspaceModule {}
