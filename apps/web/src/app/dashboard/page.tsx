import { NovelCritiqueConsole } from "@/components/novel-critique-console";

export default function DashboardPage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<NovelCritiqueConsole view="dashboard" />
		</main>
	);
}
