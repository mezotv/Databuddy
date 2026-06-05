import dayjs from "dayjs";
import timezonePlugin from "dayjs/plugin/timezone";
import utcPlugin from "dayjs/plugin/utc";

dayjs.extend(utcPlugin);
dayjs.extend(timezonePlugin);

export type InsightScheduleFrequency = "hourly" | "daily" | "weekly" | "custom";

export interface InsightScheduleConfig {
	cron: string | null;
	enabled: boolean;
	frequency: InsightScheduleFrequency;
	timezone?: string;
}

const CRON_FIELD_SEPARATOR = /\s+/;
const CRON_NUMERIC_FIELD_REGEX = /^\d+(,\d+)*$/;
const CRON_STEP_FIELD_REGEX = /^\d+$/;
const DEFAULT_TIMEZONE = "UTC";

function normalizeTimezone(timezone: string | undefined): string {
	if (!timezone) {
		return DEFAULT_TIMEZONE;
	}
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone });
		return timezone;
	} catch {
		return DEFAULT_TIMEZONE;
	}
}

function parseCronField(
	value: string,
	min: number,
	max: number
): number[] | null {
	if (value === "*") {
		return Array.from({ length: max - min + 1 }, (_, index) => min + index);
	}

	if (value.startsWith("*/")) {
		const stepValue = value.slice(2);
		if (!CRON_STEP_FIELD_REGEX.test(stepValue)) {
			return null;
		}
		const step = Number(stepValue);
		if (!Number.isSafeInteger(step) || step <= 0) {
			return null;
		}
		return Array.from(
			{ length: max - min + 1 },
			(_, index) => min + index
		).filter((item) => (item - min) % step === 0);
	}

	if (!CRON_NUMERIC_FIELD_REGEX.test(value)) {
		return null;
	}

	const values = value.split(",").map((part) => Number(part));
	if (
		values.some(
			(item) => !Number.isSafeInteger(item) || item < min || item > max
		)
	) {
		return null;
	}
	return [...new Set(values)].sort((a, b) => a - b);
}

function nextRunFromCron(
	cron: string | null,
	from: Date,
	timezone: string
): Date | null {
	if (!cron) {
		return null;
	}

	const parts = cron.trim().split(CRON_FIELD_SEPARATOR);
	if (parts.length !== 5) {
		return null;
	}

	const [minutePart, hourPart, dayPart, monthPart, weekdayPart] = parts;
	const minutes = parseCronField(minutePart ?? "", 0, 59);
	const hours = parseCronField(hourPart ?? "", 0, 23);
	const days = parseCronField(dayPart ?? "", 1, 31);
	const months = parseCronField(monthPart ?? "", 1, 12);
	const weekdays = parseCronField(weekdayPart ?? "", 0, 7);
	if (!(minutes && hours && days && months && weekdays)) {
		return null;
	}

	const minuteSet = new Set(minutes);
	const hourSet = new Set(hours);
	const daySet = new Set(days);
	const monthSet = new Set(months);
	const weekdaySet = new Set(weekdays.map((day) => (day === 7 ? 0 : day)));
	let candidate = dayjs(from)
		.tz(timezone)
		.add(1, "minute")
		.second(0)
		.millisecond(0);

	const maxMinutes = 5 * 366 * 24 * 60;
	for (let i = 0; i < maxMinutes; i += 1) {
		if (
			minuteSet.has(candidate.minute()) &&
			hourSet.has(candidate.hour()) &&
			daySet.has(candidate.date()) &&
			monthSet.has(candidate.month() + 1) &&
			weekdaySet.has(candidate.day())
		) {
			return candidate.toDate();
		}
		candidate = candidate.add(1, "minute");
	}

	return null;
}

export function getNextInsightRunAt(
	config: InsightScheduleConfig,
	from = new Date()
): Date | null {
	if (!config.enabled) {
		return null;
	}

	const timezone = normalizeTimezone(config.timezone);
	const now = dayjs(from).tz(timezone);
	if (config.frequency === "hourly") {
		return now.add(1, "hour").minute(0).second(0).millisecond(0).toDate();
	}

	if (config.frequency === "daily") {
		const next = now.hour(9).minute(0).second(0).millisecond(0);
		return (next.isAfter(now) ? next : next.add(1, "day")).toDate();
	}

	if (config.frequency === "weekly") {
		const next = now.hour(9).minute(0).second(0).millisecond(0);
		return (next.isAfter(now) ? next : next.add(7, "day")).toDate();
	}

	return nextRunFromCron(config.cron, from, timezone);
}
