import type { LLMProviderConfig, ReferenceChapterInput, UserChapterInput } from "./types";

export interface ValidationIssue {
  path: string;
  message: string;
}

export class AiCoreValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
    this.name = "AiCoreValidationError";
    this.issues = issues;
  }
}

const MAX_CHAPTER_TEXT_LENGTH = 200_000;
const MIN_USER_CHAPTER_TEXT_LENGTH = 1;
const providerKinds = new Set(["mock", "openai-compatible"]);
const genres = new Set(["xuanhuan", "urban", "romance", "suspense", "infinite-flow", "other"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringIssue(path: string, value: unknown, options: { required?: boolean } = {}) {
  if (typeof value !== "string") {
    return options.required ? { path, message: "must be a string" } : undefined;
  }

  if (options.required && !value.trim()) {
    return { path, message: "must not be empty" };
  }

  return undefined;
}

function textLengthIssue(path: string, value: string, minLength = MIN_USER_CHAPTER_TEXT_LENGTH) {
  const length = value.trim().length;
  if (length < minLength) {
    return { path, message: `must contain at least ${minLength} non-whitespace character(s)` };
  }

  if (length > MAX_CHAPTER_TEXT_LENGTH) {
    return { path, message: `must not exceed ${MAX_CHAPTER_TEXT_LENGTH} characters` };
  }

  return undefined;
}

function assertNoIssues<T>(issues: ValidationIssue[], value: T): T {
  if (issues.length) {
    throw new AiCoreValidationError(issues);
  }

  return value;
}

export function validateUserChapterInput(value: unknown): UserChapterInput {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    throw new AiCoreValidationError([{ path: "$", message: "must be an object" }]);
  }

  const titleIssue = stringIssue("title", value.title, { required: true });
  const textIssue = stringIssue("text", value.text, { required: true });
  const rubricIssue = stringIssue("rubricId", value.rubricId, { required: true });
  if (titleIssue) issues.push(titleIssue);
  if (textIssue) issues.push(textIssue);
  if (rubricIssue) issues.push(rubricIssue);
  if (typeof value.text === "string") {
    const issue = textLengthIssue("text", value.text);
    if (issue) issues.push(issue);
  }

  return assertNoIssues(issues, {
    title: value.title as string,
    text: value.text as string,
    rubricId: value.rubricId as string,
  });
}

export function validateReferenceChapterInput(value: unknown): ReferenceChapterInput {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    throw new AiCoreValidationError([{ path: "$", message: "must be an object" }]);
  }

  const titleIssue = stringIssue("title", value.title, { required: true });
  const textIssue = stringIssue("text", value.text, { required: true });
  if (titleIssue) issues.push(titleIssue);
  if (textIssue) issues.push(textIssue);
  if (typeof value.genre !== "string" || !genres.has(value.genre)) {
    issues.push({ path: "genre", message: "must be a supported genre" });
  }
  if (typeof value.text === "string") {
    const issue = textLengthIssue("text", value.text);
    if (issue) issues.push(issue);
  }

  return assertNoIssues(issues, {
    title: value.title as string,
    genre: value.genre as ReferenceChapterInput["genre"],
    text: value.text as string,
  });
}

export function validateProviderConfig(value: unknown): LLMProviderConfig {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    throw new AiCoreValidationError([{ path: "$", message: "must be an object" }]);
  }

  const idIssue = stringIssue("id", value.id, { required: true });
  const modelIssue = stringIssue("model", value.model, { required: true });
  if (idIssue) issues.push(idIssue);
  if (modelIssue) issues.push(modelIssue);
  if (typeof value.kind !== "string" || !providerKinds.has(value.kind)) {
    issues.push({ path: "kind", message: "must be a supported provider kind" });
  }
  if (value.baseUrl !== undefined && typeof value.baseUrl !== "string") {
    issues.push({ path: "baseUrl", message: "must be a string when provided" });
  }
  if (value.apiKeyRef !== undefined && typeof value.apiKeyRef !== "string") {
    issues.push({ path: "apiKeyRef", message: "must be a string when provided" });
  }
  if (!isRecord(value.capabilities)) {
    issues.push({ path: "capabilities", message: "must be an object" });
  } else {
    if (typeof value.capabilities.jsonMode !== "boolean") {
      issues.push({ path: "capabilities.jsonMode", message: "must be a boolean" });
    }
    if (typeof value.capabilities.streaming !== "boolean") {
      issues.push({ path: "capabilities.streaming", message: "must be a boolean" });
    }
    if (
      typeof value.capabilities.maxContextTokens !== "number" ||
      !Number.isFinite(value.capabilities.maxContextTokens) ||
      value.capabilities.maxContextTokens <= 0
    ) {
      issues.push({
        path: "capabilities.maxContextTokens",
        message: "must be a positive number",
      });
    }
  }

  return assertNoIssues(issues, {
    id: value.id as string,
    kind: value.kind as LLMProviderConfig["kind"],
    baseUrl: value.baseUrl as string | undefined,
    model: value.model as string,
    apiKeyRef: value.apiKeyRef as string | undefined,
    capabilities: value.capabilities as LLMProviderConfig["capabilities"],
  });
}
