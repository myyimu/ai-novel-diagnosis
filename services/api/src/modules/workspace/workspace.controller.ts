import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { type Response } from "express";
import { Public } from "@/core/decorators/public.decorators";
import { BookAnalysisService } from "@/modules/book/book-analysis.service";
import {
  UpdateRevisionNoteDto,
  UpsertStoryAuditFindingReviewDto,
  UpsertRevisionAssetsDto,
  UpsertWorkspaceProjectDto,
} from "./dto/workspace-assets.dto";
import { buildWorkspaceProjectMarkdown } from "./workspace-assets-export";
import { WorkspaceAssetsRepository } from "./workspace-assets.repository";
import type { StoryAuditResult } from "@ai-novel-diagnosis/ai-core";

@ApiTags("analysis")
@Controller("analysis/workspace")
export class WorkspaceController {
  constructor(
    private readonly workspaceAssets: WorkspaceAssetsRepository,
    private readonly bookAnalysis: BookAnalysisService,
  ) {}

  @Get("assets")
  @Public()
  @ApiOperation({
    summary:
      "Read persisted workspace projects, revisions, and methodology cards",
  })
  listWorkspaceAssets() {
    return this.workspaceAssets.listAssets();
  }

  @Post("projects")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Create or update a workspace project" })
  upsertWorkspaceProject(@Body() body: UpsertWorkspaceProjectDto) {
    return this.workspaceAssets.upsertProject(body.project);
  }

  @Post("revision-assets")
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary: "Persist one revision session and its methodology cards",
  })
  upsertRevisionAssets(@Body() body: UpsertRevisionAssetsDto) {
    return this.workspaceAssets.upsertRevisionAssets({
      project: body.project,
      session: body.session,
      revisionVersions: body.revisionVersions || [],
      methodologyCards: body.methodologyCards,
    });
  }

  @Patch("revision-sessions/:sessionId/note")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Persist a human note for a revision session" })
  updateRevisionNote(
    @Param("sessionId") sessionId: string,
    @Body() body: UpdateRevisionNoteDto,
  ) {
    return this.workspaceAssets.updateRevisionNote({
      sessionId,
      note: body.note,
      updatedAt: body.updatedAt,
    });
  }

  @Get("story-audit/reviews/:projectId")
  @Public()
  @ApiOperation({
    summary: "Read persisted human review states for story audit findings",
  })
  listStoryAuditFindingReviews(@Param("projectId") projectId: string) {
    return this.workspaceAssets.listStoryAuditFindingReviews({ projectId });
  }

  @Post("story-audit/reviews")
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary: "Persist one human review state for a story audit finding",
  })
  upsertStoryAuditFindingReview(
    @Body() body: UpsertStoryAuditFindingReviewDto,
  ) {
    return this.workspaceAssets.upsertStoryAuditFindingReview({
      projectId: body.projectId,
      auditId: body.auditId,
      findingId: body.findingId,
      reviewState: body.reviewState,
      note: body.note,
      updatedAt: body.updatedAt ?? new Date().toISOString(),
    });
  }

  @Get("projects/:projectId/export")
  @Public()
  @ApiOperation({ summary: "Export a persisted workspace project as Markdown" })
  async exportWorkspaceProject(
    @Param("projectId") projectId: string,
    @Res() response: Response,
  ) {
    const projectPackage =
      await this.workspaceAssets.readProjectPackage(projectId);
    const storyAudit = projectPackage.project.bookJobId
      ? ((
          (
            await this.bookAnalysis.getBookAnalysisJob(
              projectPackage.project.bookJobId,
              { includeResult: true },
            )
          ).result as { storyAudit?: StoryAuditResult } | null
        )?.storyAudit ?? null)
      : null;
    const storyAuditFindingReviews = storyAudit
      ? await this.workspaceAssets.listStoryAuditFindingReviews({
          projectId: projectPackage.project.id,
          auditId: storyAudit.auditId,
        })
      : [];
    const content = buildWorkspaceProjectMarkdown({
      ...projectPackage,
      storyAudit,
      storyAuditFindingReviews,
    });
    const filename = `ai-novel-diagnosis-${projectPackage.project.name}-${new Date()
      .toISOString()
      .slice(0, 10)}.md`;
    response.setHeader("content-type", "text/markdown;charset=utf-8");
    response.setHeader(
      "content-disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    response.send(content);
  }
}
