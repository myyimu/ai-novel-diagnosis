"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProviderTestResultView } from "@/hooks/use-workspace-handlers";
import { CheckCircle2, KeyRound, Loader2, ShieldAlert, Settings, XCircle } from "lucide-react";

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
	providerConfigHistory: Array<{
		id: string;
		title: string;
		createdAt: string;
		config: any;
	}>;
	filteredProviderModelOptions: string[];
	providerModelsLoading: boolean;
	providerTestResult: ProviderTestResultView | null;

	onChangeProviderPreset: (preset: string) => void;
	onChangeProviderModel: (model: string) => void;
	onChangeProviderApiKey: (apiKey: string) => void;
	onResetProviderSettings: () => void;
	onTestProvider: () => void;
	onLoadProviderModelOptions: () => void;
	onApplyProviderConfigHistory: (historyId: string) => void;
	onDeleteProviderConfigHistory: (historyId: string) => void;
	onClearProviderConfigHistory: () => void;
	onOpenModel?: () => void;
}

function FieldHelp({ text }: { text: string }) {
	const [open, setOpen] = useState(false);

	return (
		<span className="relative ml-1 inline-flex align-middle">
			<button
				type="button"
				className="inline-flex size-4 items-center justify-center rounded-full border border-border bg-background text-[10px] leading-none text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
	providerConfigHistory,
	filteredProviderModelOptions,
	providerModelsLoading,
	providerTestResult,
	onChangeProviderPreset,
	onChangeProviderModel,
	onChangeProviderApiKey,
	onResetProviderSettings,
	onTestProvider,
	onLoadProviderModelOptions,
	onApplyProviderConfigHistory,
	onDeleteProviderConfigHistory,
	onClearProviderConfigHistory,
	onOpenModel,
}: ProviderSettingsProps) {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<KeyRound className="size-5 text-primary" />
							<div>
								<CardTitle>AI 模型服务设置</CardTitle>
								<CardDescription>配置模型服务以用于诊断和分析</CardDescription>
							</div>
						</div>
						{onOpenModel && (
							<Button variant="outline" size="sm" onClick={onOpenModel}>
								<Settings className="w-4 h-4 mr-2" />
								在任务页配置
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between gap-3">
						<div>
							<h3 className="text-sm font-semibold">连接状态</h3>
							<p className="text-xs text-muted-foreground">
								当前服务：{providerLabel}
								{provider.model && ` · ${provider.model}`}
							</p>
						</div>
						<Button onClick={onTestProvider} disabled={isLoading}>
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
						<div className="space-y-2">
							<Label htmlFor="provider-preset">模型服务</Label>
							<select
								id="provider-preset"
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								value={provider.preset}
								onChange={(event) => onChangeProviderPreset(event.target.value)}
							>
								<option value="mock">本地演示</option>
								<option value="shared-gpu">共享算力</option>
								<option value="openai">OpenAI</option>
								<option value="qwen">通义千问</option>
								<option value="deepseek">DeepSeek</option>
								<option value="custom">自定义</option>
							</select>
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
										<Label htmlFor="provider-model">模型（Model）</Label>
										<FieldHelp text="不同模型擅长的内容、速度和稳定性不同。共享站的模型由服务端配置；付费模型会使用这里选择或填写的 Model。" />
									</div>
									<div className="flex gap-2">
										<Input
											id="provider-model"
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

						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onResetProviderSettings}
						>
							恢复默认
						</Button>
					</div>
				</CardContent>
			</Card>

			{providerConfigHistory.length > 0 ? (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-base">AI 设置历史</CardTitle>
								<CardDescription className="text-xs">
									只保存测试成功的最近 10 条配置
								</CardDescription>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
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
											onClick={() => onApplyProviderConfigHistory(item.id)}
										>
											应用
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
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

			<Card className="border-muted/50 bg-muted/30">
				<CardHeader>
					<CardTitle className="text-sm">隐私与安全说明</CardTitle>
				</CardHeader>
				<CardContent className="text-xs leading-5 text-muted-foreground space-y-2">
					<p>• 所有设置保存在浏览器本地，不会上传到后端</p>
					<p>• API Key 以密码形式存储，不会在日志或截图中明文显示</p>
					<p>• 测试连接仅验证模型服务可用性，不发送敏感内容</p>
					<p>• 切换到其他页面后设置会自动保存</p>
				</CardContent>
			</Card>
		</div>
	);
}
