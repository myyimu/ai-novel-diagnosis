import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Author review states. Must stay in sync with `StoryAuditReviewState` in
 * `@ai-novel-diagnosis/ai-core`. Kept as a local const so the DTO stays
 * self-validating without importing runtime library code.
 */
const REVIEW_STATES = [
  "confirmed",
  "author_intent",
  "insufficient_evidence",
  "false_positive",
  "planned",
  "resolved",
] as const;

export class ReviewStoryAuditFindingDto {
  @ApiProperty({
    description:
      "Book analysis job that produced the audit this finding belongs to.",
  })
  @IsString()
  bookJobId!: string;

  @ApiProperty({
    description: "Audit id the finding belongs to.",
  })
  @IsString()
  auditId!: string;

  @ApiProperty({
    description: "Author's review decision for this finding.",
    enum: [...REVIEW_STATES],
    example: "confirmed",
  })
  @IsString()
  @IsIn([...REVIEW_STATES])
  reviewState!: (typeof REVIEW_STATES)[number];

  @ApiPropertyOptional({
    description: "Optional author note explaining the review decision.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
