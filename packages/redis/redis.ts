import Redis from "ioredis";
import { createRedisConnectionOptions, getRedisUrl } from "./redis-options";

let redisInstance: Redis | null = null;

export async function shutdownRedis() {
	if (!redisInstance) {
		return;
	}
	const instance = redisInstance;
	redisInstance = null;
	try {
		await instance.quit();
	} catch {
		instance.disconnect();
	}
}

export function getRedisCache() {
	if (redisInstance) {
		return redisInstance;
	}

	redisInstance = new Redis(getRedisUrl(), createRedisConnectionOptions());

	redisInstance.on("error", () => {});
	process.on("SIGTERM", shutdownRedis);
	process.on("SIGINT", shutdownRedis);

	return redisInstance;
}

export const redis = new Proxy({} as Redis, {
	get(_, prop) {
		return Reflect.get(getRedisCache(), prop);
	},
});
