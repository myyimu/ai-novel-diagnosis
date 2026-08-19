import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { PREMISE_FINDING_REVIEW_STATES } from "@ai-novel-diagnosis/ai-core";

const engineCardStatuses = ["draft", "confirmed"] as const;
const engineVerdicts = ["solid", "fixable", "not-worth-writing"] as const;

export class UpsertPremiseEngineCardDto {
  @IsString()
  projectId!: string;

  @IsIn(engineCardStatuses)
  status!: (typeof engineCardStatuses)[number];

  @IsString()
  @MaxLength(2000)
  premiseSummary!: string;

  @IsString()
  @MaxLength(2000)
  coreConflict!: string;

  @IsString()
  @MaxLength(2000)
  protagonistDesire!: string;

  @IsString()
  @MaxLength(2000)
  opposingForce!: string;

  @IsString()
  @MaxLength(2000)
  irreducibilityTest!: string;

  @IsString()
  @MaxLength(2000)
  readerHookQuestion!: string;

  @IsIn(engineVerdicts)
  engineVerdict!: (typeof engineVerdicts)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  genre?: string;

  @IsOptional()
  @IsString()
  reviewId?: string;

  @IsOptional()
  @IsString()
  confirmedAt?: string;

  @IsString()
  updatedAt!: string;
}

export class UpsertPremiseFindingReviewDto {
  @IsString()
  projectId!: string;

  @IsString()
  reviewId!: string;

  @IsString()
  findingId!: string;

  @IsIn(PREMISE_FINDING_REVIEW_STATES)
  reviewState!: (typeof PREMISE_FINDING_REVIEW_STATES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;
}
