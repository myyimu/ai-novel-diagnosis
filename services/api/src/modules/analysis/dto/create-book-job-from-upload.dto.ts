import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

const BOOK_ANALYSIS_PURPOSES = ["own-draft", "reference-study"] as const;
const STORY_AUDIT_PROFILES = [
  "statistics",
  "continuity",
  "structure",
  "character",
  "full",
] as const;

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

  @ApiPropertyOptional({
    description:
      "Whether this upload is the author's own draft or a reference study.",
    enum: [...BOOK_ANALYSIS_PURPOSES],
    default: "reference-study",
  })
  @IsOptional()
  @IsString()
  @IsIn([...BOOK_ANALYSIS_PURPOSES])
  purpose?: (typeof BOOK_ANALYSIS_PURPOSES)[number];

  @ApiPropertyOptional({
    description: "Story-audit profiles to run for an own-draft book.",
    isArray: true,
    enum: [...STORY_AUDIT_PROFILES],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn([...STORY_AUDIT_PROFILES], { each: true })
  profiles?: (typeof STORY_AUDIT_PROFILES)[number][];
}
