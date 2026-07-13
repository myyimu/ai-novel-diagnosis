"use client";

import { useCallback } from "react";
import { providerPresets } from "@/lib/provider-presets";
import { testProviderConnection } from "@/lib/workspace-analysis-client";
import {
	type ProviderConfigHistoryEntry,
	type ProviderForm,
	type ProviderConnectionState,
	defaultProviderConnection,
	useWorkspaceStore,
} from "@/stores/workspace-store";

export interface ProviderTestResultView {
	status: "success" | "error";
	providerName: string;
	modelName: string;
	durationMs: number;
	checkedAt: string;
	message: string;
	raw?: Record<string, unknown>;
}

const PROVIDER_CONFIG_HISTORY_MAX_ENTRIES = 10;

function resolveStoreValue<T>(value: T | ((current: T) => T), current: T): T {
	return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

export function normalizeProviderConfig(provider: ProviderForm): ProviderForm {
	return {
		...provider,
		baseUrl: (provider.baseUrl || "").trim(),
		model: (provider.model || "").trim(),
		apiKey: provider.apiKey || "",
	};
}

function areProviderFormsEqual(left: ProviderForm, right: ProviderForm) {
	return (
		left.preset === right.preset &&
		left.kind === right.kind &&
		left.baseUrl === right.baseUrl &&
		left.apiKey === right.apiKey &&
		left.model === right.model &&
		left.temperature === right.temperature &&
		left.jsonMode === right.jsonMode
	);
}

function pruneProviderConfigHistory(history: ProviderConfigHistoryEntry[]) {
	return history
		.filter((entry) => {
			const timestamp = Date.parse(entry.createdAt);
			return Boolean(entry?.id) && Number.isFinite(timestamp);
		})
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, PROVIDER_CONFIG_HISTORY_MAX_ENTRIES);
}

function providerHistoryLabel(providerConfig: ProviderForm) {
	const presetLabel = providerPresets[providerConfig.preset].label;
	const modelText = providerConfig.model || "未设置模型";
	const baseUrlText = providerConfig.baseUrl || "未设置 Base URL";
	return `${presetLabel} · ${modelText} · ${baseUrlText}`;
}

function createProviderHistoryId() {
	return `provider-config-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function providerDisplayName(provider: ProviderForm) {
	return provider.kind === "mock" ? "本地演示" : providerPresets[provider.preset].label;
}

function providerModelName(provider: ProviderForm, fallback?: unknown) {
	if (provider.kind === "mock") {
		return "本地演示";
	}
	return provider.model || String(fallback || "未指定模型");
}

function toConnectionState(result: ProviderTestResultView): ProviderConnectionState {
	return {
		status: result.status,
		providerName: result.providerName,
		modelName: result.modelName,
		message: result.message,
		checkedAt: result.checkedAt,
		durationMs: result.durationMs,
	};
}

export function useProviderConnection() {
	const {
		provider,
		setProvider,
		providerConnection,
		setProviderConnection,
		setProviderConfigHistory,
	} = useWorkspaceStore();

	const setProviderWithHistory = useCallback(
		(nextProvider: ProviderForm | ((current: ProviderForm) => ProviderForm)) => {
			setProvider((current) => {
				const nextValue = resolveStoreValue(nextProvider, current);
				return normalizeProviderConfig(nextValue);
			});
			setProviderConnection({
				...defaultProviderConnection,
				message: "模型配置已变更，请确认并测试连接。",
			});
		},
		[setProvider, setProviderConnection],
	);

	const rememberSuccessfulProviderConfig = useCallback(
		(providerConfig: ProviderForm) => {
			const normalized = normalizeProviderConfig(providerConfig);
			const record: ProviderConfigHistoryEntry = {
				id: createProviderHistoryId(),
				createdAt: new Date().toISOString(),
				title: providerHistoryLabel(normalized),
				provider: normalized,
			};

			setProviderConfigHistory((history) => {
				const withoutDuplicate = pruneProviderConfigHistory(history).filter(
					(entry) => !areProviderFormsEqual(entry.provider, normalized),
				);
				return pruneProviderConfigHistory([record, ...withoutDuplicate]);
			});
		},
		[setProviderConfigHistory],
	);

	const testCurrentProvider = useCallback(async (): Promise<ProviderTestResultView> => {
		const providerPayload = normalizeProviderConfig(provider);
		const providerName = providerDisplayName(providerPayload);
		const startedAt = Date.now();
		setProviderConnection({
			status: "testing",
			providerName,
			modelName: providerModelName(providerPayload),
			message: "正在测试模型连接...",
			checkedAt: new Date().toISOString(),
			durationMs: 0,
		});

		try {
			const result = await Promise.race([
				testProviderConnection(providerPayload),
				new Promise<never>((_, reject) => {
					window.setTimeout(
						() =>
							reject(new Error("模型测试超时（120s），请检查网络或模型服务可用性。")),
						120000,
					);
				}),
			]);
			const duration = Date.now() - startedAt;
			const view: ProviderTestResultView = {
				status: "success",
				providerName,
				modelName: providerModelName(providerPayload, result.model),
				durationMs: duration,
				checkedAt: new Date().toISOString(),
				message: String(result.message || result.status || "模型服务连接成功。"),
				raw: result,
			};
			rememberSuccessfulProviderConfig(providerPayload);
			setProviderConnection(toConnectionState(view));
			return view;
		} catch (error) {
			const view: ProviderTestResultView = {
				status: "error",
				providerName,
				modelName: providerModelName(providerPayload),
				durationMs: 0,
				checkedAt: new Date().toISOString(),
				message: error instanceof Error ? error.message : "模型测试失败，请稍后重试。",
			};
			setProviderConnection(toConnectionState(view));
			return view;
		}
	}, [provider, rememberSuccessfulProviderConfig, setProviderConnection]);

	return {
		providerConnection,
		setProviderWithHistory,
		testCurrentProvider,
	};
}
