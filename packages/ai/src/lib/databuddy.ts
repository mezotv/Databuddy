const apiKey = process.env.DATABUDDY_API_KEY;
const websiteId = process.env.DATABUDDY_WEBSITE_ID;
const apiUrl =
	process.env.DATABUDDY_TRACKING_URL ?? "https://basket.databuddy.cc";

interface TrackingEvent {
	anonymousId?: string;
	name: string;
	namespace?: string;
	properties?: Record<string, unknown>;
	sessionId?: string;
	source: string;
	websiteId: string;
}

async function sendTrackingEvent(event: TrackingEvent): Promise<void> {
	if (!(apiKey && websiteId)) {
		return;
	}

	try {
		await fetch(`${apiUrl}/track`, {
			body: JSON.stringify(event),
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		});
	} catch {
		// best-effort analytics must never affect agent execution
	}
}

export function trackAgentEvent(
	name: string,
	properties?: Record<string, unknown>
): void {
	if (!websiteId) {
		return;
	}
	sendTrackingEvent({
		name,
		namespace: "agent",
		properties,
		source: "api",
		websiteId,
	});
}

export function trackMutationEvent(
	name: string,
	opts: {
		namespace: string;
		sessionId?: string | null;
		anonymousId?: string | null;
		properties?: Record<string, unknown>;
	}
): void {
	if (!websiteId) {
		return;
	}
	sendTrackingEvent({
		anonymousId: opts.anonymousId ?? undefined,
		name,
		namespace: opts.namespace,
		properties: opts.properties,
		sessionId: opts.sessionId ?? undefined,
		source: "dashboard",
		websiteId,
	});
}
