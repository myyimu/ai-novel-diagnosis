import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

export class ReportDivergenceDto {
  @ApiProperty({
    description: "The chapter both reports judged (1-200 chars).",
    example: "第三章 对峙",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  chapterTitle!: string;

  @ApiProperty({
    description:
      "Serialized quick-review report text (stateless — the client carries the report).",
  })
  @IsString()
  @MinLength(50)
  @MaxLength(20000)
  quickReviewReport!: string;

  @ApiProperty({
    description:
      "Serialized story-audit report text covering the same chapter (client-supplied).",
  })
  @IsString()
  @MinLength(50)
  @MaxLength(20000)
  storyAuditReport!: string;

  @ApiPropertyOptional({
    description:
      "Provider config. If omitted, the API uses the configured shared model path.",
    type: ProviderConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;

  @ApiPropertyOptional({
    description:
      "Project id. When present (and the provider is a real model), the detection is persisted into the project's medical record and the response carries recordId.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  projectId?: string;
}
