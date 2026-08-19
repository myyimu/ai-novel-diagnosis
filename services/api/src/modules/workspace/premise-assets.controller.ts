import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import {
  UpsertPremiseEngineCardDto,
  UpsertPremiseFindingReviewDto,
} from "./dto/premise-assets.dto";
import { WorkspaceService } from "./workspace.service";

@ApiTags("analysis")
@Controller("analysis/workspace/premise")
export class PremiseAssetsController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get("engine-card/:projectId")
  @Public()
  @ApiOperation({ summary: "Read the persisted engine card of one book" })
  async readEngineCard(@Param("projectId") projectId: string) {
    const engineCard = await this.workspaceService.readEngineCard(projectId);
    return { engineCard };
  }

  @Post("engine-card")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Create or update a book's engine card" })
  upsertEngineCard(@Body() body: UpsertPremiseEngineCardDto) {
    return this.workspaceService.upsertEngineCard(body);
  }

  @Get("reviews/:projectId")
  @Public()
  @ApiOperation({
    summary: "Read persisted author decisions on premise cliché findings",
  })
  listPremiseFindingReviews(@Param("projectId") projectId: string) {
    return this.workspaceService.listPremiseFindingReviews({ projectId });
  }

  @Post("reviews")
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary: "Persist one author decision on a premise cliché finding",
  })
  upsertPremiseFindingReview(@Body() body: UpsertPremiseFindingReviewDto) {
    return this.workspaceService.upsertPremiseFindingReview(body);
  }
}
