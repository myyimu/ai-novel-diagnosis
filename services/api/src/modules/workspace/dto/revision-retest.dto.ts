import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

export class RevisionRetestDto {
  @ApiPropertyOptional({
    description:
      "Provider config for the retest diagnosis. If omitted, the API uses the configured shared model path.",
    type: ProviderConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;

  @ApiPropertyOptional({
    description:
      "Current chapter text when the editor draft has not been saved as a version yet (50-30000 chars). A hash match against an existing version reuses that version instead of creating a new one.",
    example: "主角被退婚后拿到旧案信物，当夜翻出三年前的卷宗……",
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(30000)
  toVersionText?: string;

  @ApiPropertyOptional({
    description:
      "The user's current diagnostic focus for the retest, separate from the protected core selling point.",
    example: "重点检查改稿后章末钩子是否有代价。",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  diagnosticFocus?: string;

  @ApiPropertyOptional({
    description:
      "The core appeal the author wants protected during the retest.",
    example: "隐世强者拒绝权力，用不争制造反差爽感。",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coreSellingPoint?: string;

  @ApiPropertyOptional({
    description:
      "Mechanisms that should not be removed before judging whether they work.",
    example: "倒计时、拒绝权势、乡土日常反差。",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mustKeepMechanisms?: string;

  @ApiPropertyOptional({
    description:
      "Target reader pleasures used to avoid one-size-fits-all diagnosis.",
    example: "读者想看别人误判主角、权力系统被他的拒绝带偏。",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  targetReaderPleasures?: string;
}
