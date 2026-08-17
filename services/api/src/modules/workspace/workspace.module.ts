import { Module } from "@nestjs/common";
import { BookModule } from "@/modules/book/book.module";
import { WorkspaceAssetsRepository } from "@/dao/repositories/workspace-assets.repository";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";

@Module({
  imports: [BookModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceAssetsRepository, WorkspaceService],
})
export class WorkspaceModule {}
