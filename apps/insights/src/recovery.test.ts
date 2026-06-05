import { describe, expect, it } from "bun:test";
import { INSIGHTS_JOB_TIMEOUT_MS } from "@databuddy/redis";
import {
	getInsightsMaintenanceIntervalMs,
	getInsightsStaleItemMs,
} from "./recovery";

describe("insights recovery config", () => {
	it("uses a five minute maintenance interval by default", () => {
		expect(getInsightsMaintenanceIntervalMs(undefined)).toBe(300_000);
	});

	it("rejects maintenance intervals below one minute", () => {
		expect(getInsightsMaintenanceIntervalMs("5000")).toBe(300_000);
	});

	it("uses a stale timeout above the BullMQ lock window by default", () => {
		expect(getInsightsStaleItemMs(undefined)).toBeGreaterThan(
			INSIGHTS_JOB_TIMEOUT_MS * 2
		);
	});

	it("rejects stale item timeouts below the worker retry window", () => {
		expect(getInsightsStaleItemMs(String(INSIGHTS_JOB_TIMEOUT_MS))).toBe(
			getInsightsStaleItemMs(undefined)
		);
	});
});
