import { log, type RequestLogger } from "evlog";

type RequestLoggerProvider = () => RequestLogger;
interface RpcContextWithHeaders {
	headers?: Headers | null;
}

let requestLoggerProvider: RequestLoggerProvider | null = null;

export function setRpcRequestLoggerProvider(
	provider: RequestLoggerProvider | null
): void {
	requestLoggerProvider = provider;
}

function getActiveRpcRequestLogger(): RequestLogger | null {
	if (!requestLoggerProvider) {
		return null;
	}
	try {
		return requestLoggerProvider();
	} catch {
		return null;
	}
}

/**
 * Merge RPC-specific fields into the active request wide event.
 * Auth and API key context is handled globally by applyAuthWideEvent.
 */
export function enrichRpcWideEventContext(
	context: RpcContextWithHeaders
): void {
	if (!context.headers) {
		return;
	}

	const fields: Record<string, string> = {};

	const clientId = context.headers.get("databuddy-client-id");
	if (clientId) {
		fields.rpc_client_id = clientId;
	}

	const sdkName = context.headers.get("databuddy-sdk-name");
	if (sdkName) {
		fields.rpc_sdk_name = sdkName;
	}

	const sdkVersion = context.headers.get("databuddy-sdk-version");
	if (sdkVersion) {
		fields.rpc_sdk_version = sdkVersion;
	}

	if (Object.keys(fields).length === 0) {
		return;
	}

	const requestLogger = getActiveRpcRequestLogger();
	if (requestLogger) {
		requestLogger.set(fields as Record<string, unknown>);
		return;
	}
	log.info({ service: "rpc", ...fields });
}

export function setRpcProcedureType(
	procedureType: "public" | "protected" | "admin" | "website"
): void {
	const requestLogger = getActiveRpcRequestLogger();
	if (requestLogger) {
		requestLogger.set({ rpc_procedure_type: procedureType });
		return;
	}
	log.info({ service: "rpc", rpc_procedure_type: procedureType });
}

export function setRpcProcedurePath(path: readonly string[]): void {
	if (path.length === 0) {
		return;
	}
	const procedure = path.join(".");
	const fields = {
		rpc_procedure: procedure,
		rpc_router: path[0],
	};
	const requestLogger = getActiveRpcRequestLogger();
	if (requestLogger) {
		requestLogger.set(fields);
		return;
	}
	log.info({ service: "rpc", ...fields });
}

export function recordORPCError(error: {
	code?: string;
	message?: string;
}): void {
	const message = error.message ?? error.code ?? "Unknown error";
	const err = new Error(message);
	const requestLogger = getActiveRpcRequestLogger();
	if (requestLogger) {
		requestLogger.error(err, {
			rpc_error_code: error.code,
			rpc_error_message: error.message,
		});
		return;
	}
	log.error({
		service: "rpc",
		rpc_error_code: error.code,
		rpc_error_message: error.message,
	});
}

export function createAbortSignalInterceptor<T = unknown>() {
	return ({
		request,
		next,
	}: {
		request: { signal?: AbortSignal };
		next: () => T;
	}) => {
		request.signal?.addEventListener("abort", () => {
			const requestLogger = getActiveRpcRequestLogger();
			if (requestLogger) {
				requestLogger.set({
					rpc_request_aborted: true,
					rpc_abort_reason: String(request.signal?.reason),
				});
				return;
			}
			log.info({
				service: "rpc",
				rpc_request_aborted: true,
				rpc_abort_reason: String(request.signal?.reason),
			});
		});

		return next();
	};
}
