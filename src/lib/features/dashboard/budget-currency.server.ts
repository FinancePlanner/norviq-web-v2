// The currency spend is planned in: this month's budget snapshot
// (GET /v1/budget/snapshots?year&month → currencyCode), the same source the
// expenses planner and iOS (BudgetDriftDashboard.currencyCode) use. Expenses
// carry no currency of their own, so spend, recent spend and budget figures
// print in it, and fall back to the account's portfolio currency when the
// month has no budget. null when unknown; never a default "$".

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { getJSON } from './fetch.server.js';

type BudgetSnapshot = components['schemas']['BudgetSnapshotResponse'];

export async function loadBudgetCurrency(
	event: RequestEvent,
	now = new Date()
): Promise<string | null> {
	const res = await getJSON<BudgetSnapshot[]>(event, '/v1/budget/snapshots', {
		year: now.getUTCFullYear(),
		month: now.getUTCMonth() + 1
	});
	return res.data?.[0]?.currencyCode?.trim().toUpperCase() || null;
}
