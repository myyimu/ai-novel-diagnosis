import { Module } from "@nestjs/common";
import { AiProviderModule } from "@/modules/ai-provider/ai-provider.module";
import { ReportQaController } from "./report-qa.controller";
import { ReportQaService } from "./report-qa.service";

@Module({
	imports: [AiProviderModule],
	controllers: [ReportQaController],
	providers: [ReportQaService],
})
export class ReportQaModule {}
