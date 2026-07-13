"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProviderTestResultView } from "@/hooks/use-provider-connection";
import { providerPresetOptions } from "@/lib/provider-presets";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, Loader2, ShieldAlert, XCircle } from "lucide-react";

interface ProviderSettingsProps {
	provider: {
		preset: string;
		kind: "mock" | "openai-compatible";
		baseUrl: string;
		model: string;
		apiKey: string;
	};
	providerLabel: string;
	isBackendFreeProvider: boolean;
	isLoading: boolean;
	selectedProviderPreset: {
		label: string;
		needsApiKey: boolean;
		notice?: string;
	};
	providerBaseUrlOptions: Array<{ label: string; url: string }>;
	providerConfigHistory: Array<{
		id: string;
		title: string;
		createdAt: string;
		config: unknown;
	}>;
	filteredProviderModelOptions: string[];
	providerModelsLoading: boolean;
	providerTestResult: ProviderTestResultView | null;

	onChangeProviderPreset: (preset: string) => void;
	onChangeProviderBaseUrl: (baseUrl: string) => void;
	onChangeProviderModel: (model: string) => void;
	onChangeProviderApiKey: (apiKey: string) => void;
	onResetProviderSettings: () => void;
	onTestProvider: () => void;
	onLoadProviderModelOptions: () => void;
	onConfirmProviderChange: () => void;
	onApplyProviderConfigHistory: (historyId: string) => void;
	onDeleteProviderConfigHistory: (historyId: string) => void;
	onClearProviderConfigHistory: () => void;
}

const formControlClass =
	"min-h-[42px] rounded-[10px] border-[#d8dbe0] bg-white text-sm text-[#1f2329] outline-none focus:border-[#ff8b5f] focus:ring-4 focus:ring-[#ff5a1f]/10 focus-visible:ring-[#ff5a1f]/10 focus-visible:ring-offset-0 disabled:bg-[#f4f5f7]";

const selectControlClass = cn(
	formControlClass,
	"w-full appearance-none px-3 pr-9 accent-[#ff5a1f]",
);

const primaryButtonClass =
	"min-h-[38px] rounded-[9px] border border-[#ff5a1f] bg-[#ff5a1f] px-3.5 font-bold text-white shadow-[0_6px_16px_rgba(255,90,31,.18)] hover:border-[#e84b13] hover:bg-[#e84b13] focus-visible:ring-[#ff5a1f]/20 focus-visible:ring-offset-0";

const secondaryButtonClass =
	"min-h-[36px] rounded-[9px] border-[#d8dbe0] bg-white px-3 font-bold text-[#1f2329] hover:border-[#bec3cb] hover:bg-[#fafafa] focus-visible:ring-[#ff5a1f]/20 focus-visible:ring-offset-0";

function isPlanBaseUrlOption(option: { label: string; url: string }) {
	const text = `${option.label} ${option.url}`.toLowerCase();
	return text.includes("plan") || text.includes("/coding/");
}

function baseUrlOptionClass(active: boolean, option: { label: string; url: string }) {
	const isPlanOption = isPlanBaseUrlOption(option);
	if (active && isPlanOption) {
		return "h-8 rounded-full border-[#7c3aed] bg-[#7c3aed] px-3 text-xs font-bold text-white shadow-[0_5px_12px_rgba(124,58,237,.16)] hover:border-[#6d28d9] hover:bg-[#6d28d9] focus-visible:ring-[#7c3aed]/20 focus-visible:ring-offset-0";
	}
	if (isPlanOption) {
		return "h-8 rounded-full border-[#ddd6fe] bg-[#f5f3ff] px-3 text-xs font-bold text-[#5b21b6] hover:border-[#a78bfa] hover:bg-[#ede9fe] focus-visible:ring-[#7c3aed]/20 focus-visible:ring-offset-0";
	}

	return cn(
		"h-8 rounded-full px-3 text-xs font-bold focus-visible:ring-[#ff5a1f]/20 focus-visible:ring-offset-0",
		active
			? "border-[#176e50] bg-[#176e50] text-white shadow-[0_5px_12px_rgba(23,110,80,.16)] hover:border-[#145f45] hover:bg-[#145f45]"
			: "border-[#cfe8dc] bg-[#f3fbf7] text-[#176e50] hover:border-[#8fd4b3] hover:bg-[#eaf8f1]",
	);
}

function getProviderPrivacyHint(provider: ProviderSettingsProps["provider"]) {
	if (provider.preset === "shared-gpu") {
		return {
			text: "多人共享密钥，隐私不隔离",
			className: "border-[#ffd6a8] bg-[#fff7e6] text-[#9a4a00]",
		};
	}
	if (provider.preset === "ollama") {
		return {
			text: "离线本地，无 API 费用",
			className: "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]",
		};
	}
	if (provider.preset === "mock") {
		return {
			text: "本地演示，不调用真实模型",
			className: "border-[#d8dbe0] bg-[#f4f5f7] text-[#69707d]",
		};
	}
	if (provider.baseUrl.includes("/coding/") || provider.baseUrl.includes("/plan/")) {
		return {
			text: "订阅套餐专用，不走普通 API 计费",
			className: "border-[#ddd6fe] bg-[#f5f3ff] text-[#5b21b6]",
		};
	}
	if (provider.preset === "custom" || provider.preset === "new-api") {
		return {
			text: "自定义服务，请自行确认密钥和数据边界",
			className: "border-[#d8dbe0] bg-white text-[#4b5563]",
		};
	}
	return {
		text: "个人密钥，数据独立",
		className: "border-[#cfe8dc] bg-[#eaf8f1] text-[#176e50]",
	};
}

function FieldHelp({ text }: { text: string }) {
	const [open, setOpen] = useState(false);

	return (
		<span className="relative ml-1 inline-flex align-middle">
			<button
				type="button"
				className="inline-flex size-4 items-center justify-center rounded-full border border-[#d8dbe0] bg-white text-[10px] leading-none text-[#69707d] transition hover:border-[#ff8b5f] hover:text-[#d94710] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ff5a1f]/10"
				aria-label="查看说明"
				aria-expanded={open}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					setOpen((prev: boolean) => !prev);
				}}
				onBlur={() => window.setTimeout(() => setOpen(false), 120)}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						setOpen(false);
					}
				}}
			>
				?
			</button>
			{open ? (
				<span
					role="tooltip"
					data-field-help-panel="true"
					className="absolute right-0 top-6 z-50 w-64 rounded-md border border-border bg-popover p-3 text-left text-xs font-normal leading-5 text-popover-foreground shadow-lg sm:top-1/2 sm:left-6 sm:right-auto sm:-translate-y-1/2"
				>
					{text}
				</span>
			) : null}
		</span>
	);
}

function TestResultFact({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-md border border-current/20 bg-background/70 px-3 py-2">
			<span className="block text-[11px] opacity-70">{label}</span>
			<strong className="mt-0.5 block truncate text-xs">{value}</strong>
		</div>
	);
}

export function ProviderSettings({
	provider,
	providerLabel,
	isBackendFreeProvider,
	isLoading,
	selectedProviderPreset,
	providerBaseUrlOptions,
	providerConfigHistory,
	filteredProviderModelOptions,
	providerModelsLoading,
	providerTestResult,
	onChangeProviderPreset,
	onChangeProviderBaseUrl,
	onChangeProviderModel,
	onChangeProviderApiKey,
	onResetProviderSettings,
	onTestProvider,
	onLoadProviderModelOptions,
	onConfirmProviderChange,
	onApplyProviderConfigHistory,
	onDeleteProviderConfigHistory,
	onClearProviderConfigHistory,
}: ProviderSettingsProps) {
	const providerPrivacyHint = getProviderPrivacyHint(provider);

	return (
		<div className="space-y-6">
			<Card className="rounded-[14px] border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
				<CardContent className="space-y-6 pt-6">
					<div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#e6e8eb] bg-[#fbfcfd] px-4 py-3 max-[640px]:block">
						<div>
							<h3 className="text-sm font-semibold">连接状态</h3>
							<p className="text-xs text-muted-foreground">
								当前服务：{providerLabel}
								{provider.model && ` · ${provider.model}`}
							</p>
						</div>
						<Button
							className={cn(primaryButtonClass, "max-[640px]:mt-3")}
							onClick={onTestProvider}
							disabled={isLoading}
						>
							{isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
							测试连接
						</Button>
					</div>

					{providerTestResult ? (
						<div
							className={`rounded-md border p-4 text-sm leading-6 ${
								providerTestResult.status === "success"
									? "border-success-border bg-success-surface text-success-foreground"
									: "border-warning-border bg-warning-surface text-warning-foreground"
							}`}
						>
							<div className="flex items-start gap-3">
								{providerTestResult.status === "success" ? (
									<CheckCircle2 className="mt-0.5 size-5 shrink-0" />
								) : (
									<XCircle className="mt-0.5 size-5 shrink-0" />
								)}
								<div className="min-w-0 flex-1">
									<p className="font-semibold">
										{providerTestResult.status === "success"
											? "模型测试通过"
											: "模型测试失败"}
									</p>
									<p className="mt-1 break-words">{providerTestResult.message}</p>
									<div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
										<TestResultFact
											label="服务"
											value={providerTestResult.providerName}
										/>
										<TestResultFact
											label="模型"
											value={providerTestResult.modelName}
										/>
										<TestResultFact
											label="耗时"
											value={
												providerTestResult.durationMs
													? `${providerTestResult.durationMs}ms`
													: "-"
											}
										/>
										<TestResultFact
											label="测试时间"
											value={new Date(
												providerTestResult.checkedAt,
											).toLocaleString()}
										/>
									</div>
									{providerTestResult.raw &&
									Object.keys(providerTestResult.raw).length ? (
										<details className="mt-3">
											<summary className="cursor-pointer text-xs font-medium">
												查看原始返回
											</summary>
											<pre className="mt-2 max-h-40 overflow-auto rounded-md border border-current/20 bg-background/70 p-3 text-xs text-foreground">
												{JSON.stringify(providerTestResult.raw, null, 2)}
											</pre>
										</details>
									) : null}
								</div>
							</div>
						</div>
					) : null}

					{selectedProviderPreset.notice ? (
						<div className="rounded-md border border-warning-border bg-warning-surface p-4 text-sm leading-6 text-warning-foreground">
							<div className="flex items-start gap-2">
								<ShieldAlert className="mt-0.5 size-4 shrink-0" />
								<p>{selectedProviderPreset.notice}</p>
							</div>
						</div>
					) : null}

					<div className="space-y-4">
						<div className="space-y-2 rounded-[12px] border border-[#ffd6c4] bg-[#fffaf7] p-4">
							<Label htmlFor="provider-preset">模型服务</Label>
							<div className="relative">
								<select
									id="provider-preset"
									className={selectControlClass}
									value={provider.preset}
									onChange={(event) => onChangeProviderPreset(event.target.value)}
								>
									{providerPresetOptions.map(({ id, preset }) => (
										<option key={id} value={id}>
											{preset.label}
										</option>
									))}
								</select>
								<ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#69707d]" />
							</div>
							<div
								className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${providerPrivacyHint.className}`}
							>
								{providerPrivacyHint.text}
							</div>
						</div>

						{provider.kind === "mock" ? (
							<div className="rounded-md border border-border bg-muted px-3 py-4 text-sm leading-6 text-muted-foreground">
								<p className="font-medium text-foreground">
									本地演示不需要模型参数
								</p>
								<p>
									测试连接会直接通过；诊断结果使用内置演示逻辑，不代表真实模型判断。
								</p>
							</div>
						) : (
							<>
								<div className="space-y-2">
									<div className="flex items-center gap-1">
										<Label htmlFor="provider-base-url">Base URL（高级）</Label>
										<FieldHelp text="OpenAI-compatible、自定义中转和本地模型都需要接口地址。共享算力由服务端配置，通常不需要手动填写。" />
									</div>
									<Input
										id="provider-base-url"
										className={formControlClass}
										value={provider.baseUrl}
										onChange={(event) =>
											onChangeProviderBaseUrl(event.target.value)
										}
										placeholder={
											isBackendFreeProvider
												? "由共享站服务端配置决定"
												: "例如 https://api.openai.com/v1 或 http://localhost:11434/v1"
										}
										disabled={provider.preset === "shared-gpu"}
									/>
									{providerBaseUrlOptions.length > 0 && !isBackendFreeProvider ? (
										<div className="flex flex-wrap gap-2">
											{providerBaseUrlOptions.map((option) => (
												<Button
													key={option.url}
													type="button"
													variant="outline"
													size="sm"
													className={baseUrlOptionClass(
														provider.baseUrl === option.url,
														option,
													)}
													onClick={() =>
														onChangeProviderBaseUrl(option.url)
													}
												>
													{option.label}
												</Button>
											))}
										</div>
									) : null}
								</div>

								<div className="space-y-2">
									<div className="flex items-center gap-1">
										<Label htmlFor="provider-model">模型（Model）</Label>
										<FieldHelp text="不同模型擅长的内容、速度和稳定性不同。共享站的模型由服务端配置；付费模型会使用这里选择或填写的 Model。" />
									</div>
									<div className="flex gap-2">
										<Input
											id="provider-model"
											className={formControlClass}
											list="provider-model-options"
											value={provider.model}
											onChange={(event) =>
												onChangeProviderModel(event.target.value)
											}
											placeholder={
												isBackendFreeProvider
													? "由共享站服务端配置决定"
													: "输入或搜索模型，例如 qwen-plus-latest"
											}
											disabled={provider.preset === "shared-gpu"}
										/>
										{!isBackendFreeProvider ? (
											<Button
												type="button"
												variant="outline"
												className={secondaryButtonClass}
												onClick={onLoadProviderModelOptions}
												disabled={providerModelsLoading}
											>
												{providerModelsLoading ? (
													<Loader2 className="mr-2 size-4 animate-spin" />
												) : null}
												拉取模型
											</Button>
										) : null}
									</div>
									<datalist id="provider-model-options">
										{filteredProviderModelOptions.map((model) => (
											<option key={model} value={model} />
										))}
									</datalist>
								</div>

								<div className="space-y-2">
									<Label htmlFor="provider-api-key">API Key（高级）</Label>
									{isBackendFreeProvider ? (
										<div className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
											<p className="font-medium text-foreground">无需填写</p>
											<p>
												共享站由服务器统一连接。你只需要测试是否可用；如果不可用，可以切换到付费模型并填写自己的
												API Key。
											</p>
										</div>
									) : (
										<Input
											id="provider-api-key"
											className={formControlClass}
											type="password"
											value={provider.apiKey}
											onChange={(event) =>
												onChangeProviderApiKey(event.target.value)
											}
											placeholder={
												selectedProviderPreset.needsApiKey
													? "填写你的模型服务 API Key，只保存在本机浏览器"
													: "本地模型可留空"
											}
											autoComplete="off"
										/>
									)}
								</div>
							</>
						)}

						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className={secondaryButtonClass}
								onClick={onResetProviderSettings}
							>
								恢复默认
							</Button>
							<Button
								type="button"
								size="sm"
								className={primaryButtonClass}
								onClick={onConfirmProviderChange}
								disabled={isLoading}
							>
								{isLoading ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : null}
								确认并测试连接
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{providerConfigHistory.length > 0 ? (
				<Card className="rounded-[14px] border-[#e6e8eb] bg-white shadow-[0_4px_18px_rgba(22,27,34,.06)]">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-base">AI 设置历史</CardTitle>
								<CardDescription className="text-xs">
									只保存当前浏览器里测试成功的最近 10 条配置
								</CardDescription>
								<p className="mt-1 text-[11px] leading-5 text-muted-foreground">
									切换浏览器、localhost / 127.0.0.1 或端口后不会自动同步。
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className={secondaryButtonClass}
								onClick={onClearProviderConfigHistory}
							>
								清空
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<div className="divide-y divide-border rounded-md border border-border">
							{providerConfigHistory.map((item) => (
								<div
									key={item.id}
									className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between"
								>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">{item.title}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{new Date(item.createdAt).toLocaleString()}
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											className={secondaryButtonClass}
											onClick={() => onApplyProviderConfigHistory(item.id)}
										>
											应用
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className={secondaryButtonClass}
											onClick={() => onDeleteProviderConfigHistory(item.id)}
										>
											删除
										</Button>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			) : null}

			<Card className="rounded-[14px] border-[#e6e8eb] bg-[#fafafa]">
				<CardHeader>
					<CardTitle className="text-sm">隐私与安全说明</CardTitle>
				</CardHeader>
				<CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
					<p>• 所有设置保存在浏览器本地，不会上传到后端</p>
					<p>• AI 设置历史只在当前浏览器和当前地址可见，切换浏览器、域名或端口不会同步</p>
					<p>• API Key 仅随当前会话请求发送，界面默认以密码框隐藏显示</p>
					<p>• 测试连接仅验证模型服务可用性，不发送敏感内容</p>
					<p>• 切换到其他页面后设置会自动保存</p>
				</CardContent>
			</Card>
		</div>
	);
}
