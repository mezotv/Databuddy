import { describe, expect, it } from "bun:test";
import { getNextInsightRunAt } from "./insight-schedule";

describe("getNextInsightRunAt", () => {
	it("returns null when scheduling is disabled", () => {
		const next = getNextInsightRunAt(
			{ cron: null, enabled: false, frequency: "daily" },
			new Date("2026-01-15T10:30:00.000Z")
		);

		expect(next).toBeNull();
	});

	it("schedules hourly runs at the next top of hour", () => {
		const next = getNextInsightRunAt(
			{ cron: null, enabled: true, frequency: "hourly" },
			new Date("2026-01-15T10:30:22.000Z")
		);

		expect(next).toEqual(new Date("2026-01-15T11:00:00.000Z"));
	});

	it("schedules daily runs for today when before 9am", () => {
		const next = getNextInsightRunAt(
			{ cron: null, enabled: true, frequency: "daily", timezone: "UTC" },
			new Date("2026-01-15T08:30:00.000Z")
		);

		expect(next).toEqual(new Date("2026-01-15T09:00:00.000Z"));
	});

	it("schedules daily runs for 9am the next day after 9am", () => {
		const next = getNextInsightRunAt(
			{ cron: null, enabled: true, frequency: "daily", timezone: "UTC" },
			new Date("2026-01-15T10:30:00.000Z")
		);

		expect(next).toEqual(new Date("2026-01-16T09:00:00.000Z"));
	});

	it("schedules weekly runs for today when before 9am", () => {
		const next = getNextInsightRunAt(
			{ cron: null, enabled: true, frequency: "weekly", timezone: "UTC" },
			new Date("2026-01-15T08:30:00.000Z")
		);

		expect(next).toEqual(new Date("2026-01-15T09:00:00.000Z"));
	});

	it("schedules weekly runs seven days out after 9am", () => {
		const next = getNextInsightRunAt(
			{ cron: null, enabled: true, frequency: "weekly", timezone: "UTC" },
			new Date("2026-01-15T10:30:00.000Z")
		);

		expect(next).toEqual(new Date("2026-01-22T09:00:00.000Z"));
	});

	it("supports simple five-field cron expressions", () => {
		const next = getNextInsightRunAt(
			{
				cron: "*/15 * * * *",
				enabled: true,
				frequency: "custom",
				timezone: "UTC",
			},
			new Date("2026-01-15T10:01:45.000Z")
		);

		expect(next).toEqual(new Date("2026-01-15T10:15:00.000Z"));
	});

	it("supports sparse leap-day cron expressions", () => {
		const next = getNextInsightRunAt(
			{
				cron: "0 9 29 2 *",
				enabled: true,
				frequency: "custom",
				timezone: "UTC",
			},
			new Date("2026-01-15T10:01:45.000Z")
		);

		expect(next).toEqual(new Date("2028-02-29T09:00:00.000Z"));
	});

	it("returns null for invalid custom cron", () => {
		const next = getNextInsightRunAt(
			{ cron: "not cron", enabled: true, frequency: "custom" },
			new Date("2026-01-15T10:01:45.000Z")
		);

		expect(next).toBeNull();
	});

	it("rejects cron fields with trailing text", () => {
		const next = getNextInsightRunAt(
			{ cron: "1abc * * * *", enabled: true, frequency: "custom" },
			new Date("2026-01-15T10:01:45.000Z")
		);

		expect(next).toBeNull();
	});
});
