export interface DigestConfigSummary {
	channels: string[];
	enabled: boolean;
	frequency: string;
	nextRunAt: string | null;
	scope: string;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function summarizeDigestConfig(config: unknown): DigestConfigSummary {
	const record = asRecord(config);
	const deliveries = Array.isArray(record.deliveries) ? record.deliveries : [];
	const channels = deliveries
		.map((delivery) => asRecord(delivery))
		.filter(
			(delivery) =>
				delivery.type === "slack" && typeof delivery.channelId === "string"
		)
		.map((delivery) => delivery.channelId as string);
	const nextRunAt = record.nextRunAt;
	return {
		channels,
		enabled: record.enabled !== false,
		frequency:
			typeof record.frequency === "string" ? record.frequency : "weekly",
		nextRunAt:
			nextRunAt instanceof Date
				? nextRunAt.toISOString()
				: typeof nextRunAt === "string"
					? nextRunAt
					: null,
		scope: typeof record.source === "string" ? record.source : "default",
	};
}
