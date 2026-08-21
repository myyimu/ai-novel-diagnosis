import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

export class StartPremiseDialogueDto {
  @ApiProperty({ description: "Workspace project the dialogue belongs to." })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  projectId!: string;

  @ApiProperty({
    description:
      "The author's raw premise (same text submitted to premise-review).",
  })
  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  premiseText!: string;

  @ApiPropertyOptional({ description: "Genre hint carried from the review." })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  genre?: string;

  @ApiProperty({
    description:
      "The premise-review result this dialogue anchors to (must carry reviewId, layers and the contract fields).",
  })
  @IsObject()
  review!: Record<string, unknown>;

  @ApiPropertyOptional({ type: ProviderConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}

export class AnswerPremiseDialogueDto {
  @ApiProperty({
    description: "The author's free-text answer to the current question.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  answer!: string;

  @ApiPropertyOptional({ type: ProviderConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}

export class JudgePremiseDialogueDto {
  @ApiPropertyOptional({ type: ProviderConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}

export class NextPremiseDialogueDto {
  @ApiPropertyOptional({ type: ProviderConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}

export class SubmitPremiseDialogueContractDto {
  @ApiProperty({ description: "一句话概述这个故事承诺了什么（作者亲笔）。" })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  premiseSummary!: string;

  @ApiProperty({ description: "核心冲突：欲望与阻力的对撞（作者亲笔）。" })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  coreConflict!: string;

  @ApiProperty({ description: "主角欲望（作者亲笔）。" })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  protagonistDesire!: string;

  @ApiProperty({ description: "对立阻力（作者亲笔）。" })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  opposingForce!: string;

  @ApiProperty({ description: "不可替代性测试（作者亲笔）。" })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  irreducibilityTest!: string;

  @ApiProperty({ description: "读者钩子问题（作者亲笔）。" })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  readerHookQuestion!: string;

  @ApiPropertyOptional({
    description:
      "Opt in to the optional CONTRACT-REVIEW model call. Default false (no extra model cost).",
  })
  @IsOptional()
  @IsBoolean()
  requestReview?: boolean;

  @ApiPropertyOptional({ type: ProviderConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}
