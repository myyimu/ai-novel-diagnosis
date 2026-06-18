import { NovelCritiqueConsole } from "@/components/novel-critique-console";

export default function HomePage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<NovelCritiqueConsole view="overview" />
		</main>
	);
}
