import { NovelCritiqueConsole } from "@/components/novel-critique-console";

export default function RevisionsPage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<NovelCritiqueConsole view="revisions" />
		</main>
	);
}
