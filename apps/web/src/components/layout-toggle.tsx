"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LayoutList } from "lucide-react";

const STORAGE_KEY = "workspace-layout-mode";
const DEFAULT_MODE = "classic";

type LayoutMode = "classic" | "three-column";

function getStoredMode(): LayoutMode {
	if (typeof window === "undefined") return DEFAULT_MODE;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "classic" || stored === "three-column") {
			return stored;
		}
	} catch {
		// Ignore storage errors
	}
	return DEFAULT_MODE;
}

function setStoredMode(mode: LayoutMode) {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, mode);
	} catch {
		// Ignore storage errors
	}
}

interface LayoutToggleProps {
	currentMode: LayoutMode;
	onModeChange: (mode: LayoutMode) => void;
}

export function LayoutToggle({ currentMode, onModeChange }: LayoutToggleProps) {
	const [mode, setMode] = useState<LayoutMode>(currentMode);

	useEffect(() => {
		setMode(currentMode);
	}, [currentMode]);

	const handleToggle = () => {
		const newMode = mode === "classic" ? "three-column" : "classic";
		setMode(newMode);
		setStoredMode(newMode);
		onModeChange(newMode);
	};

	const isThreeColumn = mode === "three-column";

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleToggle}
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
	const [mode, setMode] = useState<LayoutMode>(DEFAULT_MODE);

	useEffect(() => {
		setMode(getStoredMode());
	}, []);

	const updateMode = (newMode: LayoutMode) => {
		setMode(newMode);
		setStoredMode(newMode);
	};

	return [mode, updateMode];
}

export { getStoredMode };
