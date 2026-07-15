import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

class MethodologyEvidenceDto {
  @ApiProperty({
    description: "A short evidence quote already extracted by quick diagnosis.",
  })
  @IsString()
  @MaxLength(120)
  quote!: string;

  @ApiProperty({
    description: "Where the evidence appeared in the sampled input.",
  })
  @IsString()
  @MaxLength(80)
  locationHint!: string;
}

class MethodologyIssueDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  id!: string;

  @ApiProperty({ enum: ["critical", "high", "medium", "low"] })
  @IsString()
  @IsIn(["critical", "high", "medium", "low"])
  severity!: "critical" | "high" | "medium" | "low";

  @ApiProperty({
    enum: [
      "opening",
      "hook",
      "character_goal",
      "conflict_pressure",
      "payoff",
      "pacing",
      "setting_load",
      "prose_ai_flavor",
      "prompt_constraint",
      "market_promise",
      "other",
    ],
  })
  @IsString()
  @IsIn([
    "opening",
    "hook",
    "character_goal",
    "conflict_pressure",
    "payoff",
    "pacing",
    "setting_load",
    "prose_ai_flavor",
    "prompt_constraint",
    "market_promise",
    "other",
  ])
  category!:
    | "opening"
    | "hook"
    | "character_goal"
    | "conflict_pressure"
    | "payoff"
    | "pacing"
    | "setting_load"
    | "prose_ai_flavor"
    | "prompt_constraint"
    | "market_promise"
    | "other";

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ type: [MethodologyEvidenceDto] })
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => MethodologyEvidenceDto)
  evidence!: MethodologyEvidenceDto[];

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  readerImpact!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  fixAction!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  promptConstraint!: string;

  @ApiProperty()
  @IsBoolean()
  blocksNextStep!: boolean;
}

class MethodologyRevisionPlanDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  keep!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  change!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  avoid!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  checkpoints!: string[];
}

class MethodologyNextPromptDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(8000)
  prompt!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  linkedIssueIds!: string[];
}

export class GenerateMethodologyCardsDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  projectId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  revisionSessionId!: string;

  @ApiProperty({ type: [MethodologyIssueDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => MethodologyIssueDto)
  issues!: MethodologyIssueDto[];

  @ApiProperty({ type: MethodologyRevisionPlanDto })
  @ValidateNested()
  @Type(() => MethodologyRevisionPlanDto)
  revisionPlan!: MethodologyRevisionPlanDto;

  @ApiProperty({ type: MethodologyNextPromptDto })
  @ValidateNested()
  @Type(() => MethodologyNextPromptDto)
  nextPrompt!: MethodologyNextPromptDto;

  @ApiPropertyOptional({
    description: "Provider config. If omitted, shared model path is used.",
    type: ProviderConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}
