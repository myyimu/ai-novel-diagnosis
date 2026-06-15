# 新手AI小说第一步 技术架构

定位：本地部署的 AI 网文点评官，用热门章节拆解出的优点生成评分标准，再用评分标准质检用户自己的章节。

## Workspace

- `apps/web`: Next.js 控制台，负责拆书样本、章节评分、模型配置和报告展示。
- `services/api`: NestJS API，负责项目、文本、模型配置、任务与报告接口。
- `packages/ai-core`: 共享类型、评分指标、Provider 抽象和分析流水线契约。
- `docker-compose.yml`: 本地部署入口，预留 PostgreSQL、Redis、MinIO、API、Web。

## MVP 流程

```text
上传成熟章节
-> 选择题材、目标平台、目标读者、阅读场景
-> 生成 Style Profile
-> 填写分类、主题、标签、显性关键词、隐性期待
-> 生成 Market Profile
-> 可选填写展现量、点击率、阅读30s、阅读60s、触底率、追更率
-> 生成 Performance Snapshot
-> 清洗和章节切分
-> 拆解目标/冲突/情绪债/钩子
-> 抽象可迁移原则
-> 生成题材评分表
-> 上传我的章节
-> 按评分表打分
-> Critic Pass 校验
-> 输出证据、短板、改法
```

Style Profile 当前覆盖：

- 目标平台：起点、番茄、晋江、七猫、微信短篇/小程序文、其他。
- 目标读者：男频快节奏爽文、女频情绪流、设定党、快节奏小白文、悬疑脑洞、其他。
- 阅读场景：长篇追更、移动端碎片阅读、短篇付费、其他。

Rubric 会额外加入 `平台节奏匹配度` 和 `目标读者匹配度`，评分报告会输出 `styleFit`，用于识别“故事结构可用但不适合目标平台”的问题。

Market Profile 当前覆盖：

- 细分分类：例如都市神医、赘婿逆袭、追妻火葬场、真假千金。
- 主题承诺：例如逆袭打脸、救赎、破镜重圆、悬疑解谜。
- 标签：读者识别作品的 trope 或卖点标签。
- 显性关键词：标题、简介、正文中可以自然出现的词。
- 隐性期待：关键词背后的结构期待，例如“追妻火葬场 = 亏欠 + 离开 + 后悔 + 追逐”。
- 标题/简介承诺：用于检查正文是否兑现点击承诺。

Rubric 会额外加入 `分类期待匹配度`、`主题承诺清晰度`、`关键词与标签命中度`、`卖点前置程度`。评分报告会输出 `marketFit`，用于识别“章节可读但没有命中目标读者点击期待”的问题。

Performance Snapshot 当前覆盖：

- 展现量：辅助判断分发入口、分类标签、平台推荐是否匹配。
- 点击率：辅助判断标题、简介、封面、关键词承诺和正文卖点是否一致。
- 阅读30s：辅助判断开头理解成本、初始钩子、卖点前置。
- 阅读60s：辅助判断冲突升级、情绪维持、信息增量。
- 触底率：辅助判断章节中后段节奏、空转、重复信息。
- 追更率：辅助判断结尾钩子、长期目标、系列承诺。

评分报告会输出 `performanceFit`。这些数据只做归因辅助，不能把低数据直接等同于文本差；模型必须结合章节证据判断可能原因。

## Revision Prompt

评分报告会输出 `revisionPrompt`，用于把点评结果转换成可复制给写作 AI 的改文提示词。它必须包含：

- 修改目标：优先解决哪些追读、点击、留存问题。
- 平台风格：目标平台、读者、阅读场景。
- 市场定位：分类、主题、标签、关键词、隐性期待。
- 数据表现：展现、点击、30s、60s、触底、追更漏斗。
- 改写边界：保留人物、场景和剧情事实，不另起炉灶。
- 禁止事项：不堆设定、不机械堆关键词、不只润色文笔。
- 输出格式：要求写作 AI 返回改写策略、改动段落、改写正文和改动理由。

## Book Asset Analysis

整书拆解接口：

- `POST /api/v1/analysis/book/uploads`: 上传 TXT，保存原始文本和清洗文本，返回章节切分预览。
- `GET /api/v1/analysis/book/uploads/:uploadId`: 读取上传记录和章节预览。
- `POST /api/v1/analysis/book/uploads/:uploadId/jobs`: 基于已上传 TXT 创建整书 Map-Reduce 异步任务。
- `GET /api/v1/analysis/book/jobs/:jobId`: 查询任务状态、进度、结果或失败原因。
- `POST /api/v1/analysis/book`: 兼容旧同步调用，内部也走 Map-Reduce 核心。

MVP 支持上传 TXT 后先预览章节切分，再启动整书拆解任务，输出：

- 世界观：世界规则、能力体系、地点、势力、专有名词风险。
- 人物：角色原型、性格底色、欲望、创伤、能力功能、原创化角色卡。
- 关系图谱：nodes / edges，先用结构化 JSON 表示，后续可渲染成图。
- 故事线：主线、成长线、感情线、副本线、阴谋线。
- 大事纪：事件顺序、影响、叙事功能。
- 世界历史书：远古史、近代事件、公开传说、隐藏真相。
- 导出包：酒馆/AI 写作软件角色卡草稿、世界书条目、写作约束、Do Not Copy 清单。
- 原创化报告：可学习原则、必须转换元素、同人/换皮风险提示、原创化迁移策略。
- 原作拆解笔记：保留原作人物、世界观、时间线、关系网、专有名词的结构化笔记，用于学习、研究、合法授权或个人私用场景。
- 使用风险提示：推荐用途、较高风险用途、用户责任说明。

产品原则：工具不预设用户意图，允许同时保留“原作拆解笔记”和“原创化导出包”。原作拆解笔记用于读书笔记、学习分析、合法授权素材整理或个人私用角色扮演；原创化导出包用于低风险迁移。界面必须明确风险提示，默认不鼓励未授权商业化复制原作姓名、专有名词、人物关系网、关键事件链或世界历史具体事件。

```text
TXT 上传
-> 保存 raw.txt 和 normalized.txt
-> 清洗/切章预览
-> 用户确认后创建 book_analysis_jobs
-> 每章 Map 分析
-> 全书 Reduce 归纳
-> 任务结果持久化
-> 图谱/时间线/世界书展示和导出
```

## Model Provider

默认采用 BYOK：

- `mock`: 本地开发和自动化测试。
- `openai-compatible`: 兼容 OpenAI 风格接口的远程或本地模型。
- 供应商预设：`deepseek`、`doubao`、`qwen`、`ollama`、`custom`。
- `doubao` / `deepseek` / `qwen` / `ollama` 本质仍走统一 `ModelProviderService`，对业务层暴露 `chat()` 和 `test()`。

用户 Key 随请求进入本地 API，不持久化；日志不得打印 Key、正文全文和模型原始响应。后续如果做本地模型配置保存，需要先实现本地加密存储和显式授权。

## API Skeleton

- `GET /api/v1/analysis/pipeline`: 返回计划中的分析流水线。
- `POST /api/v1/analysis/preview`: 不调用真实模型，返回结构化评分预览。
- `POST /api/v1/analysis/provider/test`: 测试 mock 或 OpenAI-compatible Provider。
- `POST /api/v1/analysis/rubric`: 从成熟章节生成原则和 Rubric。
- `POST /api/v1/analysis/score`: 用 Rubric 质检用户章节。
- `POST /api/v1/analysis/book/preprocess`: 直接对文本做清洗和章节切分预览。
- `POST /api/v1/analysis/book/uploads`: 上传 TXT 并生成持久化章节预览。
- `GET /api/v1/analysis/book/uploads/:uploadId`: 读取上传预览。
- `POST /api/v1/analysis/book/uploads/:uploadId/jobs`: 从上传文本创建整书异步任务。
- `GET /api/v1/analysis/book/jobs/:jobId`: 查询整书异步任务状态。

Provider Key 随本次请求进入本地 API，不持久化。任务状态、清洗预览和结果会持久化；如果服务重启时任务仍处于 `queued` 或 `running`，系统会把任务标记为 `failed` 并要求用户重新提交，因为恢复远程模型任务需要用户重新提供 Key。

后续可把当前本地任务执行器替换为 Redis/BullMQ Worker：

```text
analysis_jobs
-> Redis Queue
-> analysis_worker
-> llm_provider
-> reports
```

## Storage Plan

- PGlite/PostgreSQL: 用户项目、上传记录、章节预览、任务状态、评分表、报告。
- pgvector: 原则库、同题材案例检索。
- Redis: 后续承接分布式异步任务队列和短期任务状态。
- Local FS / MinIO: 原始上传文件、清洗后文本和导出报告。MVP 默认使用 `.local/analysis`。

## Naming

产品中文名：`新手AI小说第一步`

理由：直接覆盖“新手怎么用 AI 写小说”“AI 写网文第一步”“新手用 AI 写小说遇到的困难”等搜索意图，同时保留产品解释空间。副标题使用 `AI网文点评官`，让用户立即理解它不是代写工具，而是拆书、评分和改稿质检工具。
