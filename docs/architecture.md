# AI网文诊断台 技术架构

## 产品定位

AI网文诊断台是本地部署、证据驱动的编辑写作教练。架构必须服务 [`product-doctrine.md`](./product-doctrine.md) 定义的主线：蒸馏编辑方法，保留作者取舍，保存真实改稿版本，并验证修改结果。

当前产品主路径不是“先填完整配置再分析”，而是：

```text
粘贴第一章或打开项目 V1
-> 运行快速质检，生成问题候选和证据
-> 作者接受、标记创作意图、误报或暂缓
-> 保存修改计划和改稿边界
-> 创建并保存 V2 正文
-> 独立复诊 issue 状态
-> 人工确认后沉淀方法
```

成熟样本拆解、Rubric、深度检查、故事体检、图谱复核和样本研究是编辑证据层，用来支撑更严肃的取舍和改稿决策，不作为相互割裂的功能终点。

## Workspace

- `apps/web`: Next.js 控制台，负责快速质检、作者确认、真实版本编辑、复诊对比、故事体检、深度质检、AI 设置、样本研究和导出。
- `apps/desktop`: Electron 桌面外壳，开发模式加载本地 Web，打包模式拉起内置 API / Next sidecar。
- `services/api`: NestJS API，负责模型调用、证据校验、问题候选、参考画像、Rubric、整书异步任务、人工判断持久化、复诊比较、研究库和导出。
- `packages/ai-core`: Web 和 API 共享的事实、issue、证据、作者判断、版本复诊、故事体检和兼容评分契约。
- `docker-compose.yml`: 本地部署入口，启动 PostgreSQL、API、Web。
- `one.manifest.json`: One CLI workspace 的项目、容器和运行入口定义。

## Frontend Information Architecture

控制台按工作流组织为四个工作区：

- 诊断工作区 `/diagnose`：`/diagnose/quick` 承接低门槛编辑初筛；`/diagnose/deep`、`/diagnose/score`、`/diagnose/evidence` 承接进阶标准和证据检查，但不能独立完成改稿闭环。
- 项目工作区 `/project`：`/project/current`、`/project/revisions`、`/project/methodology`、`/project/export` 管理正文版本、作者判断、修改计划、故事体检、复诊记录、经验证的方法和导出资产，是核心价值承载区。
- 研究工作区 `/research`：`/research/book`、`/research/compare`、`/research/patterns`、`/research/materials` 承接整书拆解、样本对比、套路沉淀和研究资料。
- 设置工作区 `/settings`：`/settings/provider`、`/settings/dashboard`、`/settings/history` 管理模型供应商、诊断看板和历史任务。

兼容路由策略：

- `/`：进入快速诊断。
- `/critique`、`/book`、`/library`、`/history`、`/export`、`/model`：保留旧入口，用于兼容外部链接和旧导航调用。
- `/workspace`、`/starter`：重定向回 `/`。

复杂参数遵循渐进暴露原则：首屏只要求章节正文；平台画像、样本 Rubric、数据快照和研究库能力后置。

## Core Product Flow

### 1. Chapter Revision Triage

```text
用户粘贴章节或选择项目 V1
-> POST /analysis/quick-review
-> 返回定位、卖点、1–3 个 issue、原文证据、替代解释、改法和兼容 quickScore
-> 服务端校验证据，作者确认 issue 状态
-> 保存改稿目标、保留项、禁止项和复诊检查点
-> 用户创建并保存 V2
-> 使用独立复核比较 issue 的解决、改善、未变、复发、新增或无法判断
```

快速质检用于降低首次使用门槛，不要求成熟样本、Rubric 或完整平台参数。它只生成编辑假设；没有真实 V2 和复诊记录时，不得显示为“修改已完成”或“Prompt 已有效”。

### 2. Advanced Chapter Critique

```text
导入成熟章节
-> POST /analysis/reference/profile
-> AI 识别分类、主题、标签、显性关键词、隐性期待、标题/简介承诺
-> POST /analysis/rubric
-> 生成成熟样本可迁移原则和评分 Rubric
-> POST /analysis/score
-> 用同一标准检查用户章节，输出证据、短板、替代解释、改法和 revisionPrompt
```

高级质检用于更系统地检查“这章是否呈现目标题材/读者期待的文本信号”。评分是兼容摘要，不能覆盖证据和人工取舍。

### 3. Story Audit for the Author's Draft

```text
项目中的整书版本
-> 复用 BookAnalysisJob 和章节 Map-Reduce
-> 程序统计对话等确定性信号
-> 抽取事件、状态、时间、设定和人物事实
-> 规则生成时间/人设/剧情候选
-> 独立 verifier 检查替代解释
-> 作者复核 finding
-> finding 进入修改计划与版本复诊
```

故事体检不新建平行任务、缓存或证据系统。结构图、人物弧光和指标只用于解释编辑判断；剧情漏洞、时间冲突和人设一致性必须区分候选、已复核和作者决定。

### 4. Full Book Asset Analysis

```text
TXT 上传
-> 保存 raw.txt 和 normalized.txt
-> 清洗/切章预览
-> 用户确认后创建 book_analysis_jobs
-> 每章 Map 分析
-> 每章 map 结果写入 jobs/{jobId}/maps 并更新 partialResult
-> 全书 Reduce 归纳
-> 任务结果持久化
-> `/book` 内打开历史任务或导出工具
-> 拆书导览/关系故事线/图谱/时间线/世界书展示和导出
```

整书任务会持久化中间结果：每完成一个章节 map，系统会把该章拆解 JSON 写入 `.local/artifacts/{jobId}/map-{chapterId}.json`，并在 job 记录里更新 `partialResult`。如果模型 token 额度不足、网络失败或 reduce 失败，上传记录、章节切分预览、已完成章节 map 和失败状态仍会保留。

### 5. Relationship Graph Workbench

```text
整书 Reduce 结果
-> 规范化 characters / relationships / worldbuilding
-> 构建图谱节点、关系边、社区、时间线和质量指标
-> 进入图谱工作台
-> 复核弱证据边、孤立节点和重复节点
-> 应用本地 correction
-> 重新计算图谱质量并导出 JSON/SVG
```

图谱工作台吸收 chargraph 的迭代思路，但服务本项目的学习闭环：

- 总览：先看核心角色、势力、地点和关系强度。
- 复核：把弱证据关系、孤立节点和疑似重复节点变成任务队列。
- 时间线：按 `firstSeenChapter` 查看关系演化。
- 导出：导出当前布局的 SVG 和带 `corrections` 的图谱 JSON。

当前 correction 是前端本地修正：支持确认关系、修改关系标签、忽略关系、合并节点和忽略节点。导出 JSON 会带上这些修正记录；独立数据库持久化是后续方向。

### 6. Research Library

```text
已完成整书任务
-> 提取图谱资产、引用证据和样本摘要
-> 多书横向对比
-> 针对研究问题做证据型问答
-> 生成选题/改稿 Prompt seed
```

研究库不追求通用聊天，而是把有权使用的样本提炼为可追溯、可迁移的编辑方法。具体姓名、专名和事件链不能进入通用方法资产。

## Analysis Dimensions

### Style Profile

- 目标平台：起点、番茄、晋江、七猫、微信短篇/小程序文、其他。
- 目标读者：男频快节奏爽文、女频情绪流、设定党、快节奏小白文、悬疑脑洞、其他。
- 阅读场景：长篇追更、移动端碎片阅读、短篇付费、其他。

评分报告可输出 `styleFit`，用于提示“当前文本信号与所选目标风格不一致”的候选，不用于预测平台表现。

### Market Profile

- 细分分类：例如都市神医、赘婿逆袭、追妻火葬场、真假千金。
- 主题承诺：例如逆袭打脸、救赎、破镜重圆、悬疑解谜。
- 标签：读者识别作品的 trope 或卖点标签。
- 显性关键词：标题、简介、正文中可以自然出现的词。
- 隐性期待：关键词背后的结构期待，例如“追妻火葬场 = 亏欠 + 离开 + 后悔 + 追逐”。
- 标题/简介承诺：用于检查正文是否兑现点击承诺。

评分报告可输出 `marketFit`，用于提示“章节文本信号可能未兑现所选题材承诺”的候选，不是市场成功概率。

### Performance Snapshot

- 展现量：辅助判断分发入口、分类标签、平台推荐是否匹配。
- 点击率：辅助判断标题、简介、封面、关键词承诺和正文卖点是否一致。
- 阅读30s/60s：辅助判断开头理解成本、初始钩子、冲突升级和情绪维持。
- 触底率：辅助判断章节中后段节奏、空转和重复信息。
- 追更、加书架、下一章点击、前3章留存：辅助判断长篇追更承诺。
- 平均阅读进度、付费解锁：辅助判断短篇付费场景。

评分报告可输出 `performanceFit`。这些数据只做相关性线索，不能把低数据直接等同于文本差，也不能仅凭章节证据宣称因果；模型必须列出其他可能原因和待补数据。

## Revision Prompt

改稿急诊和深度评分都会围绕改稿 Prompt 服务。Prompt 应包含：

- 修改目标：优先解决哪些文本风险；若关联追读、点击、留存，必须标记为待验证假设。
- 平台风格：目标平台、读者、阅读场景。
- 市场定位：分类、主题、标签、关键词、隐性期待。
- 改写边界：保留人物、场景、剧情事实和作者明确意图，不另起炉灶。
- 禁止事项：不堆设定、不机械堆关键词、不只润色文笔。
- 输出格式：要求写作 AI 返回改写策略、改动段落、改写正文、改动理由和逐项执行清单；生成结果必须作为新版本保存，不能覆盖 V1。

## API Skeleton

- `GET /api/v1/analysis/pipeline`: 返回计划中的分析流水线。
- `POST /api/v1/analysis/preview`: 不调用真实模型，返回结构化评分预览。
- `POST /api/v1/analysis/quick-review`: 改稿急诊。
- `POST /api/v1/analysis/provider/test`: 测试 mock 或 OpenAI-compatible Provider。
- `POST /api/v1/analysis/provider/models`: 拉取供应商模型列表。
- `GET /api/v1/analysis/provider/presets`: 返回模型供应商预设。
- `POST /api/v1/analysis/reference/profile`: 从成熟章节识别市场定位。
- `POST /api/v1/analysis/rubric`: 从成熟章节生成原则和 Rubric。
- `POST /api/v1/analysis/score`: 用 Rubric 质检用户章节。
- `POST /api/v1/analysis/book`: 兼容的一次性整书分析入口。
- `POST /api/v1/analysis/book/preprocess`: 直接对文本做清洗和章节切分预览。
- `POST /api/v1/analysis/book/jobs`: 从请求正文创建整书异步任务。
- `POST /api/v1/analysis/book/uploads`: 上传 TXT 并生成持久化章节预览。
- `GET /api/v1/analysis/book/uploads/:uploadId`: 读取上传预览。
- `GET /api/v1/analysis/book/uploads`: 读取上传历史。
- `POST /api/v1/analysis/book/uploads/:uploadId/jobs`: 从上传文本创建整书异步任务。
- `POST /api/v1/analysis/book/jobs/:jobId/resume`: 从已完成章节继续整书任务。
- `GET /api/v1/analysis/book/jobs/:jobId`: 查询整书异步任务状态。
- `DELETE /api/v1/analysis/book/jobs/:jobId`: 删除已结束的整书异步任务。
- `GET /api/v1/analysis/book/jobs/:jobId/search`: 搜索整书拆解证据锚点。
- `GET /api/v1/analysis/book/jobs`: 读取任务历史。
- `GET /api/v1/analysis/book/jobs/:jobId/export`: 导出拆书阅读报告、完整 Markdown、JSON、Tavern 角色卡、World Book、SillyTavern World Info、续写包、风格圣经、卷纲、提示词包、Do Not Copy 清单，支持 `mode=notes|originalized`。
- `POST /api/v1/analysis/book/skills/distill`: 从拆书结果提炼技能/方法论资产。
- `GET /api/v1/analysis/workspace/assets`: 读取项目工作区资产。
- `POST /api/v1/analysis/workspace/projects`: 创建项目。
- `POST /api/v1/analysis/workspace/revision-assets`: 保存复诊和方法论资产。
- `GET /api/v1/analysis/workspace/projects/:projectId/export`: 导出项目资产包。
- `GET /api/v1/analysis/research/library`: 读取持久化研究库资产。
- `POST /api/v1/analysis/research/compare`: 多书横向对比。
- `POST /api/v1/analysis/research/ask`: 基于研究库证据回答问题。
- `POST /api/v1/analysis/research/distill`: 从研究库提炼可复用模式。

## Storage Plan

- PGlite/PostgreSQL: 上传记录、章节预览、正文版本、作者判断、修改计划、复诊状态、任务状态、兼容评分、报告和研究库资产。
- Local FS: 原始上传文件、清洗后文本、章节 map 中间结果和导出报告。默认上传目录为 `.local/analysis`，章节 map artifact 目录为 `.local/artifacts`。

## Model Provider

- `mock`: 本地开发和自动化测试。
- `shared-gpu`: 服务端配置的共享 OpenAI-compatible 线路，用于降低首次使用门槛。
- `openai-compatible`: 兼容 OpenAI 风格接口的远程或本地模型。
- 供应商预设：`deepseek`、`doubao`、`qwen`、`ollama`、`custom`。

结构化输出按能力分层：

- 官方 OpenAI / Azure OpenAI URL：优先使用 `response_format=json_schema`。
- 明确支持 JSON Schema 的兼容供应商：可通过 `ENABLE_OPENAI_COMPAT_JSON_SCHEMA=true` 开启。
- 只支持 JSON mode 或普通聊天补全的供应商：使用 `json_object`/Prompt 约束，并保留后端 JSON 修复和 Rubric 兜底。

用户 Key 随请求进入本地 API，不持久化；日志不得打印 Key、正文全文和模型原始响应。

## Product Safety Principle

工具只提供拆解、学习、质检和导出能力，不预设用户意图。界面必须明确风险提示，默认不鼓励未授权商业化复制原作姓名、专有名词、人物关系网、关键事件链或世界历史具体事件。

模型输出是编辑假设，不是客观作品质量、读者流失因果或商业预测。工程测试证明系统可运行；产品有效性必须通过独立编辑标注和受控改稿对照实验验证。

## Naming

产品中文名：`AI网文诊断台`

产品英文名：`AI Novel Diagnosis Desk`

当前阶段保留主名称，但产品副标题升级为：

```text
证据化诊断、改稿复诊与编辑方法蒸馏系统
```

方向说明见 [产品主线、科学边界与交付原则](./product-doctrine.md)。主品牌继续讲“诊断”，产品价值统一承接编辑方法蒸馏、作者取舍、真实改稿与复诊。

命名理由：覆盖“新手怎么用 AI 写小说”“AI 写网文第一步”“新手用 AI 写小说遇到的困难”等搜索意图，同时保留产品解释空间。英文名用于界面品牌并列展示，方便后续 README、GitHub、Docker 镜像和国际化描述统一。
