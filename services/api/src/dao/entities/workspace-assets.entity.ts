// Workspace 资产的领域快照类型：repository 对外返回的实体契约。
// 时间字段统一为 ISO 字符串，数组字段为 JSON 反序列化后的纯数据。

export interface WorkspaceProjectSnapshot {
  id: string;
  name: string;
  bookJobId?: string;
  analysisPurpose?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionSessionSnapshot {
  id: string;
  projectId?: string;
  createdAt: string;
  chapterTitle: string;
  genre: string;
  inputKind: string;
  textHash: string;
  textLength: number;
  quickScore: number | null;
  gateDecision: string;
  mainProblem: string;
  issueTitles: string[];
  issueCategories?: string[];
  issueDecisions?: RevisionIssueDecisionSnapshot[];
  retestStatus?: "not_requested" | "pending" | "completed";
  nextPrompt?: string;
  revisionNote?: string;
  revisionNoteUpdatedAt?: string;
  fromVersionId?: string;
  toVersionId?: string;
  textChanged?: boolean;
  storyAuditFindingIds?: string[];
  methodologyCardIds: string[];
}

export interface RevisionIssueDecisionSnapshot {
  issueId: string;
  title: string;
  decision: "accepted" | "author_intent" | "false_positive" | "deferred";
  adopted: boolean;
}

export interface RevisionTextVersionSnapshot {
  id: string;
  projectId?: string;
  createdAt: string;
  chapterTitle: string;
  versionLabel: string;
  textHash: string;
  textLength: number;
  text: string;
  sourceSessionId?: string;
  previousVersionId?: string;
}

export interface ProjectMethodologyCardSnapshot {
  id: string;
  projectCardId: string;
  projectId?: string;
  sourceIssueId: string;
  type: string;
  title: string;
  triggerProblem: string;
  reusableRule: string;
  selfCheckQuestion: string;
  promptTemplate?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sourceChapterTitle: string;
  sourceIssueTitle?: string;
  occurrenceCount: number;
  usageCount?: number;
}

export interface WorkspaceAssetsSnapshot {
  projects: WorkspaceProjectSnapshot[];
  revisionSessions: RevisionSessionSnapshot[];
  revisionVersions: RevisionTextVersionSnapshot[];
  methodologyCards: ProjectMethodologyCardSnapshot[];
}

export type StoryAuditFindingReviewState =
  | "unreviewed"
  | "confirmed"
  | "author_intent"
  | "insufficient_evidence"
  | "false_positive"
  | "planned"
  | "resolved";

export interface StoryAuditFindingReviewSnapshot {
  projectId: string;
  auditId: string;
  findingId: string;
  reviewState: StoryAuditFindingReviewState;
  note?: string;
  updatedAt: string;
}
