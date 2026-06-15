import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Public } from "@/core/decorators/public.decorators";
import { AnalysisService } from "./analysis.service";
import { AnalyzeBookDto } from "./dto/analyze-book.dto";
import { BuildRubricDto } from "./dto/build-rubric.dto";
import { CreateBookJobFromUploadDto } from "./dto/create-book-job-from-upload.dto";
import { PreprocessBookDto } from "./dto/preprocess-book.dto";
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

  @Get("provider/presets")
  @Public()
  @ApiOperation({ summary: "List provider presets for BYOK model setup" })
  getProviderPresets() {
    return this.analysisService.getProviderPresets();
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
  @ApiOperation({
    summary: "Synchronously analyze a full novel text with map-reduce",
  })
  @ApiResponse({ status: 200, description: "Book-level asset extraction report" })
  analyzeBook(@Body() body: AnalyzeBookDto) {
    return this.analysisService.analyzeBook(body);
  }

  @Post("book/preprocess")
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: "Clean TXT content and split it into chapter segments" })
  preprocessBook(@Body() body: PreprocessBookDto) {
    return this.analysisService.preprocessBook(body);
  }

  @Post("book/jobs")
  @HttpCode(202)
  @Public()
  @ApiOperation({ summary: "Create an async book map-reduce analysis job" })
  createBookAnalysisJob(@Body() body: AnalyzeBookDto) {
    return this.analysisService.createBookAnalysisJob(body);
  }

  @Get("book/jobs/:jobId")
  @Public()
  @ApiOperation({ summary: "Read async book analysis job status" })
  getBookAnalysisJob(@Param("jobId") jobId: string) {
    return this.analysisService.getBookAnalysisJob(jobId);
  }

  @Post("book/uploads")
  @HttpCode(201)
  @Public()
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "genre"],
      properties: {
        file: { type: "string", format: "binary" },
        title: { type: "string" },
        genre: { type: "string", example: "xuanhuan" },
      },
    },
  })
  @ApiOperation({ summary: "Upload a TXT novel and preview chapter splitting" })
  uploadBook(
    @UploadedFile() file: { originalname?: string; buffer?: Buffer },
    @Body() body: { title?: string; genre?: string },
  ) {
    return this.analysisService.uploadBookFile({
      title: body.title,
      genre: body.genre || "other",
      file,
    });
  }

  @Get("book/uploads/:uploadId")
  @Public()
  @ApiOperation({ summary: "Read uploaded TXT preprocessing and chapter preview" })
  getBookUpload(@Param("uploadId") uploadId: string) {
    return this.analysisService.getBookUpload(uploadId);
  }

  @Post("book/uploads/:uploadId/jobs")
  @HttpCode(202)
  @Public()
  @ApiOperation({ summary: "Create an async map-reduce job from an uploaded TXT" })
  createBookAnalysisJobFromUpload(
    @Param("uploadId") uploadId: string,
    @Body() body: CreateBookJobFromUploadDto,
  ) {
    return this.analysisService.createBookAnalysisJobFromUpload({
      uploadId,
      provider: body.provider,
    });
  }
}
