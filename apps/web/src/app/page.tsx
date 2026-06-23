import { NovelCritiqueConsole } from "@/components/novel-critique-console";

export default function HomePage() {
	const siteUrl =
		process.env.NEXT_PUBLIC_SITE_URL ??
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");
	const softwareJsonLd = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "AI小说第一步",
		alternateName: "AI Novel First Step",
		url: siteUrl,
		applicationCategory: "WritingApplication",
		operatingSystem: "Windows, macOS, Linux",
		isAccessibleForFree: true,
		description:
			"本地 AI 小说诊断与 AI 拆书工具，帮作者找出网文哪里不好、为什么没流量，定位第一章最大流失点并进阶拆解整书关系图谱。",
		creator: {
			"@type": "Person",
			name: "myyimu",
		},
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
		featureList: [
			"第一章改稿急诊",
			"AI小说诊断",
			"AI拆书",
			"网文流量问题分析",
			"最大流失点诊断",
			"可复制改稿 Prompt",
			"深度章节质检",
			"整书 Map-Reduce 拆解",
			"关系图谱复核与导出",
		],
	};

	return (
		<main className="min-h-screen bg-background text-foreground">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
			/>
			<NovelCritiqueConsole view="overview" />
		</main>
	);
}
