"use client";

import React, { ReactNode, useRef, useState } from "react";

interface ResizablePanelProps {
	children: ReactNode;
	defaultSize: number;
	minSize?: number;
	maxSize?: number;
	className?: string;
	onResize?: (size: number) => void;
	direction?: "horizontal" | "vertical";
}

export function ResizablePanel({
	children,
	defaultSize,
	minSize = 100,
	maxSize = 800,
	className = "",
	onResize,
	direction = "horizontal",
}: ResizablePanelProps) {
	const [size, setSize] = useState(defaultSize);
	const [isResizing, setIsResizing] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);
	const startPositionRef = useRef(0);
	const startSizeRef = useRef(0);

	const _handleMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
		startPositionRef.current = direction === "horizontal" ? e.clientX : e.clientY;
		startSizeRef.current = size;
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isResizing) return;

		const currentPosition = direction === "horizontal" ? e.clientX : e.clientY;
		const diff = currentPosition - startPositionRef.current;
		let newSize = startSizeRef.current + diff;

		newSize = Math.max(minSize, Math.min(maxSize, newSize));

		setSize(newSize);
		onResize?.(newSize);
	};

	const handleMouseUp = () => {
		setIsResizing(false);
	};

	React.useEffect(() => {
		if (isResizing) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizing]);

	const style: React.CSSProperties =
		direction === "horizontal"
			? { width: `${size}px`, minWidth: `${minSize}px`, maxWidth: `${maxSize}px` }
			: { height: `${size}px`, minHeight: `${minSize}px`, maxHeight: `${maxSize}px` };

	return (
		<div ref={panelRef} className={`relative ${className}`} style={style}>
			{children}
		</div>
	);
}

interface ResizerProps {
	direction?: "horizontal" | "vertical";
	className?: string;
	onMouseDown: (e: React.MouseEvent) => void;
}

export function Resizer({ direction = "horizontal", className = "", onMouseDown }: ResizerProps) {
	return (
		<div
			className={`group flex items-center justify-center ${className} ${
				direction === "horizontal"
					? "w-1 cursor-col-resize hover:w-1.5"
					: "h-1 cursor-row-resize hover:h-1.5"
			}`}
			onMouseDown={onMouseDown}
		>
			<div
				className={`rounded-full bg-border group-hover:bg-primary transition-colors ${
					direction === "horizontal" ? "w-1 h-8" : "w-8 h-1"
				}`}
			/>
		</div>
	);
}
