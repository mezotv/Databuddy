import { parseError } from "evlog";

interface AppErrorContext {
	code?: string | number;
	error: unknown;
}

const HTTP_STATUS_BY_ERROR_CODE: Record<string, number> = {
	AUTH_REQUIRED: 401,
	BAD_REQUEST: 400,
	CONFLICT: 409,
	FEATURE_UNAVAILABLE: 403,
	FORBIDDEN: 403,
	INTERNAL_SERVER_ERROR: 500,
	INVALID_COOKIE_SIGNATURE: 400,
	NOT_FOUND: 404,
	PARSE: 400,
	PLAN_LIMIT_EXCEEDED: 402,
	RATE_LIMITED: 429,
	TOO_MANY_REQUESTS: 429,
	UNAUTHORIZED: 401,
	UNKNOWN: 500,
	VALIDATION: 422,
};

export function handleAppError({ error, code }: AppErrorContext) {
	const parsed = parseError(error);
	const statusCode = getStatusCode({
		code,
		error,
		parsedStatus: parsed.status,
	});
	const errorCode = code == null ? "INTERNAL_SERVER_ERROR" : String(code);
	const isDevelopment = process.env.NODE_ENV === "development";
	const isClientError = statusCode >= 400 && statusCode < 500;
	const errorMessage = error instanceof Error ? error.message : String(error);
	const safeClientError =
		isDevelopment || isClientError
			? errorMessage
			: "An internal server error occurred";
	const exposeStructured = isDevelopment || isClientError;

	return new Response(
		JSON.stringify({
			success: false,
			error: safeClientError,
			code: errorCode,
			...(hasValue(parsed.why) && exposeStructured ? { why: parsed.why } : {}),
			...(hasValue(parsed.fix) && exposeStructured ? { fix: parsed.fix } : {}),
			...(hasValue(parsed.link) && exposeStructured
				? { link: parsed.link }
				: {}),
		}),
		{ status: statusCode, headers: { "Content-Type": "application/json" } }
	);
}

function getStatusCode({
	code,
	error,
	parsedStatus,
}: {
	code?: string | number;
	error: unknown;
	parsedStatus: unknown;
}): number {
	if (isHttpStatus(code)) {
		return code;
	}

	if (typeof code === "string") {
		const mappedStatus = HTTP_STATUS_BY_ERROR_CODE[code];
		if (mappedStatus) {
			return mappedStatus;
		}
	}

	return (
		getObjectStatus(error) ?? (isHttpStatus(parsedStatus) ? parsedStatus : 500)
	);
}

function getObjectStatus(error: unknown): number | undefined {
	if (!isRecord(error)) {
		return;
	}

	const status = error.status ?? error.statusCode;
	return isHttpStatus(status) ? status : undefined;
}

function isHttpStatus(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		value >= 400 &&
		value <= 599
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function hasValue(value: unknown): value is string {
	return typeof value === "string" && value !== "";
}
