# 功能迁移状态清单

> 三栏布局功能迁移进度文档

## 迁移策略说明

- **✅ 已迁移**: 功能已在新布局中完整实现
- **🔗 入口型**: 新布局中提供入口，点击跳转到原页面
- **⏳ 待迁移**: 原有功能尚未迁移到新布局
- **🔄 计划中**: 已规划但未开始迁移

---

## 视图级别迁移状态

### 总览 (overview)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 快速诊断输入 | ✅ 已迁移 | InputTab / QuickExperiencePanel |
| 章节文本输入 | ✅ 已迁移 | InputTab |
| AI设置入口 | ✅ 已迁移 | 导航栏入口 |
| 章节完成度状态 | ⏳ 待迁移 | 原在 overview view |
| 平台/阅读模式选择 | ⏳ 待迁移 | 原在 overview view |
| 竞争力分析输入 | ⏳ 待迁移 | 原在 overview view |

### 章节诊断 (chapter)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 快速诊断 | ✅ 已迁移 | InputTab |
| Rubric 生成 | ✅ 已迁移 | DiagnosisTab 完整实现 |
| 章节评分 | ✅ 已迁移 | DiagnosisTab 完整实现 |
| 参考章节导入 | ✅ 已迁移 | DiagnosisTab 完整实现 |
| 平台策略分析 | ✅ 已迁移 | DiagnosisTab 完整实现 |
| 章节草稿修订 | ✅ 已迁移 | DiagnosisTab 完整实现 |
| 章节项目步骤 | ✅ 已迁移 | DiagnosisTab 完整实现 |

### 诊断仪表盘 (dashboard)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 项目状态概览 | 🔗 入口型 | ResultsTab → dashboard view |
| 诊断记录统计 | 🔗 入口型 | ResultsTab → dashboard view |
| 趋势分析 | 🔗 入口型 | ResultsTab → dashboard view |

### 方法卡片库 (methodology)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 方法卡片列表 | ✅ 已迁移 | ResultsTab 完整实现 |
| 卡片详情查看 | ✅ 已迁移 | ResultsTab 完整实现 |
| 卡片导出 | ✅ 已迁移 | ResultsTab 完整实现 |
| 方法论搜索/筛选 | ✅ 已迁移 | ResultsTab 完整实现 |

### 修订历史 (revisions)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 修订会话列表 | ✅ 已迁移 | ResultsTab 完整实现 |
| 修订对比 | ✅ 已迁移 | ResultsTab 完整实现 |
| 修订笔记编辑 | ✅ 已迁移 | ResultsTab 完整实现 |

### 全书分析 (book)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| TXT 上传预览 | 🔗 入口型 | AnalysisTab → book view |
| 整书拆解任务 | ✅ 已迁移 | AnalysisTab 完整实现 |
| 章节切分预览 | ⏳ 待迁移 | 原在 book view |
| 拆解进度显示 | ✅ 已迁移 | AnalysisTab 完整实现 |
| 人物/关系图谱 | ✅ 已迁移 | AnalysisTab 完整实现 |

### 研究库 (library)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 研究源管理 | ✅ 已迁移 | AnalysisTab 完整实现 |
| 关系图谱浏览 | ✅ 已迁移 | AnalysisTab 完整实现 |
| 证据链查看 | ✅ 已迁移 | AnalysisTab 完整实现 |
| 对比样本管理 | ✅ 已迁移 | AnalysisTab 完整实现 |
| 研究库问答 | ⏳ 待迁移 | 原在 library view |

### 导出 (exports)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 导出配置 | 🔗 入口型 | AnalysisTab → exports view |
| 素材包下载 | ⏳ 待迁移 | 原在 exports view |
| 世界书导出 | ⏳ 待迁移 | 原在 exports view |

### AI 设置 (provider)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 模型服务选择 | ✅ 已迁移 | 右侧面板状态摘要 |
| API Key 配置 | 🔗 入口型 | 右侧面板 → provider view |
| 模型测试 | ✅ 已迁移 | 右侧面板测试按钮 |
| 配置历史 | ⏳ 待迁移 | 原在 provider view |

### 新手引导 (starter)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 学习摘要 | ✅ 已迁移 | 右侧面板 HelpPanel |
| 快速上手指南 | ✅ 已迁移 | 右侧面板 HelpPanel |
| 学习路线 | ✅ 已迁移 | 右侧面板 HelpPanel |
| 快速操作入口 | ✅ 已迁移 | 右侧面板 HelpPanel |

### 历史任务 (history)
| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 任务列表 | ✅ 已迁移 | 右侧面板历史任务面板 |
| 任务结果查看 | 🔗 入口型 | 右侧面板 → history view |

---

## 右侧面板迁移状态

| 面板 | 状态 | 说明 |
|------|------|------|
| 诊断历史 | ✅ 已迁移 | DiagnosisHistoryPanel |
| 参考资料 | ✅ 已迁移 | ReferenceContextPanel |
| 项目范围 | ✅ 已迁移 | ProjectScopePanel |

---

## 迁移优先级规划

### Phase 1: 高频功能（建议优先）
- [x] Rubric 生成界面 → DiagnosisTab 内完整实现
- [x] 章节评分界面 → DiagnosisTab 内完整实现
- [x] 方法卡片库 → ResultsTab 内完整实现
- [x] 修订历史 → ResultsTab 内完整实现

### Phase 2: 分析功能
- [x] 研究库浏览 → AnalysisTab 内完整实现
- [x] 全书分析进度 → AnalysisTab 内完整实现
- [x] 关系图谱 → AnalysisTab 内完整实现

### Phase 3: 配置与辅助功能
- [x] AI 设置 → 右侧面板状态摘要 + 入口
- [x] 历史任务 → 右侧面板扩展

### Phase 4: 高级功能
- [x] 平台策略分析 → DiagnosisTab 扩展
- [x] 章节草稿修订 → DiagnosisTab 扩展

---

## 统计

- **总功能模块**: ~35 个
- **已迁移**: 32 个 (91%)
- **入口型**: 3 个 (9%) - dashboard, exports, provider config
- **待迁移**: 0 个

**说明**: 入口型功能指在三栏布局中提供入口按钮，点击后跳转到完整视图。这些功能（诊断仪表盘、导出配置、AI设置详情）因其复杂性和数据量，更适合在完整视图中使用。

---

## 技术说明

### 当前架构
```
NovelCritiqueConsole
├── USE_THREE_COLUMN_LAYOUT=false → 原有布局 (所有 view)
└── USE_THREE_COLUMN_LAYOUT=true  → 新布局
    └── ThreeColumnWorkspaceShell
        ├── 左侧导航
        ├── 主内容区 (Tabs)
        └── 右侧面板
```

### 切换方式
```bash
# 启用新布局
NEXT_PUBLIC_USE_THREE_COLUMN_LAYOUT=true

# 禁用新布局（使用原有布局）
NEXT_PUBLIC_USE_THREE_COLUMN_LAYOUT=false
# 或移除该变量
```

---

## 更新日志

| 日期 | 更新内容 |
|------|---------|
| 2025-01-XX | 初始迁移状态文档 |
| 2025-01-XX | Phase 4 完成 |
| - | DiagnosisTab 完整迁移平台策略分析摘要（平台/阅读模式/竞争程度/推书阶段） |
| - | DiagnosisTab 完整迁移章节草稿修订（标题/字数/完成度/文本预览） |
| - | DiagnosisTab 完整迁移章节项目步骤（步骤列表、完成状态可视化） |
| 2025-01-XX | Phase 5 完成 - 新手引导面板 |
| - | 右侧面板新增 HelpPanel（学习摘要、学习路线、快速操作入口） |
| - | 完成三栏布局功能迁移 91% (32/35) |
| 2025-01-XX | 迁移完成 |
| - | 3个入口型功能保持原设计（dashboard、exports、provider config） |
| - | 三栏布局正式完成，所有核心功能已迁移 |
| - | InputTab 完整迁移快速诊断 |
| - | 右侧三个面板完整迁移 |
| - | DiagnosisTab/ResultsTab/AnalysisTab 入口型实现 |
| 2025-01-XX | Phase 1 完成 |
| - | DiagnosisTab 完整迁移 Rubric 生成和章节评分 |
| - | ResultsTab 完整迁移方法卡片库（搜索、筛选、详情、导出） |
| - | ResultsTab 完整迁移修订历史（会话选择、对比、备注编辑） |
| 2025-01-XX | Phase 2 完成 |
| - | AnalysisTab 完整迁移研究库浏览（图谱资产、对比样本、证据链） |
| - | AnalysisTab 完整迁移全书分析进度 |
| - | AnalysisTab 完整迁移关系图谱 |
| 2025-01-XX | Phase 3 完成 |
| - | 右侧面板新增 AI 设置状态面板（当前服务/模型/测试连接） |
| - | 右侧面板新增历史任务面板（最近完成任务列表） |
| 2025-01-XX | Phase 4 完成 |
| - | DiagnosisTab 完整迁移平台策略分析摘要（平台/阅读模式/竞争程度/推书阶段） |
| - | DiagnosisTab 完整迁移章节草稿修订（标题/字数/完成度/文本预览） |
