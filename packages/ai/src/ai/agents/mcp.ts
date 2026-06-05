import { stepCountIs } from "ai";
import {
	ANTHROPIC_CACHE_1H,
	createModelFromId,
	getDefaultAgentModelId,
} from "../config/models";
import { createMcpAgentTools } from "../mcp/agent-tools";
import type { DatabuddyAgentSlackContext } from "../mcp/slack-context";
import { buildAnalyticsInstructionsForMcp } from "../prompts/analytics";
import { TIER_CONFIG } from "../config/tiers";
import type { AppMutationMode } from "../config/context";
import type { AgentConfig } from "./types";

export function createMcpAgentConfig(context: {
	billingCustomerId?: string | null;
	requestHeaders: Headers;
	apiKey: unknown;
	userId: string | null;
	timezone?: string;
	chatId?: string;
	memoryUserId?: string | null;
	modelOverride?: string | null;
	mutationMode?: AppMutationMode;
	organizationId?: string | null;
	slackContext?: DatabuddyAgentSlackContext | null;
	source?: "dashboard" | "mcp" | "slack";
	websiteDomain?: string | null;
	websiteId?: string | null;
	activeTools?: string[];
}): AgentConfig {
	const timezone = context.timezone ?? "UTC";
	const currentDateTime = new Date().toISOString();
	const chatId = context.chatId ?? crypto.randomUUID();
	const websiteId = context.websiteId ?? "";
	const websiteDomain = context.websiteDomain ?? "";
	const selectedModelId =
		context.modelOverride ?? getDefaultAgentModelId(context.source);

	const useAnthropicPromptCache = selectedModelId.startsWith("anthropic/");

	return {
		model: createModelFromId(selectedModelId),
		system: {
			role: "system" as const,
			content: buildAnalyticsInstructionsForMcp({
				timezone,
				currentDateTime,
				source: context.source,
				websiteDomain,
				websiteId,
			}),
			providerOptions: useAnthropicPromptCache ? ANTHROPIC_CACHE_1H : undefined,
		},
		tools: createMcpAgentTools({ slackContext: context.slackContext }),
		activeTools: context.activeTools,
		stopWhen: stepCountIs(TIER_CONFIG.balanced.maxSteps),
		temperature: 0.1,
		experimental_context: {
			apiKey: context.apiKey,
			billingCustomerId: context.billingCustomerId,
			chatId,
			currentDateTime,
			memoryUserId: context.memoryUserId ?? "",
			mutationMode: context.mutationMode ?? "allow",
			organizationId: context.organizationId ?? null,
			requestHeaders: context.requestHeaders,
			timezone,
			userId: context.userId ?? "",
			websiteId,
			websiteDomain,
		},
	};
}
