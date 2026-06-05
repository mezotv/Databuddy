import { EvlogError, log } from "evlog";
import { getActiveAiRequestLogger } from "./request-logger";

/**
 * Merge structured fields into the active request wide event (evlog).
 */
export function mergeWideEvent(
	fields: Record<string, string | number | boolean>
): void {
	const requestLogger = getActiveAiRequestLogger();
	if (requestLogger) {
		requestLogger.set(fields as Record<string, unknown>);
		return;
	}
	log.info({ service: "api", ...fields });
}

/**
 * Run a named operation and attach its duration (ms) to the active wide event
 * as `timing.<name>`. Nested calls accumulate — the wide event ends up with one
 * `timing.*` field per `record()` call in the request.
 */
export async function record<T>(
	name: string,
	fn: () => Promise<T> | T
): Promise<T> {
	const start = performance.now();
	try {
		return await fn();
	} finally {
		const ms = Math.round((performance.now() - start) * 100) / 100;
		getActiveAiRequestLogger()?.set({ [`timing.${name}`]: ms });
	}
}

/**
 * Attach an error to the active request wide event when inside the evlog
 * middleware; otherwise emit a global structured log line.
 */
export function captureError(
	error: unknown,
	fields?: Record<string, string | number | boolean>
): void {
	const err = error instanceof Error ? error : new Error(String(error));
	const requestLog = getActiveAiRequestLogger();
	if (
		requestLog &&
		err instanceof EvlogError &&
		err.status >= 400 &&
		err.status < 500
	) {
		requestLog.set({
			client_http_error: true,
			http_status: err.status,
			error_message: err.message,
		});
		if (fields) {
			requestLog.warn(err.message, fields as Record<string, unknown>);
		} else {
			requestLog.warn(err.message);
		}
		return;
	}
	if (requestLog) {
		if (fields) {
			requestLog.error(err, fields as Record<string, unknown>);
		} else {
			requestLog.error(err);
		}
		return;
	}
	log.error({
		service: "api",
		error_message: err.message,
		...(fields ?? {}),
	});
}
