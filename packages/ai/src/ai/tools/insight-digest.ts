import { tool } from "ai";
import { z } from "zod";
import { summarizeDigestConfig } from "./digest-summary";
import { callRPCProcedure, createToolLogger, getAppContext } from "./utils";

const logger = createToolLogger("Insight Digest Tools");

const digestFrequencySchema = z.enum(["hourly", "daily", "weekly"]);

const manageDigestInputSchema = z.object({
	action: z.enum(["route", "unroute", "status"]),
	channelId: z
		.string()
		.min(1)
		.max(120)
		.optional()
		.describe(
			"Slack channel ID. Required for route and unroute. Use the current slack_channel_id from context for 'here'."
		),
	frequency: digestFrequencySchema
		.optional()
		.describe("How often investigations run for this scope. Applied on route."),
	websiteId: z
		.string()
		.optional()
		.describe("Scope to one website. Omit to apply to the whole organization."),
	confirmed: z.boolean().describe("false=preview, true=apply"),
});

export function createInsightDigestTools() {
	const manageInsightDigestTool = tool({
		description:
			"Route, stop, or inspect Slack delivery of analytics insight digests. action=route sends digests to a Slack channel, unroute stops it, status shows current routing. Investigations run on their schedule regardless; this only controls where the digest is posted.",
		inputSchema: manageDigestInputSchema,
		execute: async (
			{ action, channelId, frequency, websiteId, confirmed },
			options
		) => {
			const context = getAppContext(options);
			const scopeInput = {
				organizationId: context.organizationId,
				websiteId: websiteId ?? undefined,
			};
			try {
				if (action === "status") {
					const config = await callRPCProcedure(
						"insightGeneration",
						"getConfig",
						scopeInput,
						context
					);
					const summary = summarizeDigestConfig(config);
					return {
						success: true,
						message:
							summary.channels.length > 0
								? `Digests go to ${summary.channels.length} Slack channel${summary.channels.length === 1 ? "" : "s"} on a ${summary.frequency} cadence.`
								: "No Slack digest delivery is configured for this scope.",
						digest: summary,
					};
				}

				if (!channelId) {
					throw new Error(
						"channelId is required to route or unroute a digest."
					);
				}

				if (!confirmed) {
					return {
						preview: true,
						confirmationRequired: true,
						message:
							action === "route"
								? `Route insight digests to this Slack channel${frequency ? ` on a ${frequency} cadence` : ""}? Confirm to apply.`
								: "Stop routing insight digests to this Slack channel? Confirm to apply.",
						digest: {
							action,
							channelId,
							frequency: frequency ?? null,
							scope: websiteId ? "website" : "organization",
						},
						instruction:
							"The user must explicitly confirm before you call this tool again with confirmed=true.",
					};
				}

				if (action === "unroute") {
					const config = await callRPCProcedure(
						"insightGeneration",
						"removeSlackDelivery",
						{ ...scopeInput, channelId },
						context
					);
					return {
						success: true,
						message: "Stopped routing insight digests to this Slack channel.",
						digest: summarizeDigestConfig(config),
					};
				}

				const config = await callRPCProcedure(
					"insightGeneration",
					"addSlackDelivery",
					{ ...scopeInput, channelId, frequency },
					context
				);
				const summary = summarizeDigestConfig(config);
				return {
					success: true,
					message: `Insight digests will be delivered to this Slack channel on a ${summary.frequency} cadence.`,
					digest: summary,
				};
			} catch (error) {
				logger.error("Failed to manage insight digest", {
					action,
					websiteId,
					error,
				});
				throw error instanceof Error
					? error
					: new Error("Failed to manage insight digest. Please try again.");
			}
		},
	});

	return { manage_insight_digest: manageInsightDigestTool } as const;
}
