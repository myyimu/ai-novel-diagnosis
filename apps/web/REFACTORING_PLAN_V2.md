# 前端工作区重构 V2

V2 重构已经落到当前四工作区结构。本文档不再维护未完成阶段计划，只保留实施后的结构说明。

## 工作区结构

```text
诊断 /diagnose
├── quick      快速诊断
├── deep       深度质检
├── score      评分报告
└── evidence   证据链

项目 /project
├── current     当前项目
├── revisions   复诊记录
├── methodology 方法论库
└── export      导出资产

研究 /research
├── book       拆书图谱
├── compare    样本对比
├── patterns   套路库
└── materials  研究资料

设置 /settings
├── provider   AI 设置
├── dashboard  诊断看板
└── history    历史任务
```

## 兼容策略

- `/` 进入 `/diagnose/quick`。
- `/workspace`、`/starter` 回到 `/`。
- `/critique`、`/book`、`/library`、`/history`、`/export`、`/model` 等旧路径继续可访问，用于兼容外部链接和旧代码调用。

## 维护边界

- 新业务页面放入四个工作区，不新增旧式一级入口。
- 路由事实以 `src/app` 和 `src/lib/workspace-routes.ts` 为准。
- 导航事实以 `src/stores/workspace-nav-store.ts` 为准。
