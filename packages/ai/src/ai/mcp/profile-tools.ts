import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { executeQuery } from "../../query";
import type { QueryRequest } from "../../query/types";
import { createToolLogger } from "../tools/utils/logger";
import { ensureWebsiteAccess } from "./tool-context";

const logger = createToolLogger("MCP Profiles");

function daysAgo(d: number): string {
	const date = new Date();
	date.setDate(date.getDate() - d);
	return date.toISOString().split("T").at(0) ?? "";
}

function today(): string {
	return new Date().toISOString().split("T").at(0) ?? "";
}

interface McpContextLike {
	apiKey: import("@databuddy/api-keys/resolve").ApiKeyRow | null;
	requestHeaders: Headers;
}

function getMcpContext(options: unknown): McpContextLike {
	const ctx = (options as { experimental_context?: unknown })
		?.experimental_context;
	if (!ctx || typeof ctx !== "object" || !("requestHeaders" in ctx)) {
		throw new Error("MCP profile tools require McpAgentContext");
	}
	return ctx as McpContextLike;
}

async function authorizedDomain(
	websiteId: string,
	options: unknown
): Promise<string> {
	const ctx = getMcpContext(options);
	const access = await ensureWebsiteAccess(
		websiteId,
		ctx.requestHeaders,
		ctx.apiKey
	);
	if (access instanceof Error) {
		throw access;
	}
	return access.domain;
}

export function createMcpProfileTools(): ToolSet {
	return {
		list_profiles: tool({
			description:
				"List recent visitor profiles (sessions, pageviews, device, geo, browser, referrer). Use for visitors/users/audience questions.",
			inputSchema: z.object({
				websiteId: z.string(),
				days: z.number().min(1).max(90).default(7),
				limit: z.number().min(1).max(50).default(10),
				filters: z
					.array(
						z.object({
							field: z.string(),
							op: z.enum([
								"eq",
								"ne",
								"contains",
								"not_contains",
								"starts_with",
								"in",
								"not_in",
							]),
							value: z.union([z.string(), z.number()]),
						})
					)
					.optional(),
			}),
			execute: async ({ websiteId, days, limit, filters }, options) => {
				const domain = await authorizedDomain(websiteId, options);
				const req: QueryRequest = {
					projectId: websiteId,
					type: "profile_list",
					from: daysAgo(days),
					to: today(),
					limit,
					filters: filters as QueryRequest["filters"],
					timezone: "UTC",
				};
				const data = await executeQuery(req, domain, "UTC");
				logger.info("Listed profiles", {
					websiteId,
					days,
					resultCount: data.length,
				});
				return {
					profiles: data,
					count: data.length,
					period: `Last ${days} days`,
				};
			},
		}),

		get_profile: tool({
			description:
				"Visitor detail by anonymous_id: first/last activity, sessions across analytics/custom/error/vital/link events, pageviews, duration, device, browser, OS, location.",
			inputSchema: z.object({
				websiteId: z.string(),
				visitorId: z.string(),
				days: z.number().min(1).max(365).default(30),
			}),
			execute: async ({ websiteId, visitorId, days }, options) => {
				const domain = await authorizedDomain(websiteId, options);
				const req: QueryRequest = {
					projectId: websiteId,
					type: "profile_detail",
					from: daysAgo(days),
					to: today(),
					filters: [{ field: "anonymous_id", op: "eq", value: visitorId }],
					timezone: "UTC",
				};
				const data = await executeQuery(req, domain, "UTC");
				if (data.length === 0) {
					return {
						profile: null,
						message: `No data found for visitor ${visitorId} in the last ${days} days.`,
					};
				}
				logger.info("Fetched profile detail", { websiteId, visitorId });
				return { profile: data.at(0), period: `Last ${days} days` };
			},
		}),

		get_profile_sessions: tool({
			description:
				"Session history for a visitor, including analytics events, custom events, errors, outgoing links, and separate web vitals context.",
			inputSchema: z.object({
				websiteId: z.string(),
				visitorId: z.string(),
				days: z.number().min(1).max(365).default(30),
				limit: z.number().min(1).max(100).default(20),
			}),
			execute: async ({ websiteId, visitorId, days, limit }, options) => {
				const domain = await authorizedDomain(websiteId, options);
				const req: QueryRequest = {
					projectId: websiteId,
					type: "profile_sessions",
					from: daysAgo(days),
					to: today(),
					limit,
					filters: [{ field: "anonymous_id", op: "eq", value: visitorId }],
					timezone: "UTC",
				};
				const data = await executeQuery(req, domain, "UTC");
				logger.info("Fetched profile sessions", {
					websiteId,
					visitorId,
					sessionCount: data.length,
				});
				return {
					sessions: data,
					count: data.length,
					period: `Last ${days} days`,
				};
			},
		}),
	};
}
