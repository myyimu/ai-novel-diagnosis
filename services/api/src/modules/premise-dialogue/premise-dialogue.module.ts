import { Module } from "@nestjs/common";
import { PremiseDialogueRepository } from "@/dao/repositories/premise-dialogue.repository";
import { AiProviderModule } from "@/modules/ai-provider/ai-provider.module";
import { PremiseDialogueController } from "./premise-dialogue.controller";
import { PremiseDialogueTurnsController } from "./premise-dialogue-turns.controller";
import { PremiseDialogueService } from "./premise-dialogue.service";

@Module({
  imports: [AiProviderModule],
  controllers: [PremiseDialogueController, PremiseDialogueTurnsController],
  providers: [PremiseDialogueService, PremiseDialogueRepository],
})
export class PremiseDialogueModule {}
