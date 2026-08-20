import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import { ReportDivergenceDto } from "./dto/report-divergence.dto";
import { ReportDivergenceService } from "./report-divergence.service";

@ApiTags("report-divergence")
@Controller("analysis")
export class ReportDivergenceController {
	constructor(private readonly reportDivergenceService: ReportDivergenceService) {}

	@Post("report-divergence")
	@HttpCode(200)
	@Public()
	@ApiOperation({
		summary:
			"Divergence detection (报告会诊) between quick-review and story-audit reports — contradictions surfaced, never adjudicated",
	})
	@ApiResponse({ status: 200, description: "Anchored divergence points for the author to adjudicate" })
	detect(@Body() body: ReportDivergenceDto) {
		return this.reportDivergenceService.detect(body);
	}
}
