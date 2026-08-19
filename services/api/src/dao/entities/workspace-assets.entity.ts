// Workspace 资产的领域快照类型：repository 对外返回的实体契约。
// 时间字段统一为 ISO 字符串，数组字段为 JSON 反序列化后的纯数据。
//
// 立项审稿资产（发动机卡 / 俗套复核）的形状与 ai-core 契约完全同构，
// 直接别名复用，避免第二份手写定义漂移。
import type { PremiseEngineCard } from "@ai-novel-diagnosis/ai-core";

export type {
  PremiseEngineCard,
  PremiseEngineCardStatus,
  PremiseFindingReview,
  PremiseFindingReviewState,
} from "@ai-novel-diagnosis/ai-core";

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
  /** 阶段①发动机卡，0..1 per project；缺省为空数组（旧客户端可忽略）。 */
  premiseEngineCards: PremiseEngineCard[];
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
