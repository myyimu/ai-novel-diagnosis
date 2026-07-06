export type RightPanelTabType = "history" | "reference" | "project" | "ai-settings" | "history-tasks" | "help";

export interface RightPanelTab {
  id: RightPanelTabType;
  label: string;
  content: React.ReactNode;
  hidden?: boolean;
}

export type MainAreaTabType = "input" | "diagnosis" | "results" | "analysis";

export interface MainAreaTab {
  id: MainAreaTabType;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  complete?: boolean;
}
