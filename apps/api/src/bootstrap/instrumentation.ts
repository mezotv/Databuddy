import { setAiRequestLoggerProvider } from "@databuddy/ai/lib/request-logger";
import {
	type ChQueryMetrics,
	setChMetricsFn,
	setChRecordFn,
} from "@databuddy/db/clickhouse";
import { setPgErrorFn, setPgTraceFn } from "@databuddy/db";
import { setCacheTraceFn } from "@databuddy/redis";
import {
	setRpcRecordFn,
	setRpcRequestLoggerProvider,
	setTrackingFn,
} from "@databuddy/rpc";
import type { RequestLogger } from "evlog";
import { log } from "evlog";
import { useLogger } from "evlog/elysia";
import { trackMutationEvent } from "@/lib/databuddy";
import { initTccTracing } from "@/lib/tcc-otel";
import { record } from "@/lib/tracing";

const postgresTraceTotals = new WeakMap<
	object,
	[count: number, totalMs: number, maxMs: number]
>();

interface ChTotals {
	count: number;
	max_ms: number;
	memory_max: number;
	nodes: Set<string>;
	read_bytes: number;
	read_rows: number;
	result_rows: number;
	total_ms: number;
	written_bytes: number;
	written_rows: number;
}

const clickhouseTraceTotals = new WeakMap<object, ChTotals>();

/**
 * Run an enrichment callback against the active request logger, if any.
 * Swallows the "outside Elysia request context" case — pg traces, cache
 * lookups, and CH queries can all fire from background work where there
 * is no wide event to write to.
 */
function withRequestLogger(fn: (logger: RequestLogger) => void): void {
	try {
		fn(useLogger());
	} catch {
		// no active request — skip enrichment
	}
}

export function configureApiInstrumentation() {
	setChRecordFn(record);
	setChMetricsFn(recordClickHouseQueryMetrics);
	setRpcRecordFn(record);
	setTrackingFn(trackMutationEvent);
	setRpcRequestLoggerProvider(useLogger);
	setAiRequestLoggerProvider(useLogger);
	setPgTraceFn(recordPostgresQueryTiming);
	setPgErrorFn(recordPostgresPoolError);
	setCacheTraceFn(enrichRequestWithCacheTrace);
	startTccTracing();
}

function recordPostgresQueryTiming(ms: number) {
	withRequestLogger((logger) => {
		const previous = postgresTraceTotals.get(logger) ?? [0, 0, 0];
		const next: [number, number, number] = [
			previous[0] + 1,
			previous[1] + ms,
			Math.max(previous[2], ms),
		];
		postgresTraceTotals.set(logger, next);
		logger.set({
			"pg.query_count": next[0],
			"pg.total_ms": Math.round(next[1] * 100) / 100,
			"pg.max_ms": next[2],
		});
	});
}

function recordClickHouseQueryMetrics(m: ChQueryMetrics) {
	withRequestLogger((logger) => {
		const prev = clickhouseTraceTotals.get(logger);
		const next: ChTotals = {
			count: (prev?.count ?? 0) + 1,
			total_ms: (prev?.total_ms ?? 0) + m.elapsed_ms,
			max_ms: Math.max(prev?.max_ms ?? 0, m.elapsed_ms),
			read_rows: (prev?.read_rows ?? 0) + m.read_rows,
			read_bytes: (prev?.read_bytes ?? 0) + m.read_bytes,
			result_rows: (prev?.result_rows ?? 0) + m.result_rows,
			written_rows: (prev?.written_rows ?? 0) + m.written_rows,
			written_bytes: (prev?.written_bytes ?? 0) + m.written_bytes,
			memory_max: Math.max(prev?.memory_max ?? 0, m.memory_usage_bytes ?? 0),
			nodes: prev?.nodes ?? new Set<string>(),
		};
		if (m.served_by) {
			next.nodes.add(m.served_by);
		}
		clickhouseTraceTotals.set(logger, next);
		logger.set({
			"ch.query_count": next.count,
			"ch.total_ms": Math.round(next.total_ms * 100) / 100,
			"ch.max_ms": Math.round(next.max_ms * 100) / 100,
			"ch.read_rows": next.read_rows,
			"ch.read_bytes": next.read_bytes,
			"ch.result_rows": next.result_rows,
			"ch.written_rows": next.written_rows,
			"ch.written_bytes": next.written_bytes,
			"ch.memory_max": next.memory_max,
			"ch.served_by": [...next.nodes].sort().join(","),
		});
	});
}

function recordPostgresPoolError(error: Error) {
	log.error({
		service: "api",
		component: "postgres_pool",
		error_message: error.message,
		error_stack: error.stack,
	});
}

function enrichRequestWithCacheTrace(fields: Record<string, unknown>) {
	withRequestLogger((logger) => logger.set(fields));
}

function startTccTracing() {
	try {
		initTccTracing();
	} catch (error) {
		log.warn({
			service: "api",
			component: "tcc_otel",
			message: "TCC tracing disabled (init failed)",
			error_message: error instanceof Error ? error.message : String(error),
		});
	}
}
