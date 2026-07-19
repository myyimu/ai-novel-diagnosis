import { Module } from "@nestjs/common";
import { BookModule } from "@/modules/book/book.module";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceAssetsRepository } from "./workspace-assets.repository";

@Module({
  imports: [BookModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceAssetsRepository],
})
export class WorkspaceModule {}
