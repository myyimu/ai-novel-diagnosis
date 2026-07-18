import { Injectable } from "@nestjs/common";
import {
  buildDialogueStatistics,
  type CharacterStatePoint,
  type DialogueStatistics,
  type StoryEvent,
  type StoryEvidenceAnchor,
  type StoryAuditFinding,
  type StoryFact,
  type StoryScene,
  type StoryAuditResult,
} from "@ai-novel-diagnosis/ai-core";

interface StoryAuditChapterInput {
  id: string;
  order: number;
  title: string;
  text?: string;
  startOffset?: number;
}

interface StoryAuditChapterMapInput {
  chapterId: string;
  order: number;
  title?: string;
  summary?: string;
  plotFunction?: string;
  chapterGoal?: string;
  conflict?: string;
  characterSignals?: string[];
  worldbuildingSignals?: string[];
  relationshipSignals?: string[];
  timelineEvents?: string[];
  foreshadowingSetups?: string[];
  payoffSignals?: string[];
  hook?: string;
  sourceAnchors?: Array<{
    anchorId?: string;
    label?: string;
    quote?: string;
    startOffset?: number;
    endOffset?: number;
  }>;
}

interface ValidatedChapterMap {
  chapterMap: StoryAuditChapterMapInput;
  anchors: StoryEvidenceAnchor[];
}

@Injectable()
export class StoryAuditService {
  buildStoryAudit(input: {
    bookJobId: string;
    projectId?: string;
    generatedAt?: string;
    chapters: StoryAuditChapterInput[];
    chapterMaps: StoryAuditChapterMapInput[];
    totalChapterCount?: number;
  }): StoryAuditResult {
    const totalChapterCount =
      input.totalChapterCount ??
      input.chapters.length ??
      input.chapterMaps.length;
    const analyzedChapterIds = [
      ...new Set(
        input.chapterMaps.map((chapter) => chapter.chapterId).filter(Boolean),
      ),
    ];
    const dialogue = this.buildDialogueMetrics(input.chapters);
    const validatedChapterMaps = this.validateChapterMapAnchors(
      input.chapterMaps,
      input.chapters,
    );
    const scenes = this.buildScenes(validatedChapterMaps);
    const events = this.buildEvents(scenes, validatedChapterMaps);
    const facts = this.buildFacts(scenes, validatedChapterMaps);
    const characterStates = this.buildCharacterStates(
      scenes,
      validatedChapterMaps,
    );
    const evidenceValidationRate = this.calculateEvidenceValidationRate(
      input.chapterMaps,
      validatedChapterMaps,
    );
    const sceneExtractionRate = analyzedChapterIds.length
      ? Number((scenes.length / analyzedChapterIds.length).toFixed(4))
      : 0;
    const isPartial = analyzedChapterIds.length < totalChapterCount;
    const views = {
      plotlineMatrix: this.buildPlotlineMatrix(scenes, validatedChapterMaps),
      setupPayoffEdges: this.buildSetupPayoffEdges(facts),
    };
    const findings = isPartial
      ? []
      : this.buildPlotHoleCandidates({
          facts,
          views,
        }).slice(0, 3);

    return {
      schemaVersion: "story-audit.v1",
      auditId: `${input.bookJobId}:story-audit.v1`,
      projectId: input.projectId ?? "workspace-unlinked",
      bookJobId: input.bookJobId,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      coverage: {
        analyzedChapterIds,
        totalChapterCount,
        isPartial,
        sceneExtractionRate,
        evidenceValidationRate,
      },
      scenes,
      events,
      facts,
      characterStates,
      findings,
      metrics: {
        dialogue,
      },
      views,
    };
  }

  private buildDialogueMetrics(
    chapters: StoryAuditChapterInput[],
  ): DialogueStatistics[] {
    const chapterMetrics = chapters
      .filter((chapter) => chapter.text?.trim())
      .map((chapter) =>
        buildDialogueStatistics({
          scopeId: chapter.id,
          text: chapter.text ?? "",
        }),
      );

    const bookText = chapters
      .map((chapter) => chapter.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n\n");
    if (!bookText) {
      return chapterMetrics;
    }

    return [
      buildDialogueStatistics({
        scopeId: "book",
        text: bookText,
      }),
      ...chapterMetrics,
    ];
  }

  private validateChapterMapAnchors(
    chapterMaps: StoryAuditChapterMapInput[],
    chapters: StoryAuditChapterInput[],
  ): ValidatedChapterMap[] {
    const chapterById = new Map(
      chapters.map((chapter) => [chapter.id, chapter]),
    );

    return chapterMaps.map((chapterMap) => {
      const chapter = chapterById.get(chapterMap.chapterId);
      const anchors = (chapterMap.sourceAnchors ?? [])
        .map((anchor, index) =>
          this.validateAnchor({
            anchor,
            chapterMap,
            chapter,
            index,
          }),
        )
        .filter((anchor): anchor is StoryEvidenceAnchor => Boolean(anchor));

      return {
        chapterMap,
        anchors,
      };
    });
  }

  private validateAnchor(input: {
    anchor: NonNullable<StoryAuditChapterMapInput["sourceAnchors"]>[number];
    chapterMap: StoryAuditChapterMapInput;
    chapter?: StoryAuditChapterInput;
    index: number;
  }): StoryEvidenceAnchor | null {
    const quote = input.anchor.quote?.trim();
    if (!quote) {
      return null;
    }

    const range = input.chapter?.text
      ? this.locateQuoteRange(input.chapter.text, quote)
      : null;
    if (input.chapter?.text && !range) {
      return null;
    }

    const startOffset =
      range && input.chapter
        ? (input.chapter.startOffset ?? 0) + range.start
        : input.anchor.startOffset;
    const endOffset =
      range && input.chapter
        ? (input.chapter.startOffset ?? 0) + range.end
        : input.anchor.endOffset;
    if (
      !Number.isInteger(startOffset) ||
      !Number.isInteger(endOffset) ||
      (endOffset ?? 0) <= (startOffset ?? 0)
    ) {
      return null;
    }

    return {
      anchorId:
        input.anchor.anchorId ??
        `${input.chapterMap.chapterId}-story-anchor-${input.index + 1}`,
      chapterId: input.chapterMap.chapterId,
      chapterOrder: input.chapterMap.order,
      quote,
      startOffset: startOffset ?? 0,
      endOffset: endOffset ?? 0,
      source: "text",
    };
  }

  private buildScenes(
    validatedChapterMaps: ValidatedChapterMap[],
  ): StoryScene[] {
    return validatedChapterMaps
      .filter((item) => item.anchors.length > 0)
      .map(({ chapterMap, anchors }, index) => ({
        id: `${chapterMap.chapterId}-scene-1`,
        chapterId: chapterMap.chapterId,
        orderInChapter: 1,
        narrativeOrder: index + 1,
        title: chapterMap.title?.trim() || `第 ${chapterMap.order} 章场景`,
        locationIds: [],
        participantIds: this.toEntityIds(chapterMap.characterSignals ?? []),
        goal: chapterMap.chapterGoal?.trim() || undefined,
        conflict: chapterMap.conflict?.trim() || undefined,
        outcome: chapterMap.summary?.trim() || undefined,
        entryHook: chapterMap.plotFunction?.trim() || undefined,
        exitHook: chapterMap.hook?.trim() || undefined,
        evidence: anchors.slice(0, 3),
      }));
  }

  private buildEvents(
    scenes: StoryScene[],
    validatedChapterMaps: ValidatedChapterMap[],
  ): StoryEvent[] {
    const sceneByChapterId = new Map(
      scenes.map((scene) => [scene.chapterId, scene]),
    );
    const events: StoryEvent[] = [];
    for (const { chapterMap, anchors } of validatedChapterMaps) {
      const scene = sceneByChapterId.get(chapterMap.chapterId);
      if (!scene || anchors.length === 0) {
        continue;
      }

      const timelineEvents = this.uniqueTextList(
        chapterMap.timelineEvents ?? [],
      );
      timelineEvents.forEach((summary, index) => {
        events.push({
          id: `${scene.id}-event-${index + 1}`,
          sceneId: scene.id,
          summary,
          participantIds: scene.participantIds,
          locationIds: [],
          relations: [],
          evidence: [anchors[index % anchors.length]],
        });
      });
    }
    return events;
  }

  private buildFacts(
    scenes: StoryScene[],
    validatedChapterMaps: ValidatedChapterMap[],
  ): StoryFact[] {
    const sceneByChapterId = new Map(
      scenes.map((scene) => [scene.chapterId, scene]),
    );
    const facts: StoryFact[] = [];
    for (const { chapterMap, anchors } of validatedChapterMaps) {
      const scene = sceneByChapterId.get(chapterMap.chapterId);
      if (!scene || anchors.length === 0) {
        continue;
      }

      this.uniqueTextList(chapterMap.characterSignals ?? []).forEach(
        (signal, index) => {
          facts.push({
            id: `${scene.id}-character-fact-${index + 1}`,
            subjectId: this.toEntityId(signal),
            predicate: "character_signal",
            object: signal,
            kind: "identity",
            polarity: "uncertain",
            sourcePriority: "explicit-text",
            confidence: 0.6,
            evidence: [anchors[index % anchors.length]],
          });
        },
      );

      this.uniqueTextList(chapterMap.worldbuildingSignals ?? []).forEach(
        (signal, index) => {
          facts.push({
            id: `${scene.id}-world-fact-${index + 1}`,
            subjectId: "world",
            predicate: "world_signal",
            object: signal,
            kind: "world_rule",
            polarity: "uncertain",
            sourcePriority: "explicit-text",
            confidence: 0.6,
            evidence: [anchors[index % anchors.length]],
          });
        },
      );

      this.uniqueTextList(chapterMap.foreshadowingSetups ?? []).forEach(
        (signal, index) => {
          facts.push({
            id: `${scene.id}-setup-fact-${index + 1}`,
            subjectId: "structure",
            predicate: "setup",
            object: signal,
            kind: "knowledge",
            polarity: "uncertain",
            sourcePriority: "explicit-text",
            confidence: 0.6,
            evidence: [anchors[index % anchors.length]],
          });
        },
      );

      this.uniqueTextList(chapterMap.payoffSignals ?? []).forEach(
        (signal, index) => {
          facts.push({
            id: `${scene.id}-payoff-fact-${index + 1}`,
            subjectId: "structure",
            predicate: "payoff",
            object: signal,
            kind: "knowledge",
            polarity: "uncertain",
            sourcePriority: "explicit-text",
            confidence: 0.6,
            evidence: [anchors[index % anchors.length]],
          });
        },
      );
    }
    return facts;
  }

  private buildCharacterStates(
    scenes: StoryScene[],
    validatedChapterMaps: ValidatedChapterMap[],
  ): CharacterStatePoint[] {
    const sceneByChapterId = new Map(
      scenes.map((scene) => [scene.chapterId, scene]),
    );
    return validatedChapterMaps.flatMap(({ chapterMap, anchors }) => {
      const scene = sceneByChapterId.get(chapterMap.chapterId);
      if (!scene || anchors.length === 0) {
        return [];
      }

      return this.toEntityIds(chapterMap.characterSignals ?? []).map(
        (characterId, index) => ({
          characterId,
          sceneId: scene.id,
          goalDistance: "unknown",
          agency: 0.5,
          beliefState: this.uniqueTextList(chapterMap.characterSignals ?? [])[
            index
          ],
          relationshipStates: [],
          evidence: [anchors[index % anchors.length]],
        }),
      );
    });
  }

  private buildPlotlineMatrix(
    scenes: StoryScene[],
    validatedChapterMaps: ValidatedChapterMap[],
  ): StoryAuditResult["views"]["plotlineMatrix"] {
    const sceneByChapterId = new Map(
      scenes.map((scene) => [scene.chapterId, scene]),
    );
    const plotlineSceneIds = new Map<string, Set<string>>();

    for (const { chapterMap } of validatedChapterMaps) {
      const scene = sceneByChapterId.get(chapterMap.chapterId);
      if (!scene) {
        continue;
      }

      const labels = this.uniqueTextList([
        chapterMap.plotFunction ?? "",
        ...(chapterMap.relationshipSignals ?? []),
      ]);
      for (const label of labels.length ? labels : ["mainline"]) {
        const plotlineId = this.toEntityId(label);
        const sceneIds = plotlineSceneIds.get(plotlineId) ?? new Set<string>();
        sceneIds.add(scene.id);
        plotlineSceneIds.set(plotlineId, sceneIds);
      }
    }

    return [...plotlineSceneIds.entries()].map(([plotlineId, sceneIds]) => ({
      plotlineId,
      sceneIds: [...sceneIds],
      status: "unknown",
    }));
  }

  private buildSetupPayoffEdges(
    facts: StoryFact[],
  ): StoryAuditResult["views"]["setupPayoffEdges"] {
    const setupFacts = facts.filter((fact) => fact.predicate === "setup");
    const payoffFacts = facts.filter((fact) => fact.predicate === "payoff");
    return setupFacts.map((setupFact, index) => ({
      setupFactId: setupFact.id,
      payoffFactId: payoffFacts[index]?.id,
      status: payoffFacts[index] ? "unknown" : "open",
    }));
  }

  private buildPlotHoleCandidates(input: {
    facts: StoryFact[];
    views: StoryAuditResult["views"];
  }): StoryAuditFinding[] {
    const factById = new Map(input.facts.map((fact) => [fact.id, fact]));
    const candidates = input.views.setupPayoffEdges
      .filter((edge) => edge.status === "open")
      .map((edge): StoryAuditFinding | null => {
        const setupFact = factById.get(edge.setupFactId);
        const evidence = setupFact?.evidence ?? [];
        if (!setupFact || evidence.length === 0) {
          return null;
        }

        return {
          id: `${setupFact.id}-unresolved-setup`,
          category: "unresolved_setup",
          severity: "medium",
          status: "needs_human",
          title: "伏笔暂未回收候选",
          claim: `“${setupFact.object}”已有正文证据，但当前已分析范围内还没有匹配的回收证据。`,
          evidence,
          relatedFactIds: [setupFact.id],
          relatedEventIds: [],
          ruleIds: ["open-setup-needs-human-review"],
          alternativeExplanations: [
            "这可能是作者计划跨卷或后文回收的长线伏笔。",
            "这可能只是氛围铺垫或角色误读，不一定需要显性回收。",
            "如果当前文本不是完结稿，需要等后续章节后再判断。",
          ],
          readerImpact:
            "如果作者原本承诺近期回收，长期悬置可能削弱读者对线索的信任。",
          fixAction:
            "确认该伏笔是否仍有效；若有效，标记预期回收章节或补一个提醒/阶段性兑现。",
          confidence: 0.68,
        };
      })
      .filter((candidate): candidate is StoryAuditFinding =>
        Boolean(candidate),
      );

    return candidates.sort(
      (left, right) =>
        this.severityWeight(right.severity) * right.confidence -
        this.severityWeight(left.severity) * left.confidence,
    );
  }

  private severityWeight(severity: StoryAuditFinding["severity"]): number {
    switch (severity) {
      case "critical":
        return 4;
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
        return 1;
    }
  }

  private calculateEvidenceValidationRate(
    chapterMaps: StoryAuditChapterMapInput[],
    validatedChapterMaps: ValidatedChapterMap[],
  ): number {
    const anchors = chapterMaps.flatMap(
      (chapter) => chapter.sourceAnchors ?? [],
    );
    if (!anchors.length) {
      return 0;
    }

    const validAnchors = validatedChapterMaps.reduce(
      (total, chapterMap) => total + chapterMap.anchors.length,
      0,
    );

    return Number((validAnchors / anchors.length).toFixed(4));
  }

  private locateQuoteRange(
    text: string,
    quote: string,
  ): { start: number; end: number } | null {
    const directIndex = text.indexOf(quote);
    if (directIndex >= 0) {
      return {
        start: directIndex,
        end: directIndex + quote.length,
      };
    }

    const compactText = text.replace(/\s+/g, "");
    const compactQuote = quote.replace(/\s+/g, "");
    const compactIndex = compactText.indexOf(compactQuote);
    if (compactIndex < 0) {
      return null;
    }

    let effectiveOffset = 0;
    for (let index = 0; index < text.length; index += 1) {
      if (/\s/.test(text[index] ?? "")) {
        continue;
      }
      if (effectiveOffset === compactIndex) {
        let end = index;
        let consumed = 0;
        while (end < text.length && consumed < compactQuote.length) {
          if (!/\s/.test(text[end] ?? "")) {
            consumed += 1;
          }
          end += 1;
        }
        return { start: index, end };
      }
      effectiveOffset += 1;
    }

    return null;
  }

  private uniqueTextList(items: string[]): string[] {
    return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  }

  private toEntityIds(items: string[]): string[] {
    return this.uniqueTextList(items).map((item) => this.toEntityId(item));
  }

  private toEntityId(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u4e00-\u9fa5-]/g, "");
    return normalized || "unknown";
  }
}
