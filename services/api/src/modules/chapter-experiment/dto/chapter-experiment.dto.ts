import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

export class CreateChapterExperimentDto {
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  diagnosis?: string;
  @IsString() @MinLength(1) @MaxLength(200) projectId!: string;
  @IsString() @MinLength(1) @MaxLength(120) chapterTitle!: string;
  @IsString() @MinLength(50) @MaxLength(12000) originalText!: string;
  @IsString() @MinLength(2) @MaxLength(1000) goal!: string;
  @IsString() @MinLength(1) @MaxLength(1000) preserve!: string;
  @IsString() @MaxLength(6000) context!: string;
}

export class ListChapterExperimentsDto {
  @IsString() @MinLength(1) @MaxLength(200) projectId!: string;
}

export class ChapterExperimentActionDto {
  @IsInt() @Min(0) revision!: number;
  @IsIn(["ask", "confirm-plan", "generate", "evaluate"]) action!:
    | "ask"
    | "confirm-plan"
    | "generate"
    | "evaluate";
  @ValidateIf((o: ChapterExperimentActionDto) => o.action === "ask")
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message?: string;
  @ValidateIf((o: ChapterExperimentActionDto) => o.action === "confirm-plan")
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  plan?: string;
  @ValidateIf((o: ChapterExperimentActionDto) => o.action === "generate")
  @IsIn(["baseline", "guided"])
  route?: "baseline" | "guided";
  @ValidateIf((o: ChapterExperimentActionDto) => o.action === "evaluate")
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  leftId?: string;
  @ValidateIf((o: ChapterExperimentActionDto) => o.action === "evaluate")
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  rightId?: string;
  @ValidateIf((o: ChapterExperimentActionDto) => o.action === "evaluate")
  @IsIn(["left", "right", "tie", "uncertain"])
  choice?: "left" | "right" | "tie" | "uncertain";
  @ValidateIf((o: ChapterExperimentActionDto) => o.action === "evaluate")
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  reason?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}
