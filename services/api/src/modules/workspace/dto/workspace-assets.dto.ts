import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class WorkspaceProjectDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  bookJobId?: string;

  @IsOptional()
  @IsString()
  analysisPurpose?: string;

  @IsString()
  createdAt!: string;

  @IsString()
  updatedAt!: string;
}

export class RevisionSessionDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  createdAt!: string;

  @IsString()
  chapterTitle!: string;

  @IsString()
  genre!: string;

  @IsString()
  inputKind!: string;

  @IsString()
  textHash!: string;

  @IsNumber()
  textLength!: number;

  @IsOptional()
  @IsNumber()
  quickScore!: number | null;

  @IsString()
  gateDecision!: string;

  @IsString()
  mainProblem!: string;

  @IsArray()
  issueTitles!: string[];

  @IsOptional()
  @IsArray()
  issueCategories?: string[];

  @IsOptional()
  @IsString()
  nextPrompt?: string;

  @IsOptional()
  @IsString()
  revisionNote?: string;

  @IsOptional()
  @IsString()
  revisionNoteUpdatedAt?: string;

  @IsOptional()
  @IsString()
  fromVersionId?: string;

  @IsOptional()
  @IsString()
  toVersionId?: string;

  @IsOptional()
  @IsBoolean()
  textChanged?: boolean;

  @IsOptional()
  @IsArray()
  storyAuditFindingIds?: string[];

  @IsArray()
  methodologyCardIds!: string[];
}

export class RevisionTextVersionDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  createdAt!: string;

  @IsString()
  chapterTitle!: string;

  @IsString()
  versionLabel!: string;

  @IsString()
  textHash!: string;

  @IsNumber()
  textLength!: number;

  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  sourceSessionId?: string;

  @IsOptional()
  @IsString()
  previousVersionId?: string;
}

export class ProjectMethodologyCardDto {
  @IsString()
  id!: string;

  @IsString()
  projectCardId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  sourceIssueId!: string;

  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsString()
  triggerProblem!: string;

  @IsString()
  reusableRule!: string;

  @IsString()
  selfCheckQuestion!: string;

  @IsOptional()
  @IsString()
  promptTemplate?: string;

  @IsString()
  firstSeenAt!: string;

  @IsString()
  lastSeenAt!: string;

  @IsString()
  sourceChapterTitle!: string;

  @IsOptional()
  @IsString()
  sourceIssueTitle?: string;

  @IsNumber()
  occurrenceCount!: number;

  @IsOptional()
  @IsNumber()
  usageCount?: number;
}

export class UpsertWorkspaceProjectDto {
  @ValidateNested()
  @Type(() => WorkspaceProjectDto)
  project!: WorkspaceProjectDto;
}

export class UpsertRevisionAssetsDto {
  @ValidateNested()
  @Type(() => WorkspaceProjectDto)
  project!: WorkspaceProjectDto;

  @ValidateNested()
  @Type(() => RevisionSessionDto)
  session!: RevisionSessionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RevisionTextVersionDto)
  revisionVersions?: RevisionTextVersionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMethodologyCardDto)
  methodologyCards!: ProjectMethodologyCardDto[];
}

export class UpdateRevisionNoteDto {
  @IsString()
  note!: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;
}

const storyAuditReviewStates = [
  "unreviewed",
  "confirmed",
  "author_intent",
  "insufficient_evidence",
  "false_positive",
  "planned",
  "resolved",
] as const;

export class UpsertStoryAuditFindingReviewDto {
  @IsString()
  projectId!: string;

  @IsString()
  auditId!: string;

  @IsString()
  findingId!: string;

  @IsIn(storyAuditReviewStates)
  reviewState!: (typeof storyAuditReviewStates)[number];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;
}
