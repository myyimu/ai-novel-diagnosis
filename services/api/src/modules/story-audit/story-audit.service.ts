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
  type TemporalRelation,
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

interface TemporalEdge {
  sourceEventId: string;
  targetEventId: string;
  relation: TemporalRelation;
  confidence: number;
  evidence: StoryEvidenceAnchor[];
  ruleId: string;
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
    const temporalEdges = this.buildTemporalRelations(
      events,
      validatedChapterMaps,
    );
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
      temporalGraph: this.buildTemporalGraph(events, temporalEdges),
      plotlineMatrix: this.buildPlotlineMatrix(scenes, validatedChapterMaps),
      setupPayoffEdges: this.buildSetupPayoffEdges(facts),
    };
    const findings = isPartial
      ? []
      : [
          ...this.buildTemporalConflictCandidates(events, temporalEdges),
          ...this.buildAgeContradictionCandidates(facts),
          ...this.buildLocationConflictCandidates(events, temporalEdges),
          ...this.buildPlotHoleCandidates({
            facts,
            views,
          }),
        ]
          .sort(
            (left, right) =>
              this.severityWeight(right.severity) * right.confidence -
              this.severityWeight(left.severity) * left.confidence,
          )
          .slice(0, 3);
    views.temporalGraph.conflictCandidateIds = findings
      .filter(
        (finding) =>
          finding.category === "timeline_conflict" ||
          finding.category === "location_conflict",
      )
      .map((finding) => finding.id);

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
      ).filter((summary) => !this.parseTemporalRelationLine(summary));
      timelineEvents.forEach((rawSummary, index) => {
        const marker = this.parseTimelineEventMarker(rawSummary);
        const summary = marker.summary;
        events.push({
          id: marker.label
            ? `${scene.id}-event-${this.toEntityId(marker.label)}`
            : `${scene.id}-event-${index + 1}`,
          sceneId: scene.id,
          summary,
          participantIds: scene.participantIds,
          locationIds: this.parseLocationIds(summary),
          absoluteTime: this.parseAbsoluteTime(summary),
          relativeTimeText: this.parseRelativeTimeText(summary),
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
          const ageFact = this.parseAgeFact(signal);
          facts.push({
            id: `${scene.id}-character-fact-${index + 1}`,
            subjectId: ageFact?.subjectId ?? this.toEntityId(signal),
            predicate: ageFact ? "age" : "character_signal",
            object: signal,
            kind: ageFact ? "age" : "identity",
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

  private buildTemporalRelations(
    events: StoryEvent[],
    validatedChapterMaps: ValidatedChapterMap[],
  ): TemporalEdge[] {
    const eventByLabel = this.buildEventLabelIndex(events);
    const edges: TemporalEdge[] = [];

    for (const { chapterMap, anchors } of validatedChapterMaps) {
      if (anchors.length === 0) {
        continue;
      }

      this.uniqueTextList(chapterMap.timelineEvents ?? []).forEach(
        (timelineItem, index) => {
          const relation = this.parseTemporalRelationLine(timelineItem);
          if (!relation || this.isAlternativeTimelineCue(timelineItem)) {
            return;
          }

          const source = eventByLabel.get(this.toEntityId(relation.source));
          const target = eventByLabel.get(this.toEntityId(relation.target));
          if (!source || !target) {
            return;
          }

          edges.push({
            sourceEventId: source.id,
            targetEventId: target.id,
            relation: relation.relation,
            confidence: 0.72,
            evidence: [anchors[index % anchors.length]],
            ruleId: "explicit-temporal-relation",
          });
        },
      );
    }

    const sameTimeEvents = events.filter((event) =>
      this.isSameTimeText(event.relativeTimeText),
    );
    for (let index = 0; index < sameTimeEvents.length; index += 1) {
      for (
        let nextIndex = index + 1;
        nextIndex < sameTimeEvents.length;
        nextIndex += 1
      ) {
        const source = sameTimeEvents[index];
        const target = sameTimeEvents[nextIndex];
        if (
          !source ||
          !target ||
          this.isAlternativeTimelineCue(source.summary) ||
          this.isAlternativeTimelineCue(target.summary)
        ) {
          continue;
        }

        edges.push({
          sourceEventId: source.id,
          targetEventId: target.id,
          relation: "same_time",
          confidence: 0.66,
          evidence: [...source.evidence, ...target.evidence],
          ruleId: "same-relative-time-text",
        });
      }
    }

    const eventById = new Map(events.map((event) => [event.id, event]));
    for (const edge of edges) {
      const source = eventById.get(edge.sourceEventId);
      if (!source) {
        continue;
      }
      source.relations.push({
        targetEventId: edge.targetEventId,
        relation: edge.relation,
        confidence: edge.confidence,
      });
    }

    return edges;
  }

  private buildTemporalGraph(
    events: StoryEvent[],
    temporalEdges: TemporalEdge[],
  ): StoryAuditResult["views"]["temporalGraph"] {
    return {
      eventIds: events.map((event) => event.id),
      relationEdges: temporalEdges.map((edge) => ({
        sourceEventId: edge.sourceEventId,
        targetEventId: edge.targetEventId,
        relation: edge.relation,
        confidence: edge.confidence,
        evidenceAnchorIds: edge.evidence.map((anchor) => anchor.anchorId),
        ruleId: edge.ruleId,
      })),
      conflictCandidateIds: [],
    };
  }

  private buildTemporalConflictCandidates(
    events: StoryEvent[],
    temporalEdges: TemporalEdge[],
  ): StoryAuditFinding[] {
    const eventById = new Map(events.map((event) => [event.id, event]));
    const normalizedEdges = temporalEdges
      .map((edge) => this.toBeforeEdge(edge))
      .filter((edge): edge is TemporalEdge => Boolean(edge));
    const candidates: StoryAuditFinding[] = [];
    const seen = new Set<string>();

    for (const edge of normalizedEdges) {
      const reversePath = this.findBeforePath(
        edge.targetEventId,
        edge.sourceEventId,
        normalizedEdges,
        new Set([edge.sourceEventId]),
      );
      if (!reversePath.length) {
        continue;
      }

      const key = [edge.sourceEventId, edge.targetEventId].sort().join("|");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const source = eventById.get(edge.sourceEventId);
      const target = eventById.get(edge.targetEventId);
      if (!source || !target) {
        continue;
      }

      const evidence = this.uniqueEvidence([
        ...edge.evidence,
        ...reversePath.flatMap((item) => item.evidence),
      ]);

      candidates.push({
        id: `${edge.sourceEventId}-timeline-cycle`,
        category: "timeline_conflict",
        severity: evidence.length >= 2 ? "high" : "medium",
        status: "candidate",
        title: "时间先后关系成环候选",
        claim: `“${source.summary}”与“${target.summary}”之间存在互相先于对方的时间关系，需要复核真实故事顺序。`,
        evidence,
        relatedFactIds: [],
        relatedEventIds: [source.id, target.id],
        ruleIds: ["temporal-before-cycle"],
        alternativeExplanations: [
          "其中一段可能是倒叙、梦境、预言或转述，不属于同一真实时间线。",
          "角色可能在撒谎或叙述者不可靠，文本后续可能会纠正顺序。",
          "当前 map 可能把叙述顺序误读成故事时间，需要人工确认。",
        ],
        readerImpact:
          "若这些关系都发生在同一真实时间线，读者可能难以判断事件因果。",
        fixAction:
          "标明倒叙/转述边界，或调整其中一个事件的先后表达与证据位置。",
        confidence: evidence.length >= 2 ? 0.76 : 0.62,
      });
    }

    return candidates;
  }

  private buildAgeContradictionCandidates(
    facts: StoryFact[],
  ): StoryAuditFinding[] {
    const ageFacts = facts.filter((fact) => fact.kind === "age");
    const factsBySubject = new Map<string, StoryFact[]>();
    for (const fact of ageFacts) {
      const subjectFacts = factsBySubject.get(fact.subjectId) ?? [];
      subjectFacts.push(fact);
      factsBySubject.set(fact.subjectId, subjectFacts);
    }

    const candidates: StoryAuditFinding[] = [];
    for (const [subjectId, subjectFacts] of factsBySubject.entries()) {
      for (let index = 0; index < subjectFacts.length; index += 1) {
        for (
          let nextIndex = index + 1;
          nextIndex < subjectFacts.length;
          nextIndex += 1
        ) {
          const left = subjectFacts[index];
          const right = subjectFacts[nextIndex];
          if (!left || !right) {
            continue;
          }
          const leftAge = this.parseAgeNumber(left.object);
          const rightAge = this.parseAgeNumber(right.object);
          if (
            leftAge === null ||
            rightAge === null ||
            leftAge === rightAge ||
            this.hasTimeProgressionCue(left.object) ||
            this.hasTimeProgressionCue(right.object)
          ) {
            continue;
          }

          candidates.push({
            id: `${subjectId}-age-contradiction`,
            category: "fact_contradiction",
            severity: "medium",
            status: "candidate",
            title: "人物年龄矛盾候选",
            claim: `同一人物出现“${left.object}”和“${right.object}”两种年龄表述，需要确认是否存在时间跳跃或身份伪装。`,
            evidence: this.uniqueEvidence([
              ...left.evidence,
              ...right.evidence,
            ]),
            relatedFactIds: [left.id, right.id],
            relatedEventIds: [],
            ruleIds: ["same-subject-age-mismatch"],
            alternativeExplanations: [
              "章节之间可能有明确时间跳跃，年龄变化合理。",
              "其中一个年龄可能来自角色谎报、传闻或误认。",
              "同名人物或化名可能被 map 暂时合并，需要人工拆分。",
            ],
            readerImpact:
              "如果没有时间跳跃或身份解释，人物基本信息会削弱读者信任。",
            fixAction:
              "补明时间跨度、年龄来源，或拆分同名/伪装人物的身份线索。",
            confidence: 0.7,
          });
        }
      }
    }

    return candidates;
  }

  private buildLocationConflictCandidates(
    events: StoryEvent[],
    temporalEdges: TemporalEdge[],
  ): StoryAuditFinding[] {
    const eventById = new Map(events.map((event) => [event.id, event]));
    return temporalEdges
      .filter((edge) => edge.relation === "same_time")
      .map((edge): StoryAuditFinding | null => {
        const source = eventById.get(edge.sourceEventId);
        const target = eventById.get(edge.targetEventId);
        if (!source || !target) {
          return null;
        }

        const sharedParticipants = source.participantIds.filter((participant) =>
          target.participantIds.includes(participant),
        );
        const sourceLocation = source.locationIds[0];
        const targetLocation = target.locationIds[0];
        if (
          sharedParticipants.length === 0 ||
          !sourceLocation ||
          !targetLocation ||
          sourceLocation === targetLocation
        ) {
          return null;
        }

        return {
          id: `${source.id}-${target.id}-same-time-location`,
          category: "location_conflict",
          severity: "high",
          status: "candidate",
          title: "同一时间异地候选",
          claim: `同一人物在同一时间分别出现在“${sourceLocation}”和“${targetLocation}”，需要复核是否有分身、传送或叙述切换。`,
          evidence: this.uniqueEvidence([
            ...source.evidence,
            ...target.evidence,
          ]),
          relatedFactIds: [],
          relatedEventIds: [source.id, target.id],
          ruleIds: ["same-time-different-location"],
          alternativeExplanations: [
            "人物可能具备分身、传送、投影或远程操控能力。",
            "其中一段可能是倒叙、梦境、预言、转述或角色误认。",
            "两个名字可能指向不同人物，需要进一步实体消歧。",
          ],
          readerImpact:
            "如果没有能力或叙述边界解释，读者会感觉人物行动位置不自洽。",
          fixAction:
            "补一处时间切换、能力说明或地点过渡，或拆分被误合并的人物。",
          confidence: 0.72,
        };
      })
      .filter((candidate): candidate is StoryAuditFinding =>
        Boolean(candidate),
      );
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

  private parseTimelineEventMarker(value: string): {
    label?: string;
    summary: string;
  } {
    const match = value.match(/^\[(?:id|event):([a-zA-Z0-9_-]+)\]\s*(.+)$/i);
    if (!match) {
      return { summary: value.trim() };
    }

    return {
      label: match[1],
      summary: match[2]?.trim() || value.trim(),
    };
  }

  private parseTemporalRelationLine(value: string): {
    source: string;
    relation: TemporalRelation;
    target: string;
  } | null {
    const bracketMatch = value.match(
      /^\[rel:([a-zA-Z0-9_-]+)\s+(before|after|same_time|overlaps|during|unknown)\s+([a-zA-Z0-9_-]+)\]/i,
    );
    if (bracketMatch) {
      return {
        source: bracketMatch[1] ?? "",
        relation: this.normalizeTemporalRelation(bracketMatch[2] ?? ""),
        target: bracketMatch[3] ?? "",
      };
    }

    const chineseBefore = value.match(
      /^(.{1,32}?)(?:早于|先于|在)(.{1,32}?)(?:之前|前)$/,
    );
    if (chineseBefore) {
      return {
        source: chineseBefore[1]?.trim() ?? "",
        relation: "before",
        target: chineseBefore[2]?.trim() ?? "",
      };
    }

    const chineseAfter = value.match(
      /^(.{1,32}?)(?:晚于|后于|在)(.{1,32}?)(?:之后|后)$/,
    );
    if (chineseAfter) {
      return {
        source: chineseAfter[1]?.trim() ?? "",
        relation: "after",
        target: chineseAfter[2]?.trim() ?? "",
      };
    }

    return null;
  }

  private normalizeTemporalRelation(value: string): TemporalRelation {
    switch (value) {
      case "before":
      case "after":
      case "overlaps":
      case "during":
      case "same_time":
      case "unknown":
        return value;
      default:
        return "unknown";
    }
  }

  private parseAbsoluteTime(summary: string): string | undefined {
    const isoDate = summary.match(/\b\d{4}-\d{2}-\d{2}\b/);
    return isoDate?.[0];
  }

  private parseRelativeTimeText(summary: string): string | undefined {
    const explicit = summary.match(/(?:时间|time)[:：]([^｜|，。；;\s]+)/i);
    if (explicit?.[1]) {
      return explicit[1].trim();
    }

    const relative = summary.match(
      /(同一时间|与此同时|同时|未知时间|unknown|倒叙|回忆|梦境|预言|转述|[一二三四五六七八九十\d]+年前|[一二三四五六七八九十\d]+年后|第[一二三四五六七八九十\d]+天)/i,
    );
    if (!relative?.[1]) {
      return undefined;
    }

    return /unknown|未知时间/i.test(relative[1]) ? "unknown" : relative[1];
  }

  private parseLocationIds(summary: string): string[] {
    const explicit = summary.match(/(?:地点|location)[:：]([^｜|，。；;\s]+)/i);
    if (explicit?.[1]) {
      return [this.toEntityId(explicit[1])];
    }

    const natural = summary.match(/(?:在|位于|抵达|赶到)([^，。；;｜|]{1,20})/);
    if (!natural?.[1]) {
      return [];
    }

    return [this.toEntityId(natural[1])];
  }

  private parseAgeFact(signal: string): { subjectId: string } | null {
    const age = this.parseAgeNumber(signal);
    if (age === null) {
      return null;
    }

    const subjectText = signal
      .replace(/[，。；;].*$/, "")
      .replace(/(?:年龄|年纪|已经|约|是|为)?\d{1,3}\s*岁.*$/, "")
      .replace(/^(此时|现在|三年后|十年后|多年后)/, "")
      .trim();

    return {
      subjectId: this.toEntityId(subjectText || "unknown-character"),
    };
  }

  private parseAgeNumber(value: string): number | null {
    const match = value.match(/(\d{1,3})\s*岁/);
    if (!match?.[1]) {
      return null;
    }

    const age = Number(match[1]);
    return Number.isInteger(age) && age > 0 && age < 150 ? age : null;
  }

  private hasTimeProgressionCue(value: string): boolean {
    return /(多年后|[一二三四五六七八九十\d]+年后|长大后|成年后|十年后|三年后)/.test(
      value,
    );
  }

  private isSameTimeText(value: string | undefined): boolean {
    return Boolean(value && /同一时间|与此同时|同时|same/i.test(value));
  }

  private isAlternativeTimelineCue(value: string): boolean {
    return /(倒叙|回忆|梦境|梦里|预言|转述|传闻|撒谎|不可靠叙述)/.test(value);
  }

  private buildEventLabelIndex(events: StoryEvent[]): Map<string, StoryEvent> {
    const result = new Map<string, StoryEvent>();
    for (const event of events) {
      const label = event.id.match(/-event-([^/]+)$/)?.[1];
      if (label) {
        result.set(label, event);
      }
      result.set(this.toEntityId(event.summary), event);
    }
    return result;
  }

  private toBeforeEdge(edge: TemporalEdge): TemporalEdge | null {
    if (edge.relation === "before") {
      return edge;
    }
    if (edge.relation === "after") {
      return {
        ...edge,
        sourceEventId: edge.targetEventId,
        targetEventId: edge.sourceEventId,
        relation: "before",
      };
    }
    return null;
  }

  private findBeforePath(
    fromEventId: string,
    toEventId: string,
    edges: TemporalEdge[],
    visited: Set<string>,
  ): TemporalEdge[] {
    for (const edge of edges) {
      if (edge.sourceEventId !== fromEventId) {
        continue;
      }
      if (edge.targetEventId === toEventId) {
        return [edge];
      }
      if (visited.has(edge.targetEventId)) {
        continue;
      }

      visited.add(edge.targetEventId);
      const nestedPath = this.findBeforePath(
        edge.targetEventId,
        toEventId,
        edges,
        visited,
      );
      if (nestedPath.length) {
        return [edge, ...nestedPath];
      }
    }

    return [];
  }

  private uniqueEvidence(
    anchors: StoryEvidenceAnchor[],
  ): StoryEvidenceAnchor[] {
    const seen = new Set<string>();
    const result: StoryEvidenceAnchor[] = [];
    for (const anchor of anchors) {
      if (seen.has(anchor.anchorId)) {
        continue;
      }
      seen.add(anchor.anchorId);
      result.push(anchor);
    }
    return result;
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
