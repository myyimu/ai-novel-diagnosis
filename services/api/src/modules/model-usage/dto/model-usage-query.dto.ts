import { Type } from "class-transformer";
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class ModelUsageEventsQueryDto {
  /** Filter to a single analysis job (book analysis golden path). */
  @IsOptional()
  @IsString()
  jobId?: string;

  /** Max events returned; clamped server-side to 200. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class ModelUsageSummaryQueryDto {
  /** ISO timestamp; only events created at or after it are aggregated. */
  @IsOptional()
  @IsISO8601()
  since?: string;
}
