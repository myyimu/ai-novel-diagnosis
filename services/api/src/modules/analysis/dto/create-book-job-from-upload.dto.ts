import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

export class CreateBookJobFromUploadDto {
  @ApiProperty({ type: ProviderConfigDto })
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider!: ProviderConfigDto;

  @ApiPropertyOptional({
    description:
      "Author name used to group multiple books for author-level skill distillation.",
    example: "猫腻",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  author?: string;

  @ApiPropertyOptional({
    description:
      "Publishing platform, used to group books for platform/genre-level distillation.",
    example: "qidian",
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  platform?: string;

  @ApiPropertyOptional({
    description: "First publication year (4-digit).",
    example: 2018,
  })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  publishedYear?: number;
}
