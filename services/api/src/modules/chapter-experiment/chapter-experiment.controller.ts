import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { Public } from "@/core/decorators/public.decorators";
import type {
  ChapterExperiment,
  ChapterExperimentSummary,
} from "@ai-novel-diagnosis/ai-core";
import { ChapterExperimentService } from "./chapter-experiment.service";
import {
  ChapterExperimentActionDto,
  CreateChapterExperimentDto,
  ListChapterExperimentsDto,
} from "./dto/chapter-experiment.dto";

@Controller("analysis/chapter-experiments")
export class ChapterExperimentController {
  constructor(private readonly experiments: ChapterExperimentService) {}

  @Post()
  @HttpCode(200)
  @Public()
  create(@Body() body: CreateChapterExperimentDto): Promise<ChapterExperiment> {
    return this.experiments.create(body);
  }

  @Get()
  @Public()
  list(
    @Query() query: ListChapterExperimentsDto,
  ): Promise<ChapterExperimentSummary[]> {
    return this.experiments.list(query.projectId);
  }

  @Get(":id")
  @Public()
  get(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ChapterExperiment> {
    return this.experiments.get(id);
  }

  @Post(":id/actions")
  @HttpCode(200)
  @Public()
  act(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: ChapterExperimentActionDto,
  ): Promise<ChapterExperiment> {
    return this.experiments.act(id, body);
  }
}
