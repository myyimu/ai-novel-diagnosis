import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import {
  ModelUsageEventsQueryDto,
  ModelUsageSummaryQueryDto,
} from "./dto/model-usage-query.dto";
import { ModelUsageService } from "./model-usage.service";

@ApiTags("analysis")
@Controller("analysis/model-usage")
export class ModelUsageController {
  constructor(private readonly modelUsage: ModelUsageService) {}

  @Get("events")
  @Public()
  @ApiOperation({ summary: "List recent model usage events, newest first" })
  listEvents(@Query() query: ModelUsageEventsQueryDto) {
    return this.modelUsage.listEvents(query);
  }

  @Get("summary")
  @Public()
  @ApiOperation({ summary: "Aggregate model usage totals since a timestamp" })
  summarize(@Query() query: ModelUsageSummaryQueryDto) {
    return this.modelUsage.summarize(query.since);
  }
}
