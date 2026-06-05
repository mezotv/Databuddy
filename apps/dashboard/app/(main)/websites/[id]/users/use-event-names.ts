import type { DateRange } from "@/types/analytics";
import { useDynamicQuery } from "@/hooks/use-dynamic-query";
import { useMemo } from "react";

interface EventNameRow {
	name: string;
	total_events: number;
	unique_users: number;
}

export function useEventNames(websiteId: string, dateRange: DateRange) {
	const queryResult = useDynamicQuery(websiteId, dateRange, {
		id: "event-names",
		parameters: ["custom_events"],
		limit: 100,
	});

	const eventNames = useMemo(() => {
		const raw = (queryResult.data as any)?.custom_events || [];
		return (raw as EventNameRow[])
			.map((e) => e.name)
			.filter((name) => name && name !== "");
	}, [queryResult.data]);

	return {
		eventNames,
		isLoading: queryResult.isLoading,
	};
}
