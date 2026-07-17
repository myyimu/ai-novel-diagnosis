import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import { ReviewStoryAuditFindingDto } from "./dto/review-story-audit-finding.dto";
import { StoryAuditReviewService } from "./story-audit-review.service";

@ApiTags("analysis")
@Controller("analysis/story-audit")
export class StoryAuditReviewController {
  constructor(private readonly service: StoryAuditReviewService) {}

  @Get("projects/:projectId/reviews")
  @Public()
  @ApiOperation({ summary: "List persisted author reviews for a project" })
  listReviews(
    @Param("projectId") projectId: string,
    @Query("bookJobId") bookJobId?: string,
  ) {
    return this.service.listReviews(projectId, bookJobId);
  }

  @Put("projects/:projectId/findings/:findingId/review")
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary: "Upsert an author review for a story audit finding",
  })
  upsertReview(
    @Param("projectId") projectId: string,
    @Param("findingId") findingId: string,
    @Body() body: ReviewStoryAuditFindingDto,
  ) {
    return this.service.upsertReview(projectId, findingId, body);
  }
}
