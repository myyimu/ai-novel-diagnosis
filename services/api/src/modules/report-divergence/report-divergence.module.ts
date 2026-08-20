import { Module } from "@nestjs/common";
import { AiProviderModule } from "@/modules/ai-provider/ai-provider.module";
import { ReportDivergenceController } from "./report-divergence.controller";
import { ReportDivergenceService } from "./report-divergence.service";

@Module({
	imports: [AiProviderModule],
	controllers: [ReportDivergenceController],
	providers: [ReportDivergenceService],
})
export class ReportDivergenceModule {}
