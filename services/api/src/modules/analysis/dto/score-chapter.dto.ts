import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { ProviderConfigDto } from "./provider-config.dto";

export class PerformanceSnapshotDto {
  @ApiProperty({
    description: "How many times the work/chapter was shown by the platform.",
    required: false,
    example: 12000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  impressions?: number;

  @ApiProperty({
    description: "Click-through rate, percentage 0-100.",
    required: false,
    example: 7.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  clickThroughRate?: number;

  @ApiProperty({
    description: "How many readers reached the bottom, percentage 0-100.",
    required: false,
    example: 42,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  bottomRate?: number;

  @ApiProperty({
    description: "Readers staying at least 30 seconds, percentage 0-100.",
    required: false,
    example: 58,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  read30sRate?: number;

  @ApiProperty({
    description: "Readers staying at least 60 seconds, percentage 0-100.",
    required: false,
    example: 31,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  read60sRate?: number;

  @ApiProperty({
    description: "Follow/continue-reading conversion rate, percentage 0-100.",
    required: false,
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  followRate?: number;
}

export class ScoreChapterDto {
  @ApiProperty({ type: ProviderConfigDto })
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider!: ProviderConfigDto;

  @ApiProperty({
    description: "Rubric generated from reference analysis.",
  })
  @IsObject()
  rubric!: Record<string, unknown>;

  @ApiProperty({
    description: "Target platform style used to tune scoring.",
    enum: ["qidian", "fanqie", "jinjiang", "qimao", "wechat-short", "other"],
    example: "fanqie",
  })
  @IsIn(["qidian", "fanqie", "jinjiang", "qimao", "wechat-short", "other"])
  platform!: string;

  @ApiProperty({
    description: "Target reader preference profile.",
    enum: [
      "male-fast-paced",
      "female-emotional",
      "setting-heavy",
      "light-reader",
      "suspense-brainstorm",
      "other",
    ],
    example: "male-fast-paced",
  })
  @IsIn([
    "male-fast-paced",
    "female-emotional",
    "setting-heavy",
    "light-reader",
    "suspense-brainstorm",
    "other",
  ])
  audience!: string;

  @ApiProperty({
    description: "Dominant reading scenario.",
    enum: ["long-serialization", "mobile-fragmented", "short-paid", "other"],
    example: "mobile-fragmented",
  })
  @IsIn(["long-serialization", "mobile-fragmented", "short-paid", "other"])
  readingMode!: string;

  @ApiProperty({
    description:
      "More specific market category, such as 都市神医 or 追妻火葬场.",
    example: "都市神医",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category!: string;

  @ApiProperty({
    description: "Primary theme promise for the target readers.",
    example: "逆袭打脸",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  theme!: string;

  @ApiProperty({
    description: "Reader-facing tags or tropes.",
    example: ["神医", "退婚", "豪门", "隐藏身份"],
  })
  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @ApiProperty({
    description:
      "Visible keywords that may appear in title, intro, or chapter text.",
    example: ["退婚", "银针", "豪门千金"],
  })
  @IsArray()
  @IsString({ each: true })
  explicitKeywords!: string[];

  @ApiProperty({
    description: "Implicit reader expectations represented by the tags.",
    example: ["被低估", "公开羞辱", "医术反转", "身份揭露"],
  })
  @IsArray()
  @IsString({ each: true })
  implicitExpectations!: string[];

  @ApiProperty({
    description:
      "Optional title or synopsis promise to compare against chapter delivery.",
    required: false,
    example: "退婚当天，我用九根银针救下豪门千金",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  positioningPromise?: string;

  @ApiProperty({
    description: "User chapter title.",
    example: "第一章 考场重逢",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  chapterTitle!: string;

  @ApiProperty({
    description: "User chapter to score.",
  })
  @IsString()
  @MinLength(80)
  @MaxLength(30000)
  chapterText!: string;

  @ApiProperty({
    description: "Optional funnel metrics from the platform dashboard.",
    required: false,
    type: PerformanceSnapshotDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceSnapshotDto)
  performanceSnapshot?: PerformanceSnapshotDto;
}
