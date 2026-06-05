import { config } from "@databuddy/env/app";
import { appRouter, createAbortSignalInterceptor } from "@databuddy/rpc";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { onError } from "@orpc/server";
import { logOrpcHandlerError } from "./interceptors";

const HIDDEN_OPENAPI_ROUTERS = ["revenue", "uptime", "billing"] as const;

const OPENAPI_DESCRIPTION = `REST API for Databuddy analytics, link management, and feature flags.

**Authentication:** Endpoints accept either session cookies (browser) or an API key. For programmatic access, use an API key.

**API Key usage:**
- Send in the \`x-api-key\` header, or
- Send as a Bearer token in the \`Authorization\` header: \`Authorization: Bearer <your-api-key>\`
- API keys must be scoped to an organization. Create keys in the dashboard under Organization → API Keys.

**Scope requirements:** Some endpoints require specific API key scopes. The Links endpoints require \`read:links\` for list/get and \`write:links\` for create/update/delete. Check each operation's \`x-required-scopes\` for requirements. Session authentication does not use scopes; access is determined by organization membership and role.`;

const API_KEY_DESCRIPTION = `API key for programmatic access. Use instead of session cookies when calling from servers, scripts, or external integrations.

**How to send:**
- \`x-api-key: <your-api-key>\` header (preferred), or
- \`Authorization: Bearer <your-api-key>\` header

**Scope requirements:** Session auth uses organization membership and roles; no scopes. API key auth may require scopes. The Links router enforces scopes: \`read:links\` for list/get, \`write:links\` for create/update/delete. Operations that require scopes include \`x-required-scopes\` in their schema.

**Available scopes:** read:data | track:events | read:links | write:links | manage:websites | manage:flags | manage:config

**Creating keys:** Keys are created in the dashboard (Organization → API Keys) and must be scoped to an organization. Store the secret securely; it is shown only once.`;

const OPENAPI_TAGS = [
	{
		name: "Alarms",
		description:
			"Alert rules and notifications for metrics and conditions across your workspace.",
	},
	{
		name: "Annotations",
		description:
			"Timeline annotations for marking events on charts. Create, update, and delete annotations tied to specific time ranges and chart contexts.",
	},
	{
		name: "API Keys",
		description:
			"Create, list, update, revoke, and verify API keys. Requires organization membership with website configure permission. API keys cannot be used to manage other API keys.",
	},
	{
		name: "Autocomplete",
		description:
			"Autocomplete suggestions for analytics filters: page paths, custom events, browsers, countries, UTM params, and more. Used to power filter dropdowns and search.",
	},
	{
		name: "Feedback",
		description: "Submit and manage product feedback tied to your workspace.",
	},
	{
		name: "Flags",
		description:
			"Feature flags for gradual rollouts and A/B testing. Create, update, and evaluate flags scoped to websites or organizations.",
	},
	{
		name: "Funnels",
		description:
			"Funnel conversion analysis. Define multi-step funnels, track conversions, and analyze funnel performance by referrer.",
	},
	{
		name: "Goals",
		description:
			"Conversion goals and analytics. Define goals (custom events, page views, etc.), track conversions, and retrieve goal analytics.",
	},
	{
		name: "Links",
		description:
			"Short link creation and management. Create, list, update, and delete short links with custom slugs. API keys require read:links or write:links scope.",
	},
	{
		name: "Organizations",
		description:
			"Workspace and organization management: avatar, invitations, billing context, and usage.",
	},
	{
		name: "Preferences",
		description:
			"User preferences for date and time formatting. Stored per-user, not per-organization.",
	},
	{
		name: "Target Groups",
		description:
			"Audience targeting for feature flags. Define target groups by rules (country, referrer, etc.) and use them to target flag rollouts.",
	},
	{
		name: "Websites",
		description:
			"Website management: create, list, update, delete websites; transfer between workspaces; configure settings, tracking, and data export.",
	},
];

const docsRouter = Object.fromEntries(
	Object.entries(appRouter).filter(
		([key]: [string, unknown]) =>
			!HIDDEN_OPENAPI_ROUTERS.includes(
				key as (typeof HIDDEN_OPENAPI_ROUTERS)[number]
			)
	)
) as Omit<typeof appRouter, (typeof HIDDEN_OPENAPI_ROUTERS)[number]>;

export const openApiHandler = new OpenAPIHandler(docsRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
			specPath: "/spec.json",
			docsPath: "/",
			docsTitle: "Databuddy API",
			docsConfig: { theme: "deepSpace" },
			specGenerateOptions: {
				servers: [{ url: config.urls.api }],
				info: {
					title: "Databuddy API",
					version: "1.0.0",
					description: OPENAPI_DESCRIPTION,
				},
				tags: OPENAPI_TAGS,
				security: [{ apiKey: [] }],
				components: {
					securitySchemes: {
						apiKey: {
							type: "apiKey",
							in: "header",
							name: "x-api-key",
							description: API_KEY_DESCRIPTION,
						},
					},
				},
			},
		}),
	],
	interceptors: [createAbortSignalInterceptor(), onError(logOrpcHandlerError)],
});
