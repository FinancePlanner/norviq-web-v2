// Browser side of GET /dashboard/activity-feed (Go: DashboardActivityFeed →
// LoadActivityFeed): the five newest activities through the same-origin
// proxy, mapped with the server's mapper. A backend non-200 is "no activity"
// (Go returned nil and rendered the empty state), not an error.

import type { AppLocale } from '#lib/money.js';
import type { ActivityItemVM } from '../types.js';
import { mapActivities, overviewActivityLimit, type UserActivity } from './mappers.js';

export const activityFeedQueryKey = ['dashboard', 'activity-feed'] as const;

/** `currency` is the account's, as the server render used, so a poll never changes the format. */
export async function fetchActivityFeed(fmt: {
	currency: string | null;
	spendCurrency: string | null;
	locale: AppLocale;
}): Promise<ActivityItemVM[]> {
	const res = await fetch(`/api/v1/activities?limit=${overviewActivityLimit}`, {
		headers: { accept: 'application/json' }
	});
	if (!res.ok) return [];
	const items = (await res.json().catch(() => null)) as UserActivity[] | null;
	return mapActivities(items ?? [], { ...fmt, now: new Date() });
}
