import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import { PremiseReviewDto } from "./dto/premise-review.dto";
import { PremiseReviewService } from "./premise-review.service";

@ApiTags("premise")
@Controller("analysis")
export class PremiseReviewController {
  constructor(private readonly premiseReviewService: PremiseReviewService) {}

  @Post("premise-review")
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary: "Pre-writing premise review (立项审稿) for a raw story idea",
  })
  @ApiResponse({ status: 200, description: "Structured premise review" })
  review(@Body() body: PremiseReviewDto) {
    return this.premiseReviewService.review(body);
  }
}
