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

export class PremiseReviewDto {
  @ApiProperty({
    description:
      "The raw premise / story idea before any chapter is written (20-4000 chars).",
    example:
      "主角重生回高三，带着前世记忆避开所有遗憾，顺便收割全网流量成为顶流。",
  })
  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  premiseText!: string;

  @ApiPropertyOptional({
    description: "Genre hint. If omitted the editor judges from the premise.",
    example: "urban",
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  genre?: string;

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
