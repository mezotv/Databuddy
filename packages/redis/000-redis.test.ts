import { describe, expect, it } from "bun:test";
import {
	createRedisConnectionOptions,
	getRedisUrl,
} from "./redis-options";

process.env.REDIS_URL = "redis://test-host:6379";

describe("redis", () => {
	describe("connection options", () => {
		const options = createRedisConnectionOptions();

		it("reads REDIS_URL from the environment", () => {
			expect(getRedisUrl()).toBe("redis://test-host:6379");
		});

		it("sets connectTimeout to 10 seconds", () => {
			expect(options.connectTimeout).toBe(10_000);
		});

		it("sets commandTimeout to 5 seconds", () => {
			expect(options.commandTimeout).toBe(5000);
		});

		it("sets maxRetriesPerRequest to 3", () => {
			expect(options.maxRetriesPerRequest).toBe(3);
		});
	});

	describe("retry strategy", () => {
		const { retryStrategy } = createRedisConnectionOptions();

		it("returns 100ms on first retry", () => {
			expect(retryStrategy(1)).toBe(100);
		});

		it("scales linearly at 100ms per attempt", () => {
			expect(retryStrategy(5)).toBe(500);
			expect(retryStrategy(10)).toBe(1000);
			expect(retryStrategy(20)).toBe(2000);
		});

		it("returns null after 20 attempts", () => {
			expect(retryStrategy(21)).toBeNull();
			expect(retryStrategy(50)).toBeNull();
		});
	});
});
