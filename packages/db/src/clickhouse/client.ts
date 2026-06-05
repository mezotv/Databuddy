import { createClient, type ResponseJSON } from "@clickhouse/client";
import type { NodeClickHouseClientConfigOptions } from "@clickhouse/client/dist/config";

let _record:
	| (<T>(name: string, fn: () => Promise<T> | T) => Promise<T>)
	| null = null;

export function setChRecordFn(
	fn: <T>(name: string, fn: () => Promise<T> | T) => Promise<T>
) {
	_record = fn;
}

function traced<T>(name: string, fn: () => Promise<T>): Promise<T> {
	return _record ? _record(name, fn) : fn();
}

export interface ChQueryMetrics {
	elapsed_ms: number;
	memory_usage_bytes?: number;
	query_id: string;
	read_bytes: number;
	read_rows: number;
	result_rows: number;
	served_by?: string;
	written_bytes: number;
	written_rows: number;
}

let _metricsFn: ((m: ChQueryMetrics) => void) | null = null;

export function setChMetricsFn(fn: (m: ChQueryMetrics) => void) {
	_metricsFn = fn;
}

function headerValue(
	headers: Record<string, string | string[] | undefined>,
	name: string
): string | undefined {
	const v = headers[name];
	return Array.isArray(v) ? v[0] : v;
}

function reportChMetrics(
	headers: Record<string, string | string[] | undefined>,
	queryId: string
): void {
	if (!_metricsFn) {
		return;
	}
	const summary = headerValue(headers, "x-clickhouse-summary");
	if (!summary) {
		return;
	}
	try {
		const s = JSON.parse(summary) as Record<string, string>;
		const num = (k: string) => Number(s[k] ?? 0) || 0;
		_metricsFn({
			read_rows: num("read_rows"),
			read_bytes: num("read_bytes"),
			result_rows: num("result_rows"),
			written_rows: num("written_rows"),
			written_bytes: num("written_bytes"),
			elapsed_ms: num("elapsed_ns") / 1_000_000,
			memory_usage_bytes: s.memory_usage ? num("memory_usage") : undefined,
			served_by: headerValue(headers, "x-clickhouse-server-display-name"),
			query_id: queryId,
		});
	} catch {
		// instrumentation must never break the query path
	}
}
/**
 * ClickHouse table names used throughout the application
 */
export const TABLE_NAMES = {
	events: "analytics.events",
	outgoing_links: "analytics.outgoing_links",
	blocked_traffic: "analytics.blocked_traffic",
	error_spans: "analytics.error_spans",
	web_vitals_spans: "analytics.web_vitals_spans",
	custom_events: "analytics.custom_events",
	ai_traffic_spans: "analytics.ai_traffic_spans",
	link_visits: "analytics.link_visits",
};

export const CLICKHOUSE_OPTIONS: NodeClickHouseClientConfigOptions = {
	max_open_connections: 64,
	request_timeout: 30_000,
	keep_alive: {
		enabled: true,
		idle_socket_ttl: 8000,
	},
	compression: {
		request: true,
		response: true,
	},
};

function assertCacheCompatibleSettings(
	settings: Record<string, string | number>
): void {
	const cacheOn =
		settings.use_query_cache !== undefined &&
		String(settings.use_query_cache) !== "0";
	if (cacheOn && settings.result_overflow_mode === "break") {
		throw new Error(
			"ClickHouse settings conflict: use_query_cache=1 is incompatible with result_overflow_mode='break'. Drop result_overflow_mode or pass use_query_cache=0."
		);
	}
}

const baseClient = createClient({
	url: process.env.CLICKHOUSE_URL,
	...CLICKHOUSE_OPTIONS,
});

const RETRIABLE_ERROR_CODES = new Set([
	// undici (Node's HTTP client used by @clickhouse/client)
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_BODY_TIMEOUT",
	"UND_ERR_SOCKET",
	"UND_ERR_CLOSED",
	// node net / dns
	"ECONNREFUSED",
	"ECONNRESET",
	"ETIMEDOUT",
	"EPIPE",
	"EAI_AGAIN",
]);

const RETRIABLE_MESSAGE_FRAGMENTS = ["socket hang up", "Timeout error"];

const MAX_CAUSE_DEPTH = 4;

function isRetriableInsertError(err: unknown, depth = 0): boolean {
	if (depth >= MAX_CAUSE_DEPTH || err === null || typeof err !== "object") {
		return false;
	}
	const code = (err as { code?: unknown }).code;
	if (typeof code === "string" && RETRIABLE_ERROR_CODES.has(code)) {
		return true;
	}
	if (err instanceof Error) {
		const m = err.message;
		if (RETRIABLE_MESSAGE_FRAGMENTS.some((p) => m.includes(p))) {
			return true;
		}
	}
	const cause = (err as { cause?: unknown }).cause;
	return cause ? isRetriableInsertError(cause, depth + 1) : false;
}

async function withInsertRetry<T>(
	operation: () => Promise<T>,
	maxRetries = 3,
	baseDelay = 500
): Promise<T> {
	let lastError: unknown;
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			if (attempt === maxRetries - 1 || !isRetriableInsertError(error)) {
				throw error;
			}
			await new Promise((resolve) =>
				setTimeout(resolve, baseDelay * 2 ** attempt)
			);
		}
	}
	throw lastError;
}

type ClickHouseClient = typeof baseClient;

export const clickHouse: ClickHouseClient = Object.assign(
	Object.create(Object.getPrototypeOf(baseClient)),
	baseClient,
	{
		insert: (
			...args: Parameters<ClickHouseClient["insert"]>
		): ReturnType<ClickHouseClient["insert"]> =>
			withInsertRetry(() => baseClient.insert(...args)) as ReturnType<
				ClickHouseClient["insert"]
			>,
	}
);

export interface ChQueryOptions {
	clickhouse_settings?: Record<string, string | number>;
	readonly?: boolean;
}

async function chQueryWithMeta<T>(
	query: string,
	params?: Record<string, unknown>,
	options?: ChQueryOptions
): Promise<ResponseJSON<T>> {
	const json = await traced("ch.query", async () => {
		const settings: Record<string, string | number> = options?.readonly
			? { ...(options.clickhouse_settings ?? {}), readonly: "2" }
			: (options?.clickhouse_settings ?? {});
		assertCacheCompatibleSettings(settings);
		const res = await clickHouse.query({
			query,
			query_params: params,
			...(Object.keys(settings).length > 0 && {
				clickhouse_settings: settings,
			}),
		});
		const data = await res.json<T>();
		reportChMetrics(res.response_headers, res.query_id);
		return data;
	});

	const intColumns = new Set(
		(json.meta ?? []).filter((m) => m.type.includes("Int")).map((m) => m.name)
	);
	if (intColumns.size === 0) {
		return json;
	}

	return {
		...json,
		data: json.data.map((item) => {
			const out = { ...item } as Record<string, unknown>;
			for (const key of intColumns) {
				const v = out[key];
				if (v !== null && v !== undefined && v !== "") {
					out[key] = Number.parseFloat(v as string);
				}
			}
			return out as T;
		}),
	};
}

export function chQuery<T>(
	query: string,
	params?: Record<string, unknown>,
	options?: ChQueryOptions
): Promise<T[]> {
	return chQueryWithMeta<T>(query, params, options).then((res) => res.data);
}

export async function chCommand(
	query: string,
	params?: Record<string, unknown>
): Promise<void> {
	await traced("ch.command", async () => {
		const res = await clickHouse.command({
			query,
			query_params: params,
			clickhouse_settings: { wait_end_of_query: 1 },
		});
		reportChMetrics(res.response_headers, res.query_id);
	});
}
