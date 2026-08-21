import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { REPORT_QA_REPORT_KINDS } from "@ai-novel-diagnosis/ai-core";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

export class ReportQaDto {
  @ApiProperty({
    description: "The author's question about the report (10-500 chars).",
    example: "为什么说我的核心冲突是一次性的？",
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  question!: string;

  @ApiProperty({
    description: "Which diagnosis report kind is being asked about.",
    enum: [...REPORT_QA_REPORT_KINDS],
    example: "premise-review",
  })
  @IsIn([...REPORT_QA_REPORT_KINDS])
  reportKind!: (typeof REPORT_QA_REPORT_KINDS)[number];

  @ApiProperty({
    description:
      "The report content itself, supplied by the client (QA is stateless; reports live client-side).",
  })
  @IsString()
  @MinLength(50)
  @MaxLength(20000)
  report!: string;

  @ApiPropertyOptional({
    description:
      "Optional author source text so answers can also cite the original work.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  sourceText?: string;

  @ApiPropertyOptional({
    description:
      "Provider config. If omitted, the API uses the configured shared model path.",
    type: ProviderConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}
