"use client";

import { Button } from "@/components/ui/button";
import { LayoutGrid, LayoutList } from "lucide-react";
import { useLayoutStore, type LayoutMode } from "@/stores/layout-store";

interface LayoutToggleProps {
	currentMode?: LayoutMode;
}

export function LayoutToggle({ currentMode }: LayoutToggleProps) {
	const { mode, toggleMode } = useLayoutStore();
	const displayMode = currentMode ?? mode;
	const isThreeColumn = displayMode === "three-column";

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={toggleMode}
			className="gap-2"
			title={`切换到${isThreeColumn ? "经典" : "三栏"}布局`}
		>
			{isThreeColumn ? (
				<>
					<LayoutGrid className="w-4 h-4" />
					<span className="hidden sm:inline">三栏</span>
				</>
			) : (
				<>
					<LayoutList className="w-4 h-4" />
					<span className="hidden sm:inline">经典</span>
				</>
			)}
		</Button>
	);
}

export function useLayoutMode(): [LayoutMode, (mode: LayoutMode) => void] {
	const { mode, setMode } = useLayoutStore();
	return [mode, setMode];
}
