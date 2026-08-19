import { Body, Controller, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import {
  AnswerPremiseDialogueDto,
  JudgePremiseDialogueDto,
  NextPremiseDialogueDto,
  SubmitPremiseDialogueContractDto,
} from "./dto/premise-dialogue.dto";
import { PremiseDialogueService } from "./premise-dialogue.service";

@ApiTags("premise-dialogue")
@Controller("analysis/workspace/premise-dialogue")
export class PremiseDialogueTurnsController {
  constructor(private readonly dialogue: PremiseDialogueService) {}

  @Post(":id/answer")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Answer the current question; the judgment runs server-side" })
  answer(@Param("id") id: string, @Body() body: AnswerPremiseDialogueDto) {
    return this.dialogue.answerTurn(id, body);
  }

  @Post(":id/judge")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Retry the judgment after a retryable model failure" })
  judge(@Param("id") id: string, @Body() body: JudgePremiseDialogueDto) {
    return this.dialogue.retryJudge(id, body.provider);
  }

  @Post(":id/next")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Generate the next question (or collect) once the turn resolved" })
  next(@Param("id") id: string, @Body() body: NextPremiseDialogueDto) {
    return this.dialogue.next(id, body.provider);
  }

  @Post(":id/finish")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Author-initiated early collection before the round cap" })
  finish(@Param("id") id: string) {
    return this.dialogue.finish(id);
  }

  @Post(":id/contract")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Submit the author's hand-written six-field contract" })
  contract(@Param("id") id: string, @Body() body: SubmitPremiseDialogueContractDto) {
    return this.dialogue.submitContract(id, body);
  }
}
