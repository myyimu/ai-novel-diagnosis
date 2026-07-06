"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  position?: "left" | "right";
  className?: string;
}

export function SidebarToggle({
  isOpen,
  onToggle,
  position = "left",
  className = "",
}: SidebarToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={`absolute z-10 bg-background border border-border rounded-full ${
        position === "left"
          ? isOpen
            ? "left-[256px] -translate-x-1/2"
            : "left-2"
          : isOpen
          ? "right-[320px] translate-x-1/2"
          : "right-2"
      } top-4 transition-all ${className}`}
      aria-label={isOpen ? "收起侧边栏" : "展开侧边栏"}
    >
      {position === "left" ? (
        isOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )
      ) : isOpen ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4" />
      )}
    </Button>
  );
}
