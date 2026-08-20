import { Body, Controller, Get, HttpCode, Param, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import { UpdateDivergenceNoteDto } from "./dto/consultation-assets.dto";
import { WorkspaceService } from "./workspace.service";

@ApiTags("analysis")
@Controller("analysis/workspace")
export class ConsultationAssetsController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get("premise-consults/:projectId")
  @Public()
  @ApiOperation({
    summary: "List a project's persisted premise consultations (newest first)",
  })
  listPremiseConsults(@Param("projectId") projectId: string) {
    return this.workspaceService.listPremiseConsults(projectId);
  }

  @Get("report-divergences/:projectId")
  @Public()
  @ApiOperation({
    summary:
      "List a project's persisted report-divergence detections (newest first)",
  })
  listReportDivergences(@Param("projectId") projectId: string) {
    return this.workspaceService.listReportDivergences(projectId);
  }

  @Patch("report-divergences/:recordId/note")
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary: "Persist the author's adjudication note on one divergence record",
  })
  updateDivergenceNote(
    @Param("recordId") recordId: string,
    @Body() body: UpdateDivergenceNoteDto,
  ) {
    return this.workspaceService.updateReportDivergenceNote(recordId, body);
  }
}
