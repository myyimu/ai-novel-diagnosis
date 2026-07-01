import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type {
  DiagnosisIssue,
  DiagnosisIssueCategory,
  GateDecision,
  QuickReviewInputKind,
  QuickReviewResult,
} from "./types";

interface DiagnosisFixtureIndex {
  schemaVersion: string;
  fixtures: string[];
}

interface DiagnosisFixture {
  schemaVersion: string;
  id: string;
  title: string;
  genre: string;
  inputKind: QuickReviewInputKind;
  chapterTitle: string;
  chapterText: string;
  previousPrompt?: string;
  expected: {
    gateDecision: GateDecision;
    topIssueCategory: DiagnosisIssueCategory;
    scoreRange: [number, number];
    mustContainEvidence: string[];
    actionKeywords: string[];
    nextAction: string;
    storyCraftSignals?: string[];
  };
  result: QuickReviewResult;
}

const fixturesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/novel-diagnosis",
);

function readJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(resolve(fixturesDir, fileName), "utf8")) as T;
}

function assertIssueQuality(issue: DiagnosisIssue) {
  expect(issue.id).toBeTruthy();
  expect(issue.title.length).toBeGreaterThan(4);
  expect(issue.description.length).toBeGreaterThan(10);
  expect(issue.evidence.length).toBeGreaterThanOrEqual(1);
  expect(issue.evidence.length).toBeLessThanOrEqual(3);
  expect(issue.readerImpact.length).toBeGreaterThan(10);
  expect(issue.fixAction.length).toBeGreaterThan(10);
  expect(issue.promptConstraint.length).toBeGreaterThan(10);

  for (const evidence of issue.evidence) {
    expect(evidence.quote.length).toBeGreaterThan(4);
    expect(evidence.locationHint.length).toBeGreaterThan(1);
    expect(evidence.confidence).toBeGreaterThanOrEqual(0.4);
    expect(evidence.confidence).toBeLessThanOrEqual(1);
  }
}

describe("novel diagnosis golden fixtures", () => {
  const index = readJson<DiagnosisFixtureIndex>("index.json");

  it("declares unique fixture files", () => {
    expect(index.schemaVersion).toBe("novel-diagnosis-fixtures/v1");
    expect(index.fixtures.length).toBeGreaterThanOrEqual(3);
    expect(new Set(index.fixtures).size).toBe(index.fixtures.length);
  });

  for (const fixtureFile of index.fixtures) {
    it(`${fixtureFile} keeps the quick-review quality contract`, () => {
      const fixture = readJson<DiagnosisFixture>(fixtureFile);
      const primaryIssue = fixture.result.issues?.[0];
      const [minScore, maxScore] = fixture.expected.scoreRange;
      const issueIds = new Set(fixture.result.issues?.map((issue) => issue.id) ?? []);

      expect(fixture.schemaVersion).toBe("novel-diagnosis-fixture/v1");
      expect(fixture.id).toBeTruthy();
      expect(fixture.chapterText.length).toBeGreaterThan(80);
      expect(fixture.result.title).toBe(fixture.chapterTitle);
      expect(fixture.result.genre).toBe(fixture.genre);
      expect(fixture.result.inputKind).toBe(fixture.inputKind);
      expect(fixture.result.gateDecision).toBe(fixture.expected.gateDecision);
      expect(fixture.result.quickScore).toBeGreaterThanOrEqual(minScore);
      expect(fixture.result.quickScore).toBeLessThanOrEqual(maxScore);
      expect(fixture.result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(fixture.result.mainProblem.length).toBeGreaterThan(10);
      expect(primaryIssue?.category).toBe(fixture.expected.topIssueCategory);

      for (const issue of fixture.result.issues ?? []) {
        assertIssueQuality(issue);
      }

      for (const expectedEvidence of fixture.expected.mustContainEvidence) {
        expect(
          fixture.result.issues?.some((issue) =>
            issue.evidence.some((evidence) => evidence.quote.includes(expectedEvidence)),
          ),
        ).toBe(true);
      }

      expect(fixture.result.revisionPlan?.priorityIssueIds.length).toBeGreaterThan(0);
      expect(fixture.result.revisionPlan?.checkpoints.length).toBeGreaterThan(0);
      for (const issueId of fixture.result.revisionPlan?.priorityIssueIds ?? []) {
        expect(issueIds.has(issueId)).toBe(true);
      }

      expect(fixture.result.nextPrompt?.linkedIssueIds.length).toBeGreaterThan(0);
      const actionText = [
        ...fixture.result.actionableFixes,
        ...(fixture.result.issues?.map((issue) => issue.fixAction) ?? []),
        fixture.result.nextPrompt?.prompt ?? "",
      ].join("\n");
      for (const keyword of fixture.expected.actionKeywords) {
        expect(actionText).toContain(keyword);
      }
      if (fixture.expected.storyCraftSignals?.length) {
        const issueText = (fixture.result.issues ?? [])
          .map((issue) =>
            [
              issue.title,
              issue.description,
              issue.readerImpact,
              issue.fixAction,
              issue.promptConstraint,
            ].join("\n"),
          )
          .join("\n");
        for (const signal of fixture.expected.storyCraftSignals) {
          expect(issueText).toContain(signal);
        }
      }
      for (const issueId of fixture.result.nextPrompt?.linkedIssueIds ?? []) {
        expect(issueIds.has(issueId)).toBe(true);
      }

      for (const card of fixture.result.methodologyCards ?? []) {
        expect(issueIds.has(card.sourceIssueId)).toBe(true);
        expect(card.reusableRule.length).toBeGreaterThan(10);
        expect(card.selfCheckQuestion).toContain("？");
      }
    });
  }
});
