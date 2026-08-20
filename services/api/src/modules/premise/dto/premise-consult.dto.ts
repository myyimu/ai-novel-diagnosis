import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { PREMISE_REVIEW_LAYERS } from "@ai-novel-diagnosis/ai-core";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

const premiseVerdicts = ["solid", "fixable", "not-worth-writing"] as const;
const layerStatuses = ["established", "weak", "missing"] as const;

export class PremiseConsultLayerDto {
  @ApiProperty({ enum: PREMISE_REVIEW_LAYERS })
  @IsIn(PREMISE_REVIEW_LAYERS as unknown as string[])
  layer!: string;

  @ApiProperty({ enum: layerStatuses })
  @IsIn(layerStatuses as unknown as string[])
  status!: string;

  @ApiProperty({ description: "One-sentence restatement of this layer." })
  @IsString()
  statement!: string;

  @ApiProperty({ description: "Evidence-completeness hint, 0-1." })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class PremiseConsultOriginalDto {
  @ApiProperty({ enum: premiseVerdicts })
  @IsIn(premiseVerdicts as unknown as string[])
  verdict!: string;

  @ApiProperty({ description: "The first reviewer's one-line verdict." })
  @IsString()
  @MaxLength(600)
  oneLineVerdict!: string;

  @ApiProperty({
    type: [PremiseConsultLayerDto],
    description: "Exactly four layer assessments.",
  })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => PremiseConsultLayerDto)
  layers!: PremiseConsultLayerDto[];
}

export class PremiseConsultDto {
  @ApiProperty({
    description:
      "The same premise text the first review judged (20-4000 chars).",
    example:
      "主角重生回高三，带着前世记忆避开所有遗憾，顺便收割全网流量成为顶流。",
  })
  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  premiseText!: string;

  @ApiPropertyOptional({ description: "Genre hint, same as the first review." })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  genre?: string;

  @ApiPropertyOptional({
    description:
      "Project id. When present (and the provider is a real model), the consult is persisted into the project's medical record and the response carries recordId.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  projectId?: string;

  @ApiProperty({
    enum: ["author-disagrees", "low-evidence"],
    description:
      "author-disagrees = the author contests the verdict; low-evidence = the thinnest layer's evidence completeness was at or below threshold. Never a correctness probability.",
  })
  @IsIn(["author-disagrees", "low-evidence"])
  trigger!: string;

  @ApiProperty({
    type: PremiseConsultOriginalDto,
    description:
      "Snapshot of the first review this consultation is presented against.",
  })
  @ValidateNested()
  @Type(() => PremiseConsultOriginalDto)
  original!: PremiseConsultOriginalDto;

  @ApiPropertyOptional({
    description:
      "Provider config for the second reviewer. If omitted, the shared model path is used.",
    type: ProviderConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}
