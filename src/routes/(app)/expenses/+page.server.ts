import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { apiJSON } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { isProRequest } from '#lib/features/money/expenses/gates.server.js';
import { isUUID } from '#lib/features/money/expenses/forms.server.js';
import { expensesPlannerURL, parseExpensesMonth } from '#lib/features/money/expenses/month.js';
import {
	loadPlannerViewModel,
	loadTaxTeaser,
	parseFloatStrict
} from '#lib/features/money/expenses/planner.server.js';
import type { BudgetTemplateItem } from '#lib/features/money/expenses/types.js';

// GET /expenses (ExpensesPlanner). The tax teaser (Go: hx-get
// /expenses/tax-teaser, hx-trigger="load") is streamed: the promise is not
// awaited, so the page renders first and the card fills in, like the htmx load.
export const load: PageServerLoad = async (event) => {
	const isPro = await isProRequest(event);
	const vm = await loadPlannerViewModel(event, event.url.searchParams.get('month'), isPro);
	return { vm, taxTeaser: loadTaxTeaser(event, null, null) };
};

const field = (fd: FormData, name: string) => String(fd.get(name) ?? '').trim();
const monthTarget = (fd: FormData) => expensesPlannerURL(parseExpensesMonth(field(fd, 'month')));
const intStrict = (raw: string) => (/^[+-]?\d+$/.test(raw) ? Number(raw) : null);

/** optionalBudgetDestinationID */
function destination(raw: string, label: string): { id?: string; err?: string } {
	if (!raw) return {};
	return isUUID(raw) ? { id: raw } : { err: `invalid ${label}` };
}

async function smartSuggestions(event: RequestEvent) {
	await requireFeature(event, Feature.SmartSuggestions, 'Smart suggestions');
}

export const actions: Actions = {
	// POST /expenses/dca-ticker (hx-post, swapped #expenses-dca-panel). Go
	// re-rendered the panel from a fresh planner VM; the load rerun does that.
	dcaTicker: async (event) => {
		const fd = await event.request.formData();
		const symbol = field(fd, 'symbol');
		if (symbol) {
			try {
				await apiJSON(event, 'PUT', '/v1/budget/dca-capacity', { symbol });
			} catch (err) {
				console.warn('update dca ticker', err);
			}
		}
		return { ok: true };
	},

	// POST /expenses/alert-policy
	alertPolicy: async (event) => {
		const fd = await event.request.formData();
		const snapshotID = field(fd, 'snapshot_id');
		if (!isUUID(snapshotID)) error(400, 'Invalid snapshot');
		const category = parseFloatStrict(field(fd, 'category_threshold'));
		const total = parseFloatStrict(field(fd, 'total_threshold'));
		if (
			category === null ||
			total === null ||
			category < 0 ||
			category > 1000 ||
			total < 0 ||
			total > 1000
		) {
			return fail(400, { message: 'enter valid drift thresholds between 0 and 1000' });
		}
		try {
			await apiJSON(event, 'PUT', `/v1/budget/snapshots/${snapshotID}/alert-policy`, {
				categoryThreshold: category,
				totalThreshold: total,
				alertsEnabled: fd.get('alerts_enabled') === 'true',
				alertOnUnbudgeted: fd.get('alert_on_unbudgeted') === 'true'
			});
		} catch {
			return fail(400, { message: 'Could not update alert policy' });
		}
		redirect(303, monthTarget(fd));
	},

	// POST /expenses/reallocation (requireSmartSuggestions)
	reallocation: async (event) => {
		await smartSuggestions(event);
		const fd = await event.request.formData();
		const snapshotID = field(fd, 'snapshot_id');
		if (!isUUID(snapshotID)) return fail(400, { message: 'Invalid snapshot' });
		const revision = intStrict(field(fd, 'revision'));
		if (revision === null) return fail(400, { message: 'Invalid revision' });
		const adjustments: { planItemId: string; amount: number }[] = [];
		for (const [key, value] of fd.entries()) {
			if (!key.startsWith('cut_')) continue;
			const id = key.slice(4);
			const amount = parseFloatStrict(String(value).trim());
			if (isUUID(id) && amount !== null && amount > 0) adjustments.push({ planItemId: id, amount });
		}
		if (adjustments.length === 0) return fail(400, { message: 'Select at least one adjustment' });
		const goal = destination(field(fd, 'financial_goal_id'), 'financial goal');
		if (goal.err) return fail(400, { message: goal.err });
		const portfolio = destination(field(fd, 'portfolio_list_id'), 'portfolio');
		if (portfolio.err) return fail(400, { message: portfolio.err });
		const preview: Record<string, unknown> = {
			snapshotId: snapshotID,
			expectedRevision: revision,
			adjustments
		};
		if (goal.id) preview.financialGoalId = goal.id;
		if (portfolio.id) preview.portfolioListId = portfolio.id;
		try {
			await apiJSON(event, 'POST', '/v1/budget/reallocations/preview', preview);
		} catch {
			return fail(409, { message: 'Budget changed. Refresh and try again.' });
		}
		try {
			await apiJSON(event, 'POST', '/v1/budget/reallocations', {
				requestId: crypto.randomUUID(),
				preview
			});
		} catch {
			return fail(409, { message: 'Could not commit reallocation' });
		}
		redirect(303, monthTarget(fd));
	},

	// POST /expenses/templates (requireSmartSuggestions)
	templates: async (event) => {
		await smartSuggestions(event);
		const fd = await event.request.formData();
		const snapshotID = field(fd, 'snapshot_id');
		const name = field(fd, 'name');
		if (!isUUID(snapshotID) || !name)
			return fail(400, { message: 'Snapshot and template name are required' });
		let items: BudgetTemplateItem[] = [];
		try {
			items = await apiJSON<BudgetTemplateItem[]>(
				event,
				'GET',
				`/v1/budget/snapshots/${snapshotID}/items`
			);
		} catch {
			items = [];
		}
		if (!items || items.length === 0)
			return fail(400, { message: 'Add targets before saving a template' });
		const body = {
			name,
			items: items.map((item) => {
				const out: Record<string, unknown> = {
					title: item.title,
					plannedAmount: item.plannedAmount,
					pillar: item.pillar,
					targetType: item.targetType,
					allocationKind: item.allocationKind,
					reallocationEligible: item.reallocationEligible
				};
				if (item.categoryId) out.categoryId = item.categoryId;
				if (item.incomePercentage != null) out.incomePercentage = item.incomePercentage;
				if (item.thresholdOverride != null) out.thresholdOverride = item.thresholdOverride;
				return out;
			})
		};
		try {
			await apiJSON(event, 'POST', '/v1/budget/templates', body);
		} catch {
			return fail(400, { message: 'Could not save template' });
		}
		redirect(303, monthTarget(fd));
	},

	// POST /expenses/templates/{id}/apply (requireSmartSuggestions); id in template_id.
	templateApply: async (event) => {
		await smartSuggestions(event);
		const fd = await event.request.formData();
		const templateID = field(fd, 'template_id');
		const snapshotID = field(fd, 'snapshot_id');
		const revision = intStrict(field(fd, 'revision'));
		if (!isUUID(templateID) || !isUUID(snapshotID) || revision === null)
			return fail(400, { message: 'Invalid template request' });
		const replace = fd.get('replace_existing') === 'true';
		try {
			await apiJSON(event, 'POST', `/v1/budget/templates/${templateID}/apply`, {
				snapshotId: snapshotID,
				expectedRevision: revision,
				replaceExisting: replace
			});
		} catch {
			if (!replace)
				return fail(409, {
					message: 'This month already has targets. Confirm replacement before applying a template.'
				});
			return fail(400, { message: 'Could not apply template' });
		}
		redirect(303, monthTarget(fd));
	},

	// POST /expenses/suggestions/{id}/dismiss (requireSmartSuggestions). Go
	// swapped the card out with an empty 200; the page removes it locally.
	dismissSuggestion: async (event) => {
		await smartSuggestions(event);
		const fd = await event.request.formData();
		const id = field(fd, 'id');
		if (!id) return fail(400, { message: 'Invalid suggestion' });
		try {
			const res = await apiJSON<{ success?: boolean } | undefined>(
				event,
				'POST',
				`/v1/reports/suggestions/${encodeURIComponent(id)}/dismiss`
			);
			if (res && res.success === false)
				return fail(502, { message: 'Could not dismiss suggestion' });
		} catch (err) {
			console.warn('dismiss suggestion failed', id, err);
			return fail(502, { message: 'Could not dismiss suggestion' });
		}
		return { dismissed: id };
	},

	// DELETE /expenses/category/{id}: Go re-rendered #expenses-categories-body;
	// the load rerun refreshes the list the same way.
	deleteCategory: async (event) => {
		const fd = await event.request.formData();
		const id = field(fd, 'id');
		if (!isUUID(id)) return fail(400, { message: 'Invalid category' });
		try {
			await apiJSON(event, 'DELETE', `/v1/expenses/categories/${id}`);
		} catch {
			return fail(502, { message: 'Could not delete category' });
		}
		return { ok: true };
	}
};
