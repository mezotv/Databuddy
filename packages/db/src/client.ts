/** biome-ignore-all lint/performance/noNamespaceImport: "Required" */

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { relations } from "./drizzle/schema/relations";

type DB = NodePgDatabase<typeof relations>;
interface Queryable {
	query: (...args: unknown[]) => unknown;
}

const DEFAULT_POOL_MAX = 30;
const DEFAULT_CONNECTION_TIMEOUT_MS = 2000;
const DEFAULT_STATEMENT_TIMEOUT_MS = 3000;
const wrappedQueries = new WeakSet<object>();

let _pgTraceFn: ((durationMs: number) => void) | null = null;
let _pgErrorFn: ((error: Error) => void) | null = null;

export function setPgTraceFn(fn: (durationMs: number) => void) {
	_pgTraceFn = fn;
}

export function setPgErrorFn(fn: (error: Error) => void) {
	_pgErrorFn = fn;
}

function connectionStringForNodePg(connectionString: string): string {
	try {
		const parsed = new URL(connectionString);
		if (parsed.searchParams.get("sslrootcert") === "system") {
			parsed.searchParams.delete("sslrootcert");
		}
		return parsed.toString();
	} catch {
		return connectionString;
	}
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
	const parsed = Number.parseInt(value ?? "", 10);
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}
	return fallback;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		"then" in value &&
		typeof value.then === "function"
	);
}

function recordDuration(start: number): void {
	_pgTraceFn?.(Math.round((performance.now() - start) * 100) / 100);
}

function wrapQuery(obj: Queryable): void {
	if (wrappedQueries.has(obj)) {
		return;
	}
	wrappedQueries.add(obj);

	const original = obj.query.bind(obj);
	obj.query = (...args: unknown[]) => {
		if (!_pgTraceFn) {
			return original(...args);
		}
		const start = performance.now();
		const result = original(...args);
		if (isPromiseLike(result)) {
			return Promise.resolve(result).finally(() => recordDuration(start));
		}
		recordDuration(start);
		return result;
	};
}

function instrumentedPool(pool: Pool): Pool {
	const instrumented = pool as unknown as {
		connect: (...args: unknown[]) => unknown;
	};
	const originalConnect = instrumented.connect.bind(pool);
	instrumented.connect = (...args: unknown[]) => {
		const callback = args[0];
		if (typeof callback === "function") {
			return originalConnect(
				(err: Error | undefined, client: unknown, release: unknown) => {
					if (client && !err) {
						wrapQuery(client as Queryable);
					}
					callback(err, client, release);
				}
			);
		}
		return Promise.resolve(originalConnect()).then((client) => {
			wrapQuery(client as Queryable);
			return client;
		});
	};

	wrapQuery(pool as Queryable);
	return pool;
}

let _db: DB | null = null;
let _pool: Pool | null = null;

function getDb(): DB {
	if (!_db) {
		const databaseUrl = process.env.DATABASE_URL;
		if (!databaseUrl) {
			throw new Error("DATABASE_URL is not set");
		}

		const statementTimeoutMs = parsePositiveInt(
			process.env.DB_STATEMENT_TIMEOUT_MS,
			DEFAULT_STATEMENT_TIMEOUT_MS
		);
		const pool = new Pool({
			connectionString: connectionStringForNodePg(databaseUrl),
			max: parsePositiveInt(process.env.DB_POOL_MAX, DEFAULT_POOL_MAX),
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: parsePositiveInt(
				process.env.DB_CONNECTION_TIMEOUT_MS,
				DEFAULT_CONNECTION_TIMEOUT_MS
			),
			application_name: process.env.SERVICE_NAME || "databuddy",
		});
		pool.on("error", (error) => {
			if (_pgErrorFn) {
				_pgErrorFn(error);
				return;
			}
			console.error("[db] postgres pool error", error);
		});
		pool.on("connect", (client) => {
			client
				.query(`SET statement_timeout = ${statementTimeoutMs}`)
				.catch((error) => {
					if (_pgErrorFn) {
						_pgErrorFn(error as Error);
						return;
					}
					console.error("[db] failed to set statement_timeout", error);
				});
		});

		_pool = instrumentedPool(pool);

		_db = drizzle({ client: _pool, relations, jit: true });
	}
	return _db;
}

export async function warmPool(): Promise<void> {
	getDb();
	if (!_pool) {
		return;
	}
	const client = await _pool.connect();
	client.release();
}

export async function shutdownPostgres(): Promise<void> {
	const pool = _pool;
	_db = null;
	_pool = null;
	if (!pool) {
		return;
	}
	await pool.end();
}

export const db = new Proxy({} as DB, {
	get(_, prop) {
		return Reflect.get(getDb(), prop);
	},
});
