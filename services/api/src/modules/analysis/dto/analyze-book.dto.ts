import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
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

export class AnalyzeBookDto {
  @ApiProperty({ type: ProviderConfigDto })
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider!: ProviderConfigDto;

  @ApiProperty({
    description: "Book title for the asset report.",
    example: "示例长篇小说",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiProperty({
    description: "Genre used to frame the book-level analysis.",
    enum: [
      "xuanhuan",
      "urban",
      "romance",
      "suspense",
      "infinite-flow",
      "other",
    ],
    example: "xuanhuan",
  })
  @IsIn(["xuanhuan", "urban", "romance", "suspense", "infinite-flow", "other"])
  genre!: string;

  @ApiProperty({
    description:
      "Full or partial novel text. MVP is synchronous; keep samples moderate.",
  })
  @IsString()
  @MinLength(500)
  @MaxLength(500000)
  text!: string;

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
      "Whether this text is the author's own draft or a reference study. " +
      "Defaults to reference-study so existing research requests keep their behavior.",
    enum: [...BOOK_ANALYSIS_PURPOSES],
    default: "reference-study",
    example: "own-draft",
  })
  @IsOptional()
  @IsString()
  @IsIn([...BOOK_ANALYSIS_PURPOSES])
  purpose?: (typeof BOOK_ANALYSIS_PURPOSES)[number];

  @ApiPropertyOptional({
    description:
      "Story audit profiles to run for an own-draft book. " +
      "Defaults to statistics + continuity + structure + character when purpose is own-draft.",
    isArray: true,
    enum: [...STORY_AUDIT_PROFILES],
    example: ["statistics", "continuity", "structure", "character"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn([...STORY_AUDIT_PROFILES], { each: true })
  profiles?: string[];
}
