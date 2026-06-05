import {
	type SchemaDocOptions,
	generateSchemaDocumentation,
} from "../prompts/clickhouse-schema";
import {
	type DatePreset,
	MCP_DATE_PRESETS,
	resolveDatePreset,
} from "../../lib/date-presets";
import { QueryBuilders } from "../../query/builders";
import { suggestQueryTypes } from "../../query";
import type { Filter, QueryRequest } from "../../query/types";
import { z } from "zod";

export const FilterSchema = z.object({
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
	value: z.union([
		z.string(),
		z.number(),
		z.array(z.union([z.string(), z.number()])),
	]),
	target: z.string().optional(),
	having: z.boolean().optional(),
}) satisfies z.ZodType<Filter>;

export {
	MCP_DATE_PRESETS,
	resolveDatePreset as resolveDatePresetForMcp,
} from "../../lib/date-presets";

export {
	CLICKHOUSE_SCHEMA_DOCS,
	SCHEMA_SECTIONS,
	type SchemaSection,
} from "../prompts/clickhouse-schema";

export interface McpQueryItem {
	filters?: Filter[];
	from?: string;
	groupBy?: string[];
	limit?: number;
	orderBy?: string;
	preset?: string;
	timeUnit?: "minute" | "hour" | "day" | "week" | "month";
	to?: string;
	type: string;
}

const TOP_QUERY_PREFIX = /^top_/;

const QUERY_TYPE_ALIASES: Record<string, string> = {
	countries: "country",
	top_countries: "country",
	top_browsers: "browsers",
	top_os: "operating_systems",
	top_devices: "device_types",
	top_languages: "language",
	top_timezones: "timezone",
	browser: "browsers",
	os: "operating_systems",
	devices: "device_types",
	referrers: "top_referrers",
	pages: "top_pages",
};

function resolveQueryType(type: string): string {
	return QUERY_TYPE_ALIASES[type] ?? type;
}

export function buildBatchQueryRequests(
	items: McpQueryItem[],
	websiteId: string,
	timezone: string
): { requests: QueryRequest[] } | { error: string } {
	const requests: QueryRequest[] = [];
	for (const q of items) {
		const resolvedType = resolveQueryType(q.type);
		if (!(resolvedType in QueryBuilders)) {
			const hint = suggestQueryTypes(q.type.replace(TOP_QUERY_PREFIX, ""));
			const message = hint.length
				? `Unknown type: ${q.type}. Did you mean: ${hint.join(", ")}?`
				: `Unknown type: ${q.type}. Use the capabilities tool to see valid types.`;
			return { error: message };
		}
		q.type = resolvedType;
		let from = q.from;
		let to = q.to;
		if (!q.preset && Boolean(from) !== Boolean(to)) {
			return {
				error: `Both 'from' and 'to' are required when one is provided. Got from=${q.from ?? "(unset)"}, to=${q.to ?? "(unset)"}. Use a 'preset' (e.g. last_7d) or pass both dates as YYYY-MM-DD.`,
			};
		}
		const preset = q.preset ?? (from && to ? undefined : "last_7d");
		if (preset && MCP_DATE_PRESETS.includes(preset as DatePreset)) {
			const resolved = resolveDatePreset(preset as DatePreset, timezone);
			from = resolved.from;
			to = resolved.to;
		}
		if (!(from && to)) {
			return { error: "Either preset or both from and to required" };
		}
		requests.push({
			projectId: websiteId,
			type: q.type,
			from,
			to,
			timeUnit: q.timeUnit,
			limit: q.limit,
			timezone,
			filters: q.filters,
			groupBy: q.groupBy,
			orderBy: q.orderBy,
		});
	}
	return { requests };
}

const SCHEMA_SUMMARY =
	"analytics.events (client_id, anonymous_id, session_id, time, path, event_name, country, device_type, referrer, utm_*). Footguns: use client_id not website_id, time not created_at, path not page_path, event_name not event_type, and screen_view not pageview. analytics.custom_events (owner_id, event_name, properties — use get_data custom_events_* builders, not raw SQL); analytics.error_spans; analytics.web_vitals_hourly. Filter: client_id = {websiteId:String}.";

const QUERY_TYPE_DESCRIPTIONS: Record<string, string> = {
	entry_pages:
		"First pages visitors land on when entering your site, ranked by entry frequency.",
	exit_pages:
		"Last pages visitors view before leaving your site, ranked by exit frequency.",
	page_performance:
		"Page load performance metrics (load time, TTFB, DOM ready) broken down by page.",
	utm_mediums:
		"Traffic breakdown by UTM medium parameters (e.g. cpc, email, social).",
	traffic_sources:
		"Aggregated traffic sources combining referrers, UTM, and direct visits. This is traffic distribution, not revenue attribution, incrementality, or causal channel ROI.",
	browsers:
		"Detailed browser usage breakdown including specific browser names.",
	browser_versions: "Browser usage broken down by specific version numbers.",
	operating_systems: "OS usage breakdown by operating system name.",
	os_versions: "OS usage broken down by specific version numbers.",
	screen_resolutions: "Distribution of screen resolutions across visitors.",
	timezone: "Visitor distribution by timezone.",
	language: "Visitor distribution by browser language setting.",
	recent_errors:
		"Recent JS errors with full context: message, stack (capped at 1500 chars), path, error_type, browser, OS, device, country. For aggregates use error_summary / errors_by_type / errors_by_page.",
	error_types:
		"Top error MESSAGES with count, affected users, and last_seen. Group key is the message string. For grouping by JS class (TypeError, ReferenceError, …) use errors_by_type.",
	error_trends: "Error counts over time to identify spikes and trends.",
	errors_by_page: "Error counts grouped by the page where they occurred.",
	error_frequency: "Error frequency and recurrence patterns.",
	error_chart_data: "Error counts formatted for time-series chart display.",
	errors_by_type:
		"Errors grouped by JS error class (TypeError, ReferenceError, …) with count, affected users, and sessions. For grouping by error message use error_types.",
	slow_pages: "Slowest loading pages ranked by load time.",
	performance_by_browser: "Page load performance metrics grouped by browser.",
	performance_by_country: "Page load performance metrics grouped by country.",
	performance_by_os:
		"Page load performance metrics grouped by operating system.",
	performance_by_region:
		"Page load performance metrics grouped by region/state.",
	performance_time_series:
		"Performance metrics (load time, TTFB) plotted over time.",
	load_time_performance:
		"Detailed load time breakdown showing DNS, connection, TTFB, and render phases.",
	web_vitals_by_page:
		"Core Web Vitals (LCP, FCP, CLS, INP) broken down by page.",
	web_vitals_by_browser: "Core Web Vitals broken down by browser.",
	web_vitals_by_country: "Core Web Vitals broken down by country.",
	web_vitals_by_os: "Core Web Vitals broken down by operating system.",
	web_vitals_by_region: "Core Web Vitals broken down by region/state.",
	web_vitals_time_series: "Core Web Vitals metrics plotted over time.",
	session_metrics:
		"Aggregate session statistics including total sessions, avg duration, and pages per session.",
	session_duration_distribution:
		"Distribution of sessions by duration buckets.",
	sessions_by_device: "Session counts grouped by device type.",
	sessions_by_browser: "Session counts grouped by browser.",
	sessions_time_series: "Session counts plotted over time.",
	session_flow:
		"Page-to-page transitions within sessions (from_path → to_path), ranked by transition count.",
	session_pages:
		"Pages ranked by how many sessions and visitors viewed them; useful for product usage hotspots, not path transitions.",
	interesting_sessions:
		"Ranked individual sessions worth inspecting, scored by page depth, unique pages, custom events, errors, and duration. Use first for 'dig into sessions' or 'how people use the product'.",
	session_list:
		"List of recent individual sessions with metadata and chronological events.",
	session_events: "Events within a specific session in chronological order.",
	custom_events: "Custom event names with occurrence counts.",
	custom_event_properties: "Property keys and values for custom events.",
	custom_events_by_path: "Custom event occurrences grouped by page path.",
	custom_events_trends: "Custom event counts plotted over time.",
	custom_events_summary:
		"Summary statistics for custom events (total count, unique users).",
	custom_events_property_cardinality:
		"Number of unique values per custom event property.",
	custom_events_recent: "Most recent custom event occurrences.",
	custom_events_property_classification:
		"Classification of property types (string, number, boolean) per event.",
	custom_events_property_top_values:
		"Most common values for a specific custom event property.",
	custom_events_property_distribution:
		"Value distribution for a specific custom event property.",
	profile_list:
		"List of identified user profiles with visit counts and metadata.",
	profile_detail:
		"Detailed profile information for a specific identified user, based on analytics, custom, error, vital, and link activity.",
	profile_sessions:
		"Session history for a user profile, including analytics events, custom events, errors, outgoing links, and separate web vitals context.",
	vitals_overview:
		"Overview of Core Web Vitals scores (LCP, FCP, CLS, INP, TTFB).",
	vitals_time_series: "Core Web Vitals metrics plotted over time.",
	vitals_by_page: "Core Web Vitals broken down by page.",
	vitals_by_country: "Core Web Vitals broken down by country.",
	vitals_by_browser: "Core Web Vitals broken down by browser.",
	vitals_by_region: "Core Web Vitals broken down by region/state.",
	vitals_by_city: "Core Web Vitals broken down by city.",
	performance_overview:
		"Overview of page load performance metrics across the site.",
	uptime_overview:
		"Uptime monitoring overview with availability percentage and response times.",
	uptime_time_series: "Uptime check results plotted over time.",
	uptime_status_breakdown:
		"Distribution of uptime check results by status code.",
	uptime_recent_checks: "Most recent uptime check results.",
	uptime_response_time_trends: "Response time trends from uptime monitoring.",
	uptime_ssl_status: "SSL certificate status and expiry information.",
	uptime_by_region:
		"Uptime and response times broken down by monitoring region.",
	revenue_overview:
		"Revenue overview with total, average order value, and transaction count.",
	revenue_time_series: "Revenue metrics plotted over time.",
	revenue_by_provider: "Revenue broken down by payment provider.",
	revenue_by_product: "Revenue broken down by product.",
	revenue_attribution_overview:
		"Revenue attribution overview for instrumented revenue only. Use to check revenue coverage before making channel-investment claims; do not infer incrementality or CAC/LTV without spend and identity data.",
	revenue_by_country: "Revenue broken down by customer country.",
	revenue_by_region: "Revenue broken down by customer region/state.",
	revenue_by_city: "Revenue broken down by customer city.",
	revenue_by_browser: "Revenue broken down by browser.",
	revenue_by_device: "Revenue broken down by device type.",
	revenue_by_os: "Revenue broken down by operating system.",
	revenue_by_referrer:
		"Instrumented revenue grouped by referrer. Treat missing/none buckets and identity gaps as coverage limitations, not proof of causality.",
	revenue_by_utm_source:
		"Instrumented revenue grouped by UTM source. Treat missing/none buckets and identity gaps as coverage limitations, not proof of causality.",
	revenue_by_utm_medium:
		"Instrumented revenue grouped by UTM medium. Treat missing/none buckets and identity gaps as coverage limitations, not proof of causality.",
	revenue_by_utm_campaign:
		"Instrumented revenue grouped by UTM campaign. Treat missing/none buckets and identity gaps as coverage limitations, not proof of causality.",
	revenue_by_entry_page:
		"Instrumented revenue grouped by landing/entry page. Useful for coverage/proxy analysis, not causal page ROI by itself.",
	recent_transactions: "Most recent revenue transactions with details.",
};

function getDescription(
	key: string,
	config: { meta?: { description?: string } }
): string {
	return (
		config?.meta?.description ??
		QUERY_TYPE_DESCRIPTIONS[key] ??
		`Query: ${key.replace(/_/g, " ")}`
	);
}

interface QueryTypeInfo {
	allowedFilters?: string[];
	customizable?: boolean;
	description: string;
}

export function getQueryTypeDescriptions(): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, config] of Object.entries(QueryBuilders)) {
		result[key] = getDescription(key, config);
	}
	return result;
}

export function getQueryTypeDetails(): Record<string, QueryTypeInfo> {
	const result: Record<string, QueryTypeInfo> = {};
	for (const [key, config] of Object.entries(QueryBuilders)) {
		result[key] = {
			description: getDescription(key, config),
			...(config?.allowedFilters?.length && {
				allowedFilters: config.allowedFilters,
			}),
			...(config?.customizable !== undefined && {
				customizable: config.customizable,
			}),
		};
	}
	return result;
}

export function getSchemaSummary(): string {
	return SCHEMA_SUMMARY;
}

export function getSchemaDocumentation(opts: SchemaDocOptions = {}): string {
	return generateSchemaDocumentation(opts);
}

/**
 * Canonical categories for query types. A query type may appear in multiple
 * categories. Filters in `capabilities({ category })` use this map.
 */
export const QUERY_TYPE_CATEGORIES: Record<string, readonly string[]> = {
	overview: ["summary", "today", "active", "session"],
	traffic: [
		"top_pages",
		"entry_pages",
		"exit_pages",
		"events_by_date",
		"active_stats",
	],
	acquisition: ["top_referrers", "utm", "traffic_sources"],
	audience: [
		"country",
		"region",
		"city",
		"language",
		"timezone",
		"browser",
		"os",
		"device",
		"screen",
		"viewport",
	],
	errors: ["error", "errors"],
	performance: ["performance", "slow", "load_time", "page_performance"],
	vitals: ["vitals", "web_vitals"],
	sessions: ["session"],
	custom_events: ["custom_event"],
	profiles: ["profile"],
	links: ["link_"],
	outbound: ["outbound", "outgoing"],
	scroll: ["scroll"],
	interaction: ["interaction"],
	retention: ["retention"],
	uptime: ["uptime"],
	llm: ["llm"],
	revenue: ["revenue", "transaction"],
};

export const QUERY_CATEGORY_KEYS = Object.keys(
	QUERY_TYPE_CATEGORIES
) as readonly string[];

function matchesCategory(typeKey: string, category: string): boolean {
	const needles = QUERY_TYPE_CATEGORIES[category];
	if (!needles) {
		return false;
	}
	for (const needle of needles) {
		if (typeKey.includes(needle)) {
			return true;
		}
	}
	return false;
}

/**
 * Return query type descriptions filtered by a category key or a free-form
 * substring needle. Passing neither returns everything.
 */
export function getFilteredQueryTypeDescriptions(opts: {
	category?: string;
	contains?: string;
}): Record<string, string> {
	const { category, contains } = opts;
	const needle = contains?.toLowerCase();
	const result: Record<string, string> = {};
	for (const [key, config] of Object.entries(QueryBuilders)) {
		if (category && !matchesCategory(key, category)) {
			continue;
		}
		if (needle && !key.toLowerCase().includes(needle)) {
			continue;
		}
		result[key] = getDescription(key, config);
	}
	return result;
}
