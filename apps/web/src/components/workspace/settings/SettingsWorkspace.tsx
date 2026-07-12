"use client";

import { useRouter } from "next/navigation";

import {
	RedesignTopButton,
	RedesignWorkspaceShell,
} from "@/components/workspace/RedesignWorkspaceShell";
import { useWorkspaceHandlers } from "@/hooks/use-workspace-handlers";
import type { ProviderPresetId } from "@/stores/workspace-store";
import { ProviderSettings } from "./ProviderSettings";

export function SettingsWorkspace() {
	const router = useRouter();
	const {
		provider: providerData,
		providerLabel,
		isBackendFreeProvider,
		loading,
		selectedProviderPreset,
		providerConfigHistory,
		providerBaseUrlOptions,
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

	const handleChangeProviderBaseUrl = (baseUrl: string) => {
		setProvider((current) => ({ ...current, baseUrl }));
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

	const apiKeyState =
		providerData.apiKey || isBackendFreeProvider
			? isBackendFreeProvider
				? "无需配置"
				: "已配置"
			: "未配置";

	return (
		<RedesignWorkspaceShell
			active="settings"
			providerLabel={providerLabel}
			crumb={
				<>
					工作区 / <b className="text-[#1f2329]">AI 设置</b>
				</>
			}
			topActions={
				<>
					<RedesignTopButton onClick={() => router.push("/project/current")}>
						返回书籍列表
					</RedesignTopButton>
					<RedesignTopButton
						variant="primary"
						onClick={() => router.push("/diagnose/quick")}
					>
						开始诊断
					</RedesignTopButton>
				</>
			}
		>
			<main className="mx-auto w-[min(1080px,calc(100%_-_48px))] py-[34px] pb-[70px] max-[820px]:w-[calc(100%_-_24px)] max-[820px]:py-[22px]">
				<section className="mb-[22px] flex items-start justify-between gap-6 max-[720px]:block">
					<div>
						<h1 className="mb-1.5 text-[28px] font-bold leading-tight tracking-normal">
							AI 模型服务设置
						</h1>
						<p className="max-w-[720px] text-sm leading-6 text-[#69707d]">
							配置模型服务、Base URL、Model 和密钥；诊断前先确认模型可用。API Key
							只保存在当前浏览器。
						</p>
					</div>
					<div className="rounded-full border border-[#cfe8dc] bg-[#eaf8f1] px-3 py-1 text-xs font-bold text-[#176e50] max-[720px]:mt-4 max-[720px]:inline-flex">
						模型已连接
					</div>
				</section>

				<section className="mb-4 grid gap-3 md:grid-cols-4">
					<div className="rounded-[14px] border border-[#e6e8eb] bg-white p-4 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<span className="text-[11px] text-[#69707d]">当前服务</span>
						<strong className="mt-1 block truncate text-sm">{providerLabel}</strong>
					</div>
					<div className="rounded-[14px] border border-[#e6e8eb] bg-white p-4 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<span className="text-[11px] text-[#69707d]">Base URL</span>
						<strong className="mt-1 block truncate text-sm">
							{providerData.baseUrl ||
								(isBackendFreeProvider ? "由服务端配置" : "未设置")}
						</strong>
					</div>
					<div className="rounded-[14px] border border-[#e6e8eb] bg-white p-4 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<span className="text-[11px] text-[#69707d]">模型</span>
						<strong className="mt-1 block truncate text-sm">
							{providerData.model || "由服务端配置"}
						</strong>
					</div>
					<div className="rounded-[14px] border border-[#e6e8eb] bg-white p-4 shadow-[0_4px_18px_rgba(22,27,34,.06)]">
						<span className="text-[11px] text-[#69707d]">API Key</span>
						<strong className="mt-1 block truncate text-sm">{apiKeyState}</strong>
					</div>
				</section>

				<ProviderSettings
					provider={providerData}
					providerLabel={providerLabel}
					isBackendFreeProvider={isBackendFreeProvider}
					isLoading={loading === "provider"}
					selectedProviderPreset={selectedProviderPreset}
					providerBaseUrlOptions={providerBaseUrlOptions}
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
					onChangeProviderBaseUrl={handleChangeProviderBaseUrl}
					onChangeProviderModel={handleChangeProviderModel}
					onChangeProviderApiKey={handleChangeProviderApiKey}
					onResetProviderSettings={handleResetProviderSettings}
					onTestProvider={testProvider}
					onLoadProviderModelOptions={loadProviderModelOptions}
					onApplyProviderConfigHistory={applyProviderConfigHistory}
					onDeleteProviderConfigHistory={deleteProviderConfigHistory}
					onClearProviderConfigHistory={clearProviderConfigHistory}
				/>
			</main>
		</RedesignWorkspaceShell>
	);
}
