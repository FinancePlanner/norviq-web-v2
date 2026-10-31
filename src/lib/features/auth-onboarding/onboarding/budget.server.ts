// onboarding.go Budget / BudgetSubmit and onboarding.BudgetPillars.
import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';

/** internal/onboarding/pillars.go BudgetPillars (StockPlanShared raw values). */
export const BUDGET_PILLARS = [
	{ key: 'fundamentals', label: 'Fundamentals', hint: 'Rent, groceries, utilities' },
	{ key: 'futureYou', label: 'Future you', hint: 'Investing, debt payoff, savings' },
	{ key: 'fun', label: 'Fun', hint: 'Dining, travel, hobbies' }
];

export interface BudgetPageVM {
	pillars: typeof BUDGET_PILLARS;
	month: string;
	error: string;
}

const thisMonth = () => new Date().toISOString().slice(0, 7);
export const budgetPageVM = (error = ''): BudgetPageVM => ({
	pillars: BUDGET_PILLARS,
	month: thisMonth(),
	error
});

const floatPattern = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
/** parsePositiveFloat: comma decimals allowed. */
function parsePositiveFloat(raw: string): number | null {
	const v = raw.replaceAll(',', '.');
	if (!floatPattern.test(v)) return null;
	const n = Number(v);
	return n > 0 ? n : null;
}

/** Returns '' once the snapshot is saved, else the form error. */
export async function submitBudget(event: RequestEvent, form: FormData): Promise<string> {
	const salary = parsePositiveFloat(String(form.get('net_salary') ?? '').trim());
	if (salary === null) return 'Enter a valid monthly net salary.';

	const shares: Record<string, number> = {};
	let total = 0;
	for (const p of BUDGET_PILLARS) {
		const raw = String(form.get('share_' + p.key) ?? '').trim();
		if (!raw) continue;
		const v = parsePositiveFloat(raw);
		if (v === null) return 'Enter valid percentage splits for each pillar.';
		shares[p.key] = v;
		total += v;
	}
	if (Object.keys(shares).length === 0) return 'Set at least one budget pillar split.';
	if (total < 99.9 || total > 100.1) return 'Pillar splits should add up to 100%.';
	// The form collects percentages; targetShares is a fraction of net salary.
	for (const k of Object.keys(shares)) shares[k] = shares[k] / 100;

	const monthRaw = String(form.get('month') ?? '').trim();
	const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw) ? monthRaw : thisMonth();

	try {
		await apiJSON(event, 'POST', '/v1/budget/snapshots', {
			monthStart: `${month}-01`,
			netSalary: salary,
			targetShares: shares
		});
	} catch (err) {
		if (isAPIError(err)) {
			console.warn('create budget snapshot rejected', err.status);
			return 'Could not save your budget. Check your splits and try again.';
		}
		console.error('create budget snapshot', err);
		return 'Could not save your budget. Please try again.';
	}
	return '';
}
