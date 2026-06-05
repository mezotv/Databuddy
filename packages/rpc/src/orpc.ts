import {
	type ApiKeyRow,
	getApiKeyFromHeader,
} from "@databuddy/api-keys/resolve";
import { auth, type User } from "@databuddy/auth";
import { db } from "@databuddy/db";
import { os as createOS } from "@orpc/server";
import { baseErrors } from "./errors";
import {
	enrichRpcWideEventContext,
	recordORPCError,
	setRpcProcedurePath,
	setRpcProcedureType,
} from "./lib/rpc-log-context";
import { runTracked } from "./middleware/track-mutation";
import {
	type BillingOwner,
	getBillingOwner,
	getOrganizationOwnerId,
} from "./utils/billing";

export interface PreResolvedAuth {
	apiKey: ApiKeyRow | null;
	session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
}

export function createServiceAuth(
	organizationId: string,
	scopes: string[]
): PreResolvedAuth {
	const now = new Date();
	const apiKey: ApiKeyRow = {
		id: `svc:${organizationId}`,
		name: "Internal Service",
		prefix: "svc",
		start: "svc_int_",
		keyHash: `svc:${organizationId}`,
		organizationId,
		userId: null,
		type: "automation",
		scopes,
		enabled: true,
		revokedAt: null,
		rateLimitEnabled: false,
		rateLimitTimeWindow: null,
		rateLimitMax: null,
		expiresAt: null,
		lastUsedAt: null,
		metadata: {},
		createdAt: now,
		updatedAt: now,
	};
	return { session: null, apiKey };
}

export const createRPCContext = async (
	opts: { headers: Headers },
	preResolved?: PreResolvedAuth
) => {
	const [session, apiKey] = preResolved
		? [preResolved.session, preResolved.apiKey]
		: await Promise.all([
				auth.api.getSession({ headers: opts.headers }),
				getApiKeyFromHeader(opts.headers),
			]);

	const user = session?.user as User | undefined;

	const organizationId =
		apiKey?.organizationId ??
		(session?.session as { activeOrganizationId?: string | null })
			?.activeOrganizationId ??
		null;

	let billingCache: BillingOwner | undefined;
	let billingResolved = false;

	const getBilling = async (): Promise<BillingOwner | undefined> => {
		if (billingResolved) {
			return billingCache;
		}
		billingResolved = true;

		try {
			if (user) {
				billingCache = await getBillingOwner(user.id, organizationId);
			} else if (apiKey?.organizationId) {
				const ownerId = await getOrganizationOwnerId(apiKey.organizationId);
				if (ownerId) {
					billingCache = await getBillingOwner(ownerId, apiKey.organizationId);
				}
			}
		} catch {
			billingCache = undefined;
		}

		return billingCache;
	};

	return {
		db,
		auth,
		session: session?.session,
		user,
		apiKey: apiKey ?? undefined,
		getBilling,
		organizationId,
		anonymousId: opts.headers.get("x-databuddy-anonymous-id"),
		sessionId: opts.headers.get("x-databuddy-session-id"),
		...opts,
	};
};

export type Context = Awaited<ReturnType<typeof createRPCContext>>;

const os = createOS.$context<Context>().errors(baseErrors);

export const publicProcedure = os.use(({ context, next, path }) => {
	setRpcProcedureType("public");
	setRpcProcedurePath(path);
	enrichRpcWideEventContext(context);
	return next();
});

export const protectedProcedure = os.use(({ context, next, errors, path }) => {
	setRpcProcedureType("protected");
	setRpcProcedurePath(path);
	enrichRpcWideEventContext(context);

	if (!(context.user || context.apiKey)) {
		recordORPCError({ code: "UNAUTHORIZED" });
		throw errors.UNAUTHORIZED();
	}

	return next({ context });
});

export const sessionProcedure = protectedProcedure.use(
	({ context, next, errors }) => {
		if (!(context.user && context.session)) {
			recordORPCError({ code: "UNAUTHORIZED" });
			throw errors.UNAUTHORIZED({ message: "Session required" });
		}

		return next({
			context: {
				...context,
				user: context.user,
				session: context.session,
			},
		});
	}
);

export const trackedProcedure = protectedProcedure.use(
	({ context, next, path }) => runTracked(path.join("."), context, next)
);

export const trackedSessionProcedure = sessionProcedure.use(
	({ context, next, path }) => runTracked(path.join("."), context, next)
);

export { os };
