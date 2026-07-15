import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

class PlatformFitIssueDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  readerImpact!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  fixAction!: string;
}

export class AnalyzePlatformFitDto {
  @ApiProperty({
    description:
      "Candidate platform, or help-me-choose when the user wants suggestions.",
    example: "fanqie",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  candidatePlatform!: string;

  @ApiProperty({
    description: "Target reader segment.",
    example: "男频快节奏爽文读者",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  targetReader!: string;

  @ApiProperty({
    description: "Reading mode or publishing scenario.",
    example: "移动端碎片阅读",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  readingMode!: string;

  @ApiProperty({
    description: "Expected work length or serialization plan.",
    example: "长篇连载，预计 100 万字以上",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  workLength!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  genre!: string;

  @ApiProperty({
    description:
      "Core selling point or reader promise to test against platform fit.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  coreSellingPoint!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ type: [PlatformFitIssueDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PlatformFitIssueDto)
  issues?: PlatformFitIssueDto[];

  @ApiPropertyOptional({
    description: "Provider config. If omitted, shared model path is used.",
    type: ProviderConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}
