import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import { StartPremiseDialogueDto } from "./dto/premise-dialogue.dto";
import { PremiseDialogueService } from "./premise-dialogue.service";

@ApiTags("premise-dialogue")
@Controller("analysis/workspace/premise-dialogue")
export class PremiseDialogueController {
  constructor(private readonly dialogue: PremiseDialogueService) {}

  @Post()
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary:
      "Start a guided premise dialogue session (立项引导对话) and generate the first ask",
  })
  @ApiResponse({
    status: 200,
    description: "The created session with its first question",
  })
  start(@Body() body: StartPremiseDialogueDto) {
    return this.dialogue.startSession(body);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Fetch one dialogue session with all turns" })
  @ApiResponse({ status: 200, description: "The dialogue session record" })
  get(@Param("id") id: string) {
    return this.dialogue.getSession(id);
  }
}
