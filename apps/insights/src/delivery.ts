import { and, db, eq, isNull } from "@databuddy/db";
import {
	type InsightDelivery,
	insightGenerationConfigs,
	slackIntegrations,
} from "@databuddy/db/schema";
import { decrypt } from "@databuddy/encryption";
import { env } from "@databuddy/env/insights";
import { captureInsightsError, emitInsightsEvent } from "./lib/evlog-insights";

const SLACK_POST_URL = "https://slack.com/api/chat.postMessage";
const MAX_DIGEST_INSIGHTS = 5;
const SLACK_HEADER_MAX = 150;
const SLACK_SECTION_TEXT_MAX = 3000;

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

interface DigestInsight {
	description: string;
	severity: string;
	suggestion: string;
	title: string;
}

interface SlackBlock {
	text?: { text: string; type: string };
	type: string;
}

function escapeMrkdwn(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

async function resolveDeliveries(
	organizationId: string,
	websiteId: string
): Promise<InsightDelivery[]> {
	const [websiteConfig] = await db
		.select({ deliveries: insightGenerationConfigs.deliveries })
		.from(insightGenerationConfigs)
		.where(
			and(
				eq(insightGenerationConfigs.organizationId, organizationId),
				eq(insightGenerationConfigs.websiteId, websiteId)
			)
		)
		.limit(1);
	if (websiteConfig) {
		return websiteConfig.deliveries;
	}

	const [orgConfig] = await db
		.select({ deliveries: insightGenerationConfigs.deliveries })
		.from(insightGenerationConfigs)
		.where(
			and(
				eq(insightGenerationConfigs.organizationId, organizationId),
				isNull(insightGenerationConfigs.websiteId)
			)
		)
		.limit(1);
	return orgConfig?.deliveries ?? [];
}

async function loadBotToken(organizationId: string): Promise<string | null> {
	const key = env.DATABUDDY_ENCRYPTION_KEY;
	if (!key) {
		return null;
	}
	const [integration] = await db
		.select({ ciphertext: slackIntegrations.botTokenCiphertext })
		.from(slackIntegrations)
		.where(
			and(
				eq(slackIntegrations.organizationId, organizationId),
				eq(slackIntegrations.status, "active")
			)
		)
		.limit(1);
	if (!integration) {
		return null;
	}
	return decrypt(integration.ciphertext, key);
}

function buildBlocks(
	websiteDomain: string,
	insights: DigestInsight[]
): SlackBlock[] {
	const blocks: SlackBlock[] = [
		{
			type: "header",
			text: {
				type: "plain_text",
				text: truncate(`Insights for ${websiteDomain}`, SLACK_HEADER_MAX),
			},
		},
	];
	for (const insight of insights.slice(0, MAX_DIGEST_INSIGHTS)) {
		blocks.push({
			type: "section",
			text: {
				type: "mrkdwn",
				text: truncate(
					`*${escapeMrkdwn(insight.title)}*\n${escapeMrkdwn(insight.description)}\n_${escapeMrkdwn(insight.suggestion)}_`,
					SLACK_SECTION_TEXT_MAX
				),
			},
		});
	}
	return blocks;
}

async function postToSlack(
	token: string,
	channelId: string,
	blocks: SlackBlock[],
	text: string
): Promise<void> {
	const res = await fetch(SLACK_POST_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ channel: channelId, blocks, text }),
	});
	const body = (await res.json()) as { ok: boolean; error?: string };
	if (!body.ok) {
		throw new Error(
			`slack chat.postMessage failed: ${body.error ?? "unknown_error"}`
		);
	}
}

export async function deliverInsightDigests(params: {
	insights: DigestInsight[];
	organizationId: string;
	websiteDomain: string;
	websiteId: string;
}): Promise<void> {
	if (params.insights.length === 0) {
		return;
	}

	const deliveries = await resolveDeliveries(
		params.organizationId,
		params.websiteId
	);
	const slackChannelIds = [
		...new Set(
			deliveries.filter((d) => d.type === "slack").map((d) => d.channelId)
		),
	];
	if (slackChannelIds.length === 0) {
		return;
	}

	const token = await loadBotToken(params.organizationId);
	if (!token) {
		emitInsightsEvent("warn", "delivery.slack.skipped_no_integration", {
			organization_id: params.organizationId,
			website_id: params.websiteId,
			delivery_count: slackChannelIds.length,
		});
		return;
	}

	const blocks = buildBlocks(params.websiteDomain, params.insights);
	const text = `Insights for ${params.websiteDomain}`;
	for (const channelId of slackChannelIds) {
		try {
			await postToSlack(token, channelId, blocks, text);
			emitInsightsEvent("info", "delivery.slack.posted", {
				organization_id: params.organizationId,
				website_id: params.websiteId,
				slack_channel_id: channelId,
				insight_count: Math.min(params.insights.length, MAX_DIGEST_INSIGHTS),
			});
		} catch (error) {
			captureInsightsError(error, "delivery.slack.failed", {
				organization_id: params.organizationId,
				website_id: params.websiteId,
				slack_channel_id: channelId,
			});
		}
	}
}
