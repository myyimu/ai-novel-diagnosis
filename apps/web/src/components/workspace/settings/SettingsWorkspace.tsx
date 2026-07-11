"use client";

import { useMemo } from "react";

import { WorkspaceTaskFrame } from "@/components/workspace/WorkspaceTaskFrame";
import type { ContextInspectorSection } from "@/components/workspace/ContextInspector";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import { ProviderSettings } from "./ProviderSettings";
import type { TaskNavItem } from "@/components/workspace/TaskNav";
import type { ProviderPresetId } from "@/stores/workspace-store";

export function SettingsWorkspace() {
	const {
		provider: providerData,
		providerLabel,
		isBackendFreeProvider,
		loading,
		selectedProviderPreset,
		providerConfigHistory,
		filteredProviderModelOptions,
		providerModelsLoading,
		providerTestResult,
		applyProviderPreset,
		setProviderModelSearch,
		setProvider,
		testProvider,
		loadProviderModelOptions,
		applyProviderConfigHistory,
		deleteProviderConfigHistory,
		clearProviderConfigHistory,
	} = useWorkspaceHandlers("provider");

	const handleChangeProviderPreset = (preset: string) => {
		applyProviderPreset(preset as ProviderPresetId);
	};

	const handleChangeProviderModel = (model: string) => {
		setProviderModelSearch(model);
		setProvider((current) => ({ ...current, model }));
	};

	const handleChangeProviderApiKey = (apiKey: string) => {
		setProvider((current) => ({ ...current, apiKey }));
	};

	const handleResetProviderSettings = () => {
		setProvider((current) => ({
			...current,
			baseUrl: "",
			model: "",
			apiKey: "",
		}));
	};

	const taskNavItems: TaskNavItem[] = useMemo(
		() => [
			{
				id: "provider",
				label: "AI 模型服务",
				description: "配置模型服务、API Key 和测试连接",
				meta: "当前",
			},
		],
		[],
	);

	const inspectorSections: ContextInspectorSection[] = useMemo(
		() => [
			{
				title: "当前配置",
				description: "AI 模型服务配置状态",
				fields: [
					{
						label: "模型服务",
						value: providerLabel,
						tone: "secondary",
					},
					{
						label: "当前模型",
						value: providerData.model || "未设置",
						hint: isBackendFreeProvider
							? "共享算力/本地演示"
							: providerData.model || "需要配置",
					},
					{
						label: "API Key",
						value: providerData.apiKey
							? "已配置"
							: isBackendFreeProvider
								? "无需配置"
								: "未配置",
						tone:
							providerData.apiKey || isBackendFreeProvider ? "secondary" : "outline",
					},
				],
			},
			{
				title: "配置历史",
				description: "已保存的配置记录",
				fields: [
					{
						label: "历史记录数",
						value: `${providerConfigHistory.length} 条`,
						tone: providerConfigHistory.length > 0 ? "secondary" : "outline",
					},
					{
						label: "最近保存",
						value:
							providerConfigHistory.length > 0
								? new Date(
										providerConfigHistory[providerConfigHistory.length - 1]
											.createdAt,
									).toLocaleString()
								: "无",
					},
				],
			},
			{
				title: "页面信息",
				description: "设置工作区页面信息",
				fields: [
					{
						label: "当前路径",
						value: "/settings/provider",
						tone: "outline",
					},
					{
						label: "布局模式",
						value: "独立设置页",
						hint: "不作为右栏常驻 Tab",
					},
					{
						label: "数据存储",
						value: "浏览器本地存储",
						hint: "API Key 不会上传到后端",
					},
				],
			},
		],
		[providerLabel, providerData, isBackendFreeProvider, providerConfigHistory],
	);

	return (
		<WorkspaceTaskFrame
			title="设置工作区"
			description="管理 AI 模型服务配置、诊断历史和系统设置"
			status={providerLabel}
			taskNav={{
				items: taskNavItems,
				activeId: "provider",
				onChange: () => {},
				title: "设置导航",
				description: "选择要管理的设置项目",
			}}
			inspector={{
				title: "设置上下文",
				description: "当前设置页面的配置状态和信息",
				sections: inspectorSections,
				emptyState: (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">暂无配置信息。</p>
					</div>
				),
			}}
		>
			<ProviderSettings
				provider={providerData}
				providerLabel={providerLabel}
				isBackendFreeProvider={isBackendFreeProvider}
				isLoading={loading === "provider"}
				selectedProviderPreset={selectedProviderPreset}
				providerConfigHistory={providerConfigHistory.map((item) => ({
					id: item.id,
					title: item.title,
					createdAt: item.createdAt,
					config: item.provider,
				}))}
				filteredProviderModelOptions={filteredProviderModelOptions}
				providerModelsLoading={providerModelsLoading}
				providerTestResult={providerTestResult}
				onChangeProviderPreset={handleChangeProviderPreset}
				onChangeProviderModel={handleChangeProviderModel}
				onChangeProviderApiKey={handleChangeProviderApiKey}
				onResetProviderSettings={handleResetProviderSettings}
				onTestProvider={testProvider}
				onLoadProviderModelOptions={loadProviderModelOptions}
				onApplyProviderConfigHistory={applyProviderConfigHistory}
				onDeleteProviderConfigHistory={deleteProviderConfigHistory}
				onClearProviderConfigHistory={clearProviderConfigHistory}
			/>
		</WorkspaceTaskFrame>
	);
}
