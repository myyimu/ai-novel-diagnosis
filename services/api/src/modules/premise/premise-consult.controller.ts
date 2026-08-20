import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import { PremiseConsultDto } from "./dto/premise-consult.dto";
import { PremiseConsultService } from "./premise-consult.service";

@ApiTags("premise")
@Controller("analysis")
export class PremiseConsultController {
  constructor(private readonly premiseConsultService: PremiseConsultService) {}

  @Post("premise-consult")
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary:
      "Blind second-reviewer premise consultation (立项会诊) — verdicts compared in code, never merged",
  })
  @ApiResponse({ status: 200, description: "Side-by-side consultation result" })
  consult(@Body() body: PremiseConsultDto) {
    return this.premiseConsultService.consult(body);
  }
}
