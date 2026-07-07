import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LayoutMode = "classic" | "three-column";

interface LayoutState {
	mode: LayoutMode;
	setMode: (mode: LayoutMode) => void;
	toggleMode: () => void;
}

export const useLayoutStore = create<LayoutState>()(
	persist(
		(set) => ({
			mode: "classic",
			setMode: (mode) => set({ mode }),
			toggleMode: () =>
				set((state) => ({ mode: state.mode === "classic" ? "three-column" : "classic" })),
		}),
		{
			name: "workspace-layout-mode",
			storage: createJSONStorage(() => localStorage),
		},
	),
);
