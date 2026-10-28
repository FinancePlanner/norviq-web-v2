import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { components } from '#lib/api/schema.js';
import { api } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { formatCurrency, formatFloat } from '#lib/format.js';
import { pillarLabel } from '#lib/features/money/pillars.js';
import {
	expensesPlannerURL,
	monthLabel,
	monthQueryString,
	parseExpensesMonth
} from '#lib/features/money/category-page/month.js';

// GET/POST /expenses/bulk — ExpensesBulkTargets(+Submit) (expenses.go), behind
// requireSmartSuggestions. Go rendered BulkTargetsPage from the full
// LoadPlannerViewModel; the page only reads the month, the drift snapshot
// (id + revision) and the snapshot's plan items, so only those are fetched.
// Submit errors were bare http.Error text pages; here they are error pages.

type BulkUpdate = components['schemas']['BudgetBulkPlanItemUpdate'];

export interface BulkPlanItemVM {
	id: string;
	title: string;
	pillar: string;
	planned: string;
	plannedValue: number;
	targetType: string;
	incomePercentage: string;
	thresholdOverride: string;
	reallocationEligible: boolean;
}

const optionalFloat = (v: number | null | undefined) => (v === null || v === undefined ? '' : formatFloat(v, -1));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** strconv.ParseFloat on a trimmed value. */
function parseFloatStrict(raw: string): number | null {
	if (raw === '') return null;
	const v = Number(raw);
	return Number.isFinite(v) ? v : null;
}

export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.SmartSuggestions, 'Smart suggestions');
	const month = parseExpensesMonth(event.url.searchParams.get('month'));
	const client = api(event);

	const [snapRes, itemsRes] = await Promise.all([
		client
			.GET('/v1/budget/snapshots', {
				params: { query: { year: month.getUTCFullYear(), month: month.getUTCMonth() + 1 } }
			})
			.catch(() => null),
		client.GET('/v1/budget/items').catch(() => null)
	]);
	const snapshot = snapRes?.response.ok ? snapRes.data?.[0] : undefined;

	let drift: { snapshotID: string; revision: number } | null = null;
	if (snapshot) {
		const res = await client
			.GET('/v1/budget/snapshots/{snapshotId}/drift', { params: { path: { snapshotId: snapshot.id } } })
			.catch(() => null);
		if (res?.response.ok && res.data) drift = { snapshotID: res.data.snapshotId, revision: res.data.revision };
	}

	const planItems: BulkPlanItemVM[] = [];
	for (const item of (itemsRes?.response.ok ? itemsRes.data : undefined) ?? []) {
		if (snapshot && item.snapshotId !== snapshot.id) continue;
		planItems.push({
			id: item.id,
			title: item.title,
			pillar: pillarLabel(item.pillar),
			planned: formatCurrency(item.plannedAmount),
			plannedValue: item.plannedAmount,
			targetType: item.targetType,
			incomePercentage: optionalFloat(item.incomePercentage),
			thresholdOverride: optionalFloat(item.thresholdOverride),
			reallocationEligible: item.reallocationEligible
		});
	}

	return {
		monthLabel: monthLabel(month),
		monthQuery: monthQueryString(month),
		drift,
		planItems
	};
};

export const actions: Actions = {
	default: async (event) => {
		await requireFeature(event, Feature.SmartSuggestions, 'Smart suggestions');
		const form = await event.request.formData();
		const value = (k: string) => {
			const v = form.get(k);
			return typeof v === 'string' ? v : '';
		};
		const snapshotID = value('snapshot_id').trim();
		const revisionRaw = value('revision').trim();
		if (!UUID.test(snapshotID) || !/^[+-]?\d+$/.test(revisionRaw)) error(400, 'Invalid snapshot');
		const revision = Number.parseInt(revisionRaw, 10);

		const updates: BulkUpdate[] = [];
		const seen = new Set<string>();
		for (const [key, raw] of form.entries()) {
			if (!key.startsWith('amount_') || seen.has(key) || typeof raw !== 'string') continue;
			seen.add(key);
			const id = key.slice('amount_'.length);
			const amount = parseFloatStrict(raw.trim());
			if (!UUID.test(id) || amount === null || amount < 0) error(400, 'Invalid target amount');
			const canonical = id.toLowerCase();
			let targetType: BulkUpdate['targetType'] = 'fixed';
			let incomePercentage: number | undefined;
			if (value('type_' + canonical) === 'percentageIncome') {
				targetType = 'percentageIncome';
				const pct = parseFloatStrict(value('percentage_' + canonical).trim());
				if (pct === null || pct < 0 || pct > 1000) error(400, 'Enter a valid income percentage');
				incomePercentage = pct;
			}
			let thresholdOverride: number | undefined;
			const thresholdRaw = value('threshold_' + canonical).trim();
			if (thresholdRaw !== '') {
				const t = parseFloatStrict(thresholdRaw);
				if (t === null || t < 0 || t > 1000) error(400, 'Enter a valid drift threshold');
				thresholdOverride = t;
			}
			updates.push({
				id: canonical,
				plannedAmount: amount,
				targetType,
				incomePercentage,
				thresholdOverride,
				reallocationEligible: value('eligible_' + canonical) === 'true'
			});
		}
		if (updates.length === 0) error(400, 'No targets supplied');

		let ok = false;
		try {
			const res = await api(event).PATCH('/v1/budget/snapshots/{snapshotId}/items', {
				params: { path: { snapshotId: snapshotID } },
				body: { expectedRevision: revision, items: updates }
			});
			ok = res.response.ok && !!res.data;
		} catch (err) {
			console.warn('bulk update budget items', err);
		}
		if (!ok) error(409, 'Budget changed. Refresh and try again.');
		redirect(303, expensesPlannerURL(parseExpensesMonth(value('month'))));
	}
};
