// 书籍分析结果的导出格式与导出模式。
// 原先定义在 export-view.tsx；该组件下线后类型迁移至此，供
// use-workspace-handlers 的 exportBookResult 使用。

export type BookExportFormat =
	| "markdown"
	| "reading-report"
	| "json"
	| "tavern-card"
	| "world-book"
	| "sillytavern-world-info"
	| "continuation-pack"
	| "style-bible"
	| "outline"
	| "prompt-pack"
	| "do-not-copy"
	| "skill-md"
	| "skill-package"
	| "skill-zip";

export type BookExportMode = "notes" | "originalized";
