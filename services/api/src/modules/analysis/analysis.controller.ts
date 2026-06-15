import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "@/core/decorators/public.decorators";
import { AnalysisService } from "./analysis.service";
import { AnalyzeBookDto } from "./dto/analyze-book.dto";
import { BuildRubricDto } from "./dto/build-rubric.dto";
import { PreviewAnalysisDto } from "./dto/preview-analysis.dto";
import { ScoreChapterDto } from "./dto/score-chapter.dto";
import { TestProviderDto } from "./dto/provider-config.dto";

@ApiTags("analysis")
@Controller("analysis")
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get("pipeline")
  @Public()
  @ApiOperation({ summary: "Read the planned AI critique pipeline" })
  getPipeline() {
    return this.analysisService.getPipeline();
  }

  @Post("preview")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Preview chapter scoring without a real LLM provider" })
  @ApiResponse({ status: 200, description: "Structured preview score" })
  preview(@Body() body: PreviewAnalysisDto) {
    return this.analysisService.previewScore(body);
  }

  @Post("provider/test")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Test a user supplied model provider" })
  testProvider(@Body() body: TestProviderDto) {
    return this.analysisService.testProvider(body.provider);
  }

  @Post("rubric")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Build a critique rubric from a reference chapter" })
  @ApiResponse({ status: 200, description: "Reference analysis and generated rubric" })
  buildRubric(@Body() body: BuildRubricDto) {
    return this.analysisService.buildRubric(body);
  }

  @Post("score")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Score a user chapter with a generated rubric" })
  @ApiResponse({ status: 200, description: "Structured chapter score report" })
  scoreChapter(@Body() body: ScoreChapterDto) {
    return this.analysisService.scoreChapter(body);
  }

  @Post("book")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Analyze a full novel text into reusable writing assets" })
  @ApiResponse({ status: 200, description: "Book-level asset extraction report" })
  analyzeBook(@Body() body: AnalyzeBookDto) {
    return this.analysisService.analyzeBook(body);
  }
}
