import { useLogger } from "evlog/elysia";

export function logOrpcHandlerError(error: unknown) {
	useLogger().error(error instanceof Error ? error : new Error(String(error)), {
		rpc: "interceptor",
	});
}
