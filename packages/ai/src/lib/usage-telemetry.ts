import {
	lookupAgentModelCost,
	resolveAgentModelCost,
	usdToAgentCredits,
	type AgentModelCostUsdPerMillion,
} from "@databuddy/shared/agent-credits";
import type { LanguageModelUsage } from "ai";
import type { SourceModel } from "tokenlens";
import { computeTokenCostsForModel } from "tokenlens/helpers";
import { vercelModels } from "tokenlens/providers/vercel";

type VercelModelId = keyof typeof vercelModels.models;

interface CostModel {
	fallback: boolean;
	id: string;
	model: SourceModel;
}

function createSourceModel(
	id: string,
	cost: AgentModelCostUsdPerMillion
): SourceModel {
	return { canonical_id: id, cost, id } as unknown as SourceModel;
}

function createCostModel(
	id: string,
	cost: AgentModelCostUsdPerMillion,
	fallback = false
): CostModel {
	return { fallback, id, model: createSourceModel(id, cost) };
}

function lookupConfiguredModel(modelId: string): CostModel | null {
	const resolved = lookupAgentModelCost(modelId);
	return resolved ? createCostModel(resolved.id, resolved.cost) : null;
}

function lookupTokenlensModel(modelId: string): CostModel | null {
	const model = vercelModels.models[modelId as VercelModelId];
	if (!model?.cost) {
		return null;
	}
	return {
		fallback: false,
		id: model.id,
		model: { canonical_id: model.id, ...model } as unknown as SourceModel,
	};
}

function resolveCostModel(modelId: string): CostModel {
	const model = lookupConfiguredModel(modelId) ?? lookupTokenlensModel(modelId);
	if (model) {
		return model;
	}

	const fallback = resolveAgentModelCost(modelId);
	return createCostModel(fallback.id, fallback.cost, true);
}

function toCostUsage(usage: LanguageModelUsage, freshInputTokens: number) {
	return {
		input_tokens: freshInputTokens,
		output_tokens: usage.outputTokens,
		cache_read_tokens: usage.inputTokenDetails?.cacheReadTokens,
		cache_write_tokens: usage.inputTokenDetails?.cacheWriteTokens,
		reasoning_tokens: usage.outputTokenDetails?.reasoningTokens,
	};
}

export interface UsageTelemetry {
	agent_credits_used: number;
	cache_read_tokens: number;
	cache_write_tokens: number;
	cost_cache_read_usd: number;
	cost_cache_write_usd: number;
	cost_fallback: boolean;
	cost_input_usd: number;
	cost_model_id: string;
	cost_output_usd: number;
	cost_reasoning_usd: number;
	cost_total_usd: number;
	fresh_input_tokens: number;
	input_tokens: number;
	output_tokens: number;
	reasoning_tokens: number;
	total_tokens: number;
	[k: string]: string | number | boolean;
}

const num = (value: number | undefined): number =>
	typeof value === "number" && Number.isFinite(value) ? value : 0;

export function summarizeAgentUsage(
	modelId: string,
	usage: LanguageModelUsage
): UsageTelemetry {
	const inputTokens = num(usage.inputTokens);
	const outputTokens = num(usage.outputTokens);
	const cacheReadTokens = num(usage.inputTokenDetails?.cacheReadTokens);
	const cacheWriteTokens = num(usage.inputTokenDetails?.cacheWriteTokens);
	const freshInputTokens =
		num(usage.inputTokenDetails?.noCacheTokens) ||
		Math.max(0, inputTokens - cacheReadTokens - cacheWriteTokens);

	const costModel = resolveCostModel(modelId);
	const costs = computeTokenCostsForModel({
		model: costModel.model,
		usage: toCostUsage(usage, freshInputTokens),
	});
	const costTotalUsd = num(costs?.totalTokenCostUSD);

	return {
		input_tokens: inputTokens,
		fresh_input_tokens: freshInputTokens,
		output_tokens: outputTokens,
		total_tokens: inputTokens + outputTokens,
		cache_read_tokens: cacheReadTokens,
		cache_write_tokens: cacheWriteTokens,
		reasoning_tokens: num(usage.outputTokenDetails?.reasoningTokens),
		cost_input_usd: num(costs?.inputTokenCostUSD),
		cost_output_usd: num(costs?.outputTokenCostUSD),
		cost_total_usd: costTotalUsd,
		cost_cache_read_usd: num(costs?.cacheReadTokenCostUSD),
		cost_cache_write_usd: num(costs?.cacheWriteTokenCostUSD),
		cost_reasoning_usd: num(costs?.reasoningTokenCostUSD),
		cost_model_id: costModel.id,
		cost_fallback: costModel.fallback,
		agent_credits_used: usdToAgentCredits(costTotalUsd),
	};
}
