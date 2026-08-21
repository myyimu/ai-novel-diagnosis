import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import { ReportQaDto } from "./dto/report-qa.dto";
import { ReportQaService } from "./report-qa.service";

@ApiTags("report-qa")
@Controller("analysis")
export class ReportQaController {
  constructor(private readonly reportQaService: ReportQaService) {}

  @Post("report-qa")
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary: "Anchored Q&A over a diagnosis report supplied by the client",
  })
  @ApiResponse({ status: 200, description: "Answer with anchored citations" })
  answer(@Body() body: ReportQaDto) {
    return this.reportQaService.answer(body);
  }
}
