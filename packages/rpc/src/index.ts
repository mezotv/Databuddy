/** biome-ignore-all lint/performance/noBarrelFile: we need to export these functions */

export { rpcError } from "./errors";
export { getAutumn } from "./lib/autumn-client";
export { setRpcRecordFn } from "./lib/logger";
export {
	createAbortSignalInterceptor,
	enrichRpcWideEventContext,
	recordORPCError,
	setRpcRequestLoggerProvider,
	setRpcProcedureType,
} from "./lib/rpc-log-context";
export { setTrackProperties, setTrackingFn } from "./middleware/track-mutation";
export {
	type Context,
	type PreResolvedAuth,
	createRPCContext,
	createServiceAuth,
	sessionProcedure,
	trackedProcedure,
	trackedSessionProcedure,
} from "./orpc";
export {
	hasApiKeyOrgAccess,
	type PermissionFor,
	type PlanId,
	type ResourceType,
	type Website,
	type WithWorkspaceOptions,
	type Workspace,
	type WorkspaceTier,
	websiteInputSchema,
	withFlagsWrite,
	withWebsiteRead,
	withWebsiteWrite,
	withWorkspace,
	workspaceInputSchema,
} from "./procedures/with-workspace";
export { type AppRouter, appRouter } from "./root";
export {
	queueInsightGenerationRun,
	type QueueInsightGenerationRunInput,
	type QueueInsightGenerationRunResult,
} from "./routers/insight-generation";
export { getNextInsightRunAt } from "./services/insight-schedule";
export type { SlackIntegrationOutput } from "./routers/integrations";
export type { WebsiteOutput } from "./routers/websites";
export {
	type ExportFormat,
	type ExportMetadata,
	type GenerateExportResult,
	generateExport,
	validateExportDateRange,
} from "./services/export-service";
export {
	type BillingContext,
	getFeatureLimit,
	hasPlan,
	isFreePlan,
	isUsageWithinLimit,
	requireFeature,
	requireFeatureWithLimit,
	requireUsageWithinLimit,
} from "./types/billing";
export {
	type BillingOwner,
	getBillingCustomerId,
	getBillingOwner,
	getMemberRole,
	getOrganizationOwnerId,
} from "./utils/billing";
