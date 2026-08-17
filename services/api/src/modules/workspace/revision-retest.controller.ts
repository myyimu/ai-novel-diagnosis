import { Body, Controller, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import { RevisionRetestDto } from "./dto/revision-retest.dto";
import { RevisionRetestService } from "./revision-retest.service";

@ApiTags("analysis")
@Controller("analysis/workspace/revision-sessions")
export class RevisionRetestController {
  constructor(private readonly retestService: RevisionRetestService) {}

  @Post(":sessionId/retest")
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary:
      "Run the pending revision retest server-side and update the session in place",
  })
  runRetest(
    @Param("sessionId") sessionId: string,
    @Body() body: RevisionRetestDto,
  ) {
    return this.retestService.runRetest(sessionId, body);
  }
}
