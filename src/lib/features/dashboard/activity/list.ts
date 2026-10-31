// Browser side of GET /dashboard/activity-list?limit=N (Go:
// DashboardActivityList → ActivityListSection), the timeline's "Load more".
// Go re-ran LoadActivityPageViewModel and swapped #activity-list-section;
// only the activities feed that section, so this fetches just those through
// the same-origin proxy. A failed fetch renders the empty state, as Go's
// ActivityListSection did (it never checked ActivitiesError).

import type { ActivityItemVM } from '../types.js';
import {
	activityPageMaxLimit,
	activityPageStep,
	mapActivities,
	type UserActivity
} from './mappers.js';

export interface ActivityListState {
	activities: ActivityItemVM[];
	activityLimit: number;
	hasMoreActivities: boolean;
}

/** activityLoadMoreURL's limit: +20, capped at 100. */
export const nextActivityLimit = (current: number) =>
	Math.min(current + activityPageStep, activityPageMaxLimit);

export async function fetchActivityList(limit: number): Promise<ActivityListState> {
	let items: UserActivity[] = [];
	try {
		const res = await fetch(`/api/v1/activities?limit=${limit}`, {
			headers: { accept: 'application/json' }
		});
		if (res.ok) items = ((await res.json().catch(() => null)) as UserActivity[] | null) ?? [];
	} catch (err) {
		console.warn('activity list fetch failed', err);
	}
	return {
		activities: mapActivities(items),
		activityLimit: limit,
		hasMoreActivities: items.length >= limit && limit < activityPageMaxLimit
	};
}
