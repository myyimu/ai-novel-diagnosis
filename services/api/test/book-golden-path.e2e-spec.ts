import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import {
  setupPgliteEnv,
  teardownPgliteEnv,
  type PgliteTestEnv,
} from "./helpers/pglite-env";

jest.setTimeout(120000);

// 与 main.ts 的引导保持一致（全局前缀 + 全局校验管道），负例断言才有意义。
const API = "/api/v1/analysis";

const chapterSentence =
  "林凡在雨夜里穿过长街，灯影摇晃，他攥紧袖中那枚碎裂的玉符，想起三年前评审会上众人冷笑的脸，脚下的水洼映出他现在必须赢回来的每一个名字。";
const chapterTitle = "第一章 雨夜入城";

function buildChapterText(title: string): string {
  return `${title}\n\n${chapterSentence.repeat(8)}`;
}

const bookText = [
  buildChapterText("第一章 雨夜入城"),
  buildChapterText("第二章 旧债重现"),
  buildChapterText("第三章 考场相见"),
].join("\n\n");
// mock quickScore 的分界是 300 字：>=300 得 6.2，否则 5.4。
const quickReviewText = chapterSentence.repeat(8);
const v1Text = chapterSentence.repeat(4);
const v2Text = chapterSentence.repeat(8);

const projectId = "project-golden-e2e";
const project = {
  id: projectId,
  name: "黄金之路样书",
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
};
const baselineSession = {
  id: "session-r1",
  projectId,
  createdAt: "2026-08-18T01:00:00.000Z",
  chapterTitle,
  genre: "xuanhuan",
  inputKind: "human-draft",
  textHash: "hash-r1",
  textLength: v1Text.length,
  quickScore: 6.2,
  gateDecision: "revise",
  mainProblem: "开篇人物目标不清。",
  issueTitles: ["开篇人物目标不清。"],
  retestStatus: "completed" as const,
  methodologyCardIds: [],
};
const pendingSession = {
  id: "session-r2",
  projectId,
  createdAt: "2026-08-18T02:00:00.000Z",
  chapterTitle,
  genre: "xuanhuan",
  inputKind: "human-draft",
  textHash: "hash-r2",
  textLength: v2Text.length,
  // pending 会话携带改稿前诊断快照（R1 的分数），复诊对比以此为基线。
  quickScore: 6.2,
  gateDecision: "revise",
  mainProblem: "开篇人物目标不清。",
  issueTitles: ["开篇人物目标不清。"],
  retestStatus: "pending" as const,
  fromVersionId: "version-v1",
  toVersionId: "version-v2",
  methodologyCardIds: [],
};
const versionV1 = {
  id: "version-v1",
  projectId,
  createdAt: "2026-08-18T01:30:00.000Z",
  chapterTitle,
  versionLabel: "V1",
  textHash: "hash-v1",
  textLength: v1Text.length,
  text: v1Text,
};
const versionV2 = {
  id: "version-v2",
  projectId,
  createdAt: "2026-08-18T01:45:00.000Z",
  chapterTitle,
  versionLabel: "V2",
  textHash: "hash-v2",
  textLength: v2Text.length,
  text: v2Text,
  previousVersionId: "version-v1",
};

describe("Book golden path (e2e)", () => {
  let app: INestApplication;
  let pglite: PgliteTestEnv | undefined;

  beforeAll(async () => {
    pglite = await setupPgliteEnv("ai-novel-golden-");
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["/metrics", "/health"] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await teardownPgliteEnv(pglite);
  });

  it("should walk the golden path from upload to retest and export when using the mock provider", async () => {
    const server = app.getHttpServer();

    // 1. 建项目
    await request(server)
      .post(`${API}/workspace/projects`)
      .send({ project })
      .expect(200);

    // 2. 上传 3 章 TXT
    const uploadRes = await request(server)
      .post(`${API}/book/uploads`)
      .field("title", project.name)
      .field("genre", "xuanhuan")
      .field("encoding", "utf-8")
      .attach("file", Buffer.from(bookText, "utf8"), {
        filename: "golden-path.txt",
      })
      .expect(201);
    const uploadId: string = uploadRes.body.data.id;
    expect(uploadId).toBeTruthy();

    // 3. own-draft 任务（mock provider，触发 story-audit）
    const jobRes = await request(server)
      .post(`${API}/book/uploads/${uploadId}/jobs`)
      .send({
        provider: { kind: "mock" },
        purpose: "own-draft",
        profiles: ["full"],
      })
      .expect(202);
    const jobId: string = jobRes.body.data.id;
    expect(jobId).toBeTruthy();

    // 4. 轮询直至成功（500ms 间隔，60s 上限）
    await waitForBookJob(server, jobId);
    const jobDetail = await request(server)
      .get(`${API}/book/jobs/${jobId}`)
      .expect(200);
    expect(jobDetail.body.data.status).toBe("succeeded");
    expect(jobDetail.body.data.result.storyAudit).toBeTruthy();
    expect(jobDetail.body.data.result.storyAudit.verification).toMatchObject({
      attemptedCount: 0,
    });

    // 5. 快速点评：mock + >=300 字 → quickScore 6.2
    const quickRes = await request(server)
      .post(`${API}/quick-review`)
      .send({
        provider: { kind: "mock" },
        chapterText: quickReviewText,
        title: chapterTitle,
        genre: "xuanhuan",
      })
      .expect(200);
    expect(quickRes.body.data.quickScore).toBe(6.2);

    // 6. V1 + 基线会话 R1（completed，带 quickScore）
    await request(server)
      .post(`${API}/workspace/revision-assets`)
      .send({
        project,
        session: baselineSession,
        revisionVersions: [versionV1],
        methodologyCards: [],
      })
      .expect(200);

    // 7. V2 + pending 会话 R2（回写 bookJobId，导出时可关联 story-audit）
    await request(server)
      .post(`${API}/workspace/revision-assets`)
      .send({
        project: {
          ...project,
          bookJobId: jobId,
          updatedAt: "2026-08-18T03:00:00.000Z",
        },
        session: pendingSession,
        revisionVersions: [versionV2],
        methodologyCards: [],
      })
      .expect(200);

    // 8. 服务端复诊：就地更新 R2 为 completed，并派生对比
    const retestRes = await request(server)
      .post(`${API}/workspace/revision-sessions/${pendingSession.id}/retest`)
      .send({ provider: { kind: "mock" } })
      .expect(200);
    expect(retestRes.body.data.session.retestStatus).toBe("completed");
    expect(retestRes.body.data.session.quickScore).toBe(6.2);
    expect(retestRes.body.data.comparison).toBeTruthy();

    // 9. 导出 Markdown 含复诊轨迹
    const exportRes = await request(server)
      .get(`${API}/workspace/projects/${projectId}/export`)
      .expect(200);
    expect(exportRes.text).toContain("复诊轨迹");
    expect(exportRes.text).toContain(project.name);
  });

  it("should return 404 when retesting an unknown session", async () => {
    await request(app.getHttpServer())
      .post(`${API}/workspace/revision-sessions/session-does-not-exist/retest`)
      .send({ provider: { kind: "mock" } })
      .expect(404);
  });

  it("should return 400 when retest toVersionText is shorter than 50 chars", async () => {
    await request(app.getHttpServer())
      .post(`${API}/workspace/revision-sessions/${pendingSession.id}/retest`)
      .send({ provider: { kind: "mock" }, toVersionText: "太短的复诊正文。" })
      .expect(400);
  });
});

async function waitForBookJob(
  server: ReturnType<INestApplication["getHttpServer"]>,
  jobId: string,
): Promise<void> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const res = await request(server)
      .get(`${API}/book/jobs/${jobId}`)
      .expect(200);
    const status: string = res.body.data.status;
    if (status === "succeeded") {
      return;
    }
    if (status === "failed" || Date.now() > deadline) {
      throw new Error(
        `book job ${jobId} ended as ${status}: ${JSON.stringify(
          res.body.data.progress ?? {},
        )}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
