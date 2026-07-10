import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ContextInspector } from "./ContextInspector";
import { TaskNav } from "./TaskNav";
import { WorkspaceTaskFrame } from "./WorkspaceTaskFrame";

describe("WorkspaceTaskFrame", () => {
	it("renders a task-driven frame with contextual detail when selected", () => {
		const html = renderToStaticMarkup(
			<WorkspaceTaskFrame
				title="任务驱动外壳"
				description="把主任务、上下文和检查器分开。"
				status="契约已挂载"
				taskNav={{
					title: "任务列表",
					description: "先做主任务。",
					items: [
						{ id: "plan", label: "规划", description: "整理结构", meta: "1" },
						{ id: "build", label: "构建", description: "搭建壳层", meta: "2" },
					],
					activeId: "build",
					onChange: vi.fn(),
				}}
				inspector={{
					title: "上下文",
					description: "只展示当前需要的信息。",
					sections: [
						{
							title: "主上下文",
							description: "任务边界和当前状态。",
							fields: [
								{ label: "阶段", value: "T02", tone: "secondary" },
								{ label: "范围", value: "壳层", hint: "不接业务页面" },
							],
							detail: <p>当前对象详情</p>,
						},
					],
				}}
			>
				<p>主任务内容</p>
			</WorkspaceTaskFrame>,
		);

		expect(html).toContain("任务驱动外壳");
		expect(html).toContain("契约已挂载");
		expect(html).toContain("任务列表");
		expect(html).toContain("构建");
		expect(html).toContain("主任务内容");
		expect(html).toContain("上下文");
		expect(html).toContain("不接业务页面");
		expect(html).toContain("当前对象详情");
		expect(html).toContain(
			"lg:grid-cols-[minmax(240px,280px)_minmax(640px,1fr)_minmax(280px,340px)]",
		);
		expect(html).toContain("lg:hidden");
	});

	it("does not reserve inspector width without selected detail", () => {
		const html = renderToStaticMarkup(
			<WorkspaceTaskFrame
				title="任务驱动外壳"
				description="把主任务放在中间。"
				status="无详情"
				taskNav={{
					items: [{ id: "main", label: "主任务", description: "当前任务" }],
					activeId: "main",
					onChange: vi.fn(),
				}}
				inspector={{
					sections: [
						{
							title: "摘要",
							fields: [{ label: "状态", value: "不打开右栏" }],
						},
					],
				}}
			>
				<p>主任务内容</p>
			</WorkspaceTaskFrame>,
		);

		expect(html).toContain("lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]");
		expect(html).not.toContain("不打开右栏");
	});

	it("renders an empty context inspector when no sections are provided", () => {
		const html = renderToStaticMarkup(
			<ContextInspector
				title="上下文"
				description="无可用内容。"
				sections={[]}
				emptyState={<p>暂不需要检查器。</p>}
			/>,
		);

		expect(html).toContain("暂不需要检查器。");
		expect(html).toContain("无可用内容。");
	});

	it("renders task navigation with an active page state", () => {
		const html = renderToStaticMarkup(
			<TaskNav
				items={[
					{ id: "draft", label: "草案", description: "第一步" },
					{ id: "review", label: "复核", description: "第二步" },
				]}
				activeId="review"
				onChange={vi.fn()}
			/>,
		);

		expect(html).toContain("任务导航");
		expect(html).toContain('aria-current="page"');
		expect(html).toContain("第一步");
		expect(html).toContain("第二步");
	});
});
