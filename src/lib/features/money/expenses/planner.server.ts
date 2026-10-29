import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { formatCurrency, formatFloat, formatWithCommas } from '#lib/format.js';
import {
	mergePillarKeys,
	normalizeShares,
	pillarIcon,
	pillarLabel,
	pillarValue,
	resolvePillars,
	shareOrDefault,
	type PillarMap
} from '../pillars.js';
import {
	addMonths,
	categoryURL,
	expensesPlannerURL,
	formatDateShort,
	monthDateRange,
	monthLabel,
	monthQueryString,
	parseExpensesMonth,
	type Month
} from './month.js';
import type {
	BudgetDisciplineSummary,
	BudgetDriftDashboard,
	BudgetMonthSummary,
	BudgetPlanItem,
	BudgetReallocationEvent,
	BudgetSnapshot,
	BudgetTemplate,
	ExpenseCategory,
	ExpenseRow,
	FinancialGoal,
	HouseholdPartner,
	PortfolioList,
	RecurringTemplate,
	ReportSuggestion,
	SpendToUnitsCapacity,
	TaxDashboard,
	TaxMoney
} from './types.js';
import type * as VM from './vm.js';

// Port of LoadPlannerViewModel (internal/handlers/expenses_data.go) and the
// small mapping helpers around it. Every backend call tolerates failure the
// way the Go errgroup did: a failed fetch leaves its section empty.

export const clampPercent = (v: number) => (v < 0 ? 0 : v > 100 ? 100 : v);

/** formatOptionalFloat: strconv.FormatFloat(v, 'f', -1, 64). */
export const formatOptionalFloat = (v: number | null | undefined) => (v == null ? '' : formatFloat(v, -1));

/** formatSharePercent */
export const formatSharePercent = (v: number) => formatFloat(v, -1);

/** handlers.parsePositiveFloat (onboarding.go): "," as decimal point, > 0. */
export function parsePositiveFloat(raw: string): number | null {
	const s = raw.replaceAll(',', '.');
	if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s.trim()) || s.trim() !== s) return null;
	const v = Number(s);
	return Number.isFinite(v) && v > 0 ? v : null;
}

/** strconv.ParseFloat: whole string must parse. */
export function parseFloatStrict(raw: string): number | null {
	if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(raw)) return null;
	const v = Number(raw);
	return Number.isFinite(v) ? v : null;
}

export function formatBudgetCurrency(value: number, code: string): string {
	const upper = (code ?? '').toUpperCase();
	const symbol = ({ USD: '$', EUR: '€', GBP: '£', JPY: '¥' } as Record<string, string>)[upper] || upper + ' ';
	return symbol + formatWithCommas(Math.abs(value));
}

function driftLevelLabel(level: string): string {
	if (level === 'green') return 'On target';
	if (level === 'yellow') return 'Watch';
	return 'Over threshold';
}

function optionalPercent(v: number | null | undefined): string {
	if (v == null) return 'Unbudgeted';
	return (v < 0 || Object.is(v, -0) ? '' : '+') + formatFloat(v, 1) + '%';
}

const optionalScore = (v: number | null | undefined) => (v == null ? '—' : formatFloat(v, 0) + '/100');

const driftCurrency = (d: BudgetDriftDashboard | null) => (!d || !d.currencyCode ? 'USD' : d.currencyCode);

function pillarProgressState(pct: number): string {
	if (pct > 100) return 'over';
	if (pct > 80) return 'warning';
	return 'on-track';
}

export function defaultPillarCards(
	month: Month,
	netSalary: number,
	targetShares: PillarMap,
	plans: PillarMap,
	actuals: PillarMap
): VM.PillarCardVM[] {
	const shares = normalizeShares(targetShares);
	const defs = resolvePillars(...mergePillarKeys(shares, plans, actuals));
	return defs.map((p) => {
		const planned = pillarValue(plans, p.key);
		const spent = pillarValue(actuals, p.key);
		const target = netSalary * shareOrDefault(shares, p);
		const card: VM.PillarCardVM = {
			key: p.key,
			label: p.label,
			hint: p.hint,
			icon: p.icon,
			colorVar: p.colorVar,
			isCustom: p.isCustom,
			target: formatCurrency(target),
			planned: formatCurrency(planned),
			spent: formatCurrency(spent),
			left: '',
			overspent: false,
			progressPct: 0,
			progressLabel: '',
			progressState: '',
			hasTarget: false,
			detailURL: categoryURL(p.key, month)
		};
		if (target > 0) {
			card.hasTarget = true;
			const left = target - spent;
			card.left = formatCurrency(left);
			card.overspent = left < 0;
			const raw = (spent / target) * 100;
			card.progressPct = clampPercent(raw);
			card.progressLabel = `${formatFloat(raw, 0)}% of goal`;
			card.progressState = pillarProgressState(raw);
		}
		return card;
	});
}

export function mapExpenseActivity(rows: ExpenseRow[]): VM.ActivityItemVM[] {
	// Go's selection sort: newest first, ties keep a deterministic but
	// non-stable order. A stable descending sort matches it for distinct dates.
	const sorted = [...rows];
	for (let i = 0; i < sorted.length; i++) {
		for (let j = i + 1; j < sorted.length; j++) {
			if (sorted[j].occurredOn > sorted[i].occurredOn) [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
		}
	}
	return sorted.slice(0, 12).map((row) => ({
		id: row.id,
		title: row.title,
		amount: '-' + formatCurrency(row.amount),
		date: formatDateShort(row.occurredOn, 'Jan 2'),
		pillar: pillarLabel(row.pillar),
		icon: pillarIcon(row.pillar)
	}));
}

export function mapCategoryRows(categories: ExpenseCategory[]): VM.CategoryRowVM[] {
	return categories.map((c) => ({
		id: c.id,
		name: c.name,
		pillarLabel: c.pillar && c.pillar.trim() ? pillarLabel(c.pillar) : 'All pillars',
		isDefault: c.isDefault,
		canDelete: !c.isDefault
	}));
}

export function mapCategoryOptions(categories: ExpenseCategory[]): VM.CategoryOptionVM[] {
	return categories.map((c) => {
		const has = !!(c.pillar && c.pillar.trim());
		return {
			id: c.id,
			name: c.name,
			pillarKey: has ? c.pillar! : '',
			pillarLabel: has ? pillarLabel(c.pillar!) : 'All pillars'
		};
	});
}

export function mapRecurringRows(templates: RecurringTemplate[]): VM.RecurringTemplateVM[] {
	return templates.map((t) => ({
		id: t.id,
		title: t.title,
		amount: formatCurrency(t.amount),
		pillar: pillarLabel(t.pillar),
		frequency: t.frequency === 'weekly' ? 'Weekly' : 'Monthly'
	}));
}

function mapBudgetDrift(value: BudgetDriftDashboard): VM.BudgetDriftVM {
	const ccy = value.currencyCode;
	const surplus = Math.max(0, value.totalTarget - value.totalActual);
	const vm: VM.BudgetDriftVM = {
		snapshotID: value.snapshotId,
		revision: value.revision,
		currencyCode: ccy,
		level: value.totalLevel,
		levelLabel: driftLevelLabel(value.totalLevel),
		totalTarget: formatBudgetCurrency(value.totalTarget, ccy),
		totalActual: formatBudgetCurrency(value.totalActual, ccy),
		driftAmount: formatBudgetCurrency(value.totalDriftAmount, ccy),
		driftPercent: optionalPercent(value.totalDriftPercent),
		lostCapital: formatBudgetCurrency(value.lostInvestmentCapital, ccy),
		investmentTarget: formatBudgetCurrency(value.investmentContributionTarget, ccy),
		surplusReady: formatBudgetCurrency(surplus, ccy),
		deployPct: value.investmentContributionTarget > 0 ? Math.min(100, (surplus / value.investmentContributionTarget) * 100) : 0,
		categories: [],
		hasSuggestions: false
	};
	for (const c of value.categories ?? []) {
		if (c.allocationKind !== 'expense') continue;
		const suggested = Math.min(Math.max(c.driftAmount, 0), c.targetAmount);
		const row: VM.CategoryDriftVM = {
			id: c.id,
			title: c.title,
			target: formatBudgetCurrency(c.targetAmount, ccy),
			actual: formatBudgetCurrency(c.actualAmount, ccy),
			drift: formatBudgetCurrency(c.driftAmount, ccy),
			driftPercent: optionalPercent(c.driftPercent),
			level: c.level,
			levelLabel: driftLevelLabel(c.level),
			eligible: c.reallocationEligible && c.level === 'red' && suggested > 0,
			suggestedCut: suggested,
			suggestedCutLabel: formatBudgetCurrency(suggested, ccy)
		};
		vm.hasSuggestions = vm.hasSuggestions || row.eligible;
		vm.categories.push(row);
	}
	return vm;
}

export function mapSpendToUnits(value: SpendToUnitsCapacity | null): VM.SpendToUnitsVM | null {
	if (!value || !value.symbol) return null;
	const ccy = value.currencyCode;
	let hero = formatBudgetCurrency(value.surplusAmount, ccy) + ' leftover';
	if (value.surplusUnits != null) {
		hero = `${formatBudgetCurrency(value.surplusAmount, ccy)} → ${formatFloat(value.surplusUnits, 2)} ${value.symbol}`;
	}
	let priceLine = 'This month in ' + value.symbol;
	if (value.price != null) {
		const pc = value.priceCurrency ? value.priceCurrency : ccy;
		priceLine = `at last ${pc} ${formatBudgetCurrency(value.price, pc)}`;
		if (value.quoteStale) priceLine += ' · quote may be stale';
	}
	return {
		symbol: value.symbol,
		hero,
		priceLine,
		disclaimer: value.disclaimer,
		quoteStale: value.quoteStale,
		overspend: (value.categories ?? []).map((row) => ({
			title: row.title,
			line:
				row.units != null
					? `${formatBudgetCurrency(row.overspendAmount, ccy)} → ${formatFloat(row.units, 2)} ${value.symbol} not bought`
					: formatBudgetCurrency(row.overspendAmount, ccy) + ' over plan'
		}))
	};
}

/** Swallow a failed backend call into `fallback`, logging like the Go slog.Warn. */
async function soft<T>(label: string, p: Promise<T>, fallback: T): Promise<T> {
	try {
		return (await p) ?? fallback;
	} catch (err) {
		console.warn(label, err);
		return fallback;
	}
}

export function getSnapshot(event: RequestEvent, m: Month): Promise<BudgetSnapshot | null> {
	return apiJSON<BudgetSnapshot[]>(event, 'GET', '/v1/budget/snapshots', undefined, {
		query: { year: m.year, month: m.month }
	}).then((rows) => (rows && rows.length > 0 ? rows[0] : null));
}

export const listCategories = (event: RequestEvent) =>
	soft('expense categories fetch failed', apiJSON<ExpenseCategory[]>(event, 'GET', '/v1/expenses/categories'), []);

export const listRecurring = (event: RequestEvent) =>
	soft('recurring templates fetch failed', apiJSON<RecurringTemplate[]>(event, 'GET', '/v1/expenses/recurring'), []);

export const getPartner = (event: RequestEvent) =>
	soft('household partner fetch failed', apiJSON<HouseholdPartner>(event, 'GET', '/v1/expenses/partner'), null);

export async function loadPlannerViewModel(event: RequestEvent, monthRaw: string | null, isPro: boolean): Promise<VM.PlannerViewModel> {
	const month = parseExpensesMonth(monthRaw);
	const vm: VM.PlannerViewModel = {
		hasLoadError: false,
		errorMessage: '',
		monthLabel: monthLabel(month),
		monthQuery: monthQueryString(month),
		prevMonthURL: expensesPlannerURL(addMonths(month, -1)),
		nextMonthURL: expensesPlannerURL(addMonths(month, 1)),
		hasSnapshot: false,
		snapshotID: '',
		salary: '',
		plannedTotal: '',
		spentTotal: '',
		spentPct: 0,
		donut: null,
		pillars: [],
		activity: [],
		suggestions: [],
		suggestionsError: '',
		planItems: [],
		categories: [],
		recurring: [],
		partnerName: '',
		hasPartner: false,
		isPro,
		drift: null,
		capacity: null,
		alertPolicy: null,
		discipline: null,
		reallocations: [],
		templates: [],
		financialGoals: [],
		portfolioLists: []
	};

	const [from, to] = monthDateRange(month);
	const [snapshot, monthSummary, expenseRows, suggestionsRes, planItems, categories, recurring, partner] = await Promise.all([
		soft('expenses snapshots fetch failed', getSnapshot(event, month), null),
		soft(
			'expenses month report fetch failed',
			apiJSON<unknown>(event, 'GET', '/v1/reports/expenses', undefined, { query: { from, to, granularity: 'month' } }).then(
				(body) => (Array.isArray(body) && body.length > 0 ? (body[0] as BudgetMonthSummary) : null)
			),
			null
		),
		soft('expenses list fetch failed', apiJSON<ExpenseRow[]>(event, 'GET', '/v1/expenses', undefined, { query: { from, to } }), []),
		apiJSON<{ suggestions?: ReportSuggestion[] } | null>(event, 'GET', '/v1/reports/suggestions', undefined, { query: { from, to } }).then(
			(body) => (body ? { ok: true as const, rows: body.suggestions ?? [] } : { ok: false as const, msg: 'No suggestions available.' }),
			(err) => {
				console.warn('expenses suggestions fetch failed', err);
				return { ok: false as const, msg: 'Could not load suggestions.' };
			}
		),
		soft('plan items fetch failed', apiJSON<BudgetPlanItem[]>(event, 'GET', '/v1/budget/items'), []),
		listCategories(event),
		isPro ? listRecurring(event) : Promise.resolve([] as RecurringTemplate[]),
		isPro ? getPartner(event) : Promise.resolve(null)
	]);
	if (!suggestionsRes.ok) vm.suggestionsError = suggestionsRes.msg;

	let drift: BudgetDriftDashboard | null = null;
	let discipline: BudgetDisciplineSummary | null = null;
	let reallocations: BudgetReallocationEvent[] = [];
	let templates: BudgetTemplate[] = [];
	let goals: FinancialGoal[] = [];
	let portfolios: PortfolioList[] = [];
	if (snapshot) {
		[drift, discipline, reallocations, templates, goals, portfolios] = await Promise.all([
			soft('budget drift fetch failed', apiJSON<BudgetDriftDashboard>(event, 'GET', `/v1/budget/snapshots/${snapshot.id}/drift`), null),
			soft('budget discipline fetch failed', apiJSON<BudgetDisciplineSummary>(event, 'GET', '/v1/budget/discipline', undefined, { query: { months: 6 } }), null),
			isPro ? soft('reallocations fetch failed', apiJSON<BudgetReallocationEvent[]>(event, 'GET', '/v1/budget/reallocations'), []) : [],
			isPro ? soft('budget templates fetch failed', apiJSON<BudgetTemplate[]>(event, 'GET', '/v1/budget/templates'), []) : [],
			isPro ? soft('financial goals fetch failed', apiJSON<FinancialGoal[]>(event, 'GET', '/v1/financial-goals'), []) : [],
			isPro ? soft('portfolio lists fetch failed', apiJSON<PortfolioList[]>(event, 'GET', '/v1/portfolio/lists'), []) : []
		]);
	}

	if (snapshot) {
		vm.hasSnapshot = true;
		vm.snapshotID = snapshot.id;
		vm.salary = formatCurrency(snapshot.netSalary);
		vm.alertPolicy = {
			categoryThreshold: formatOptionalFloat(snapshot.categoryDriftThreshold),
			totalThreshold: formatOptionalFloat(snapshot.totalDriftThreshold),
			alertsEnabled: snapshot.alertsEnabled,
			alertOnUnbudgeted: snapshot.alertOnUnbudgeted
		};
	}
	if (drift) vm.drift = mapBudgetDrift(drift);
	vm.capacity = mapSpendToUnits(
		await soft('dca capacity fetch failed', apiJSON<SpendToUnitsCapacity>(event, 'GET', '/v1/budget/dca-capacity'), null)
	);
	if (discipline) {
		vm.discipline = {
			score: optionalScore(discipline.currentScore),
			streak: `${discipline.completedMonthStreak} mo`,
			compliance: `${discipline.compliantMonths}/${discipline.evaluatedMonths}`
		};
	}
	vm.reallocations = (reallocations ?? []).map((e) => ({
		effectiveMonth: formatDateShort(e.effectiveMonth, 'Jan 2006'),
		freedCapital: formatBudgetCurrency(e.freedCapital, driftCurrency(drift))
	}));
	vm.templates = (templates ?? []).map((t) => ({ id: t.id, name: t.name }));
	vm.financialGoals = (goals ?? []).map((g) => ({ id: g.id, name: g.name, portfolioID: g.portfolioListId }));
	vm.portfolioLists = (portfolios ?? []).map((p) => ({ id: p.id, name: p.name }));

	let planned = 0;
	let spent = 0;
	let pillarPlans: PillarMap = {};
	let pillarActuals: PillarMap = {};
	if (monthSummary) {
		planned = monthSummary.planned;
		spent = monthSummary.actual;
		pillarPlans = monthSummary.pillarPlans;
		pillarActuals = monthSummary.pillarActuals;
		if (monthSummary.salary > 0 && !vm.hasSnapshot) vm.salary = formatCurrency(monthSummary.salary);
	}
	vm.plannedTotal = formatCurrency(planned);
	vm.spentTotal = formatCurrency(spent);
	if (planned > 0) {
		vm.spentPct = clampPercent((spent / planned) * 100);
		vm.donut = { spent, remaining: Math.max(0, planned - spent) };
	}

	vm.pillars = defaultPillarCards(month, snapshot?.netSalary ?? 0, snapshot?.targetShares, pillarPlans, pillarActuals);
	vm.activity = mapExpenseActivity(expenseRows ?? []);

	for (const item of planItems ?? []) {
		if (snapshot && item.snapshotId !== snapshot.id) continue;
		vm.planItems.push({
			id: item.id,
			title: item.title,
			pillar: pillarLabel(item.pillar),
			planned: formatCurrency(item.plannedAmount),
			plannedValue: item.plannedAmount,
			targetType: item.targetType,
			incomePercentage: formatOptionalFloat(item.incomePercentage),
			thresholdOverride: formatOptionalFloat(item.thresholdOverride),
			reallocationEligible: item.reallocationEligible
		});
	}
	if (suggestionsRes.ok) {
		vm.suggestions = suggestionsRes.rows.map((s) => ({
			id: s.id,
			title: s.title,
			message: s.message,
			severity: s.severity,
			savings: formatCurrency(s.recommendedSavings)
		}));
	}
	vm.categories = mapCategoryRows(categories ?? []);
	vm.recurring = mapRecurringRows(recurring ?? []);
	const name = partner?.displayName?.trim();
	if (name) {
		vm.hasPartner = true;
		vm.partnerName = name;
	}
	return vm;
}

// ---- tax teaser (ExpensesTaxTeaser) ----

function formatTaxMoney(v: TaxMoney | null | undefined): string {
	if (!v) return '';
	if (!(v.currency ?? '').trim() && v.amount === 0) return '';
	return `${v.currency} ${formatFloat(v.amount, 2)}`;
}

export async function loadTaxTeaser(event: RequestEvent, jurisdictionRaw: string | null, taxYearRaw: string | null): Promise<VM.TaxTeaserVM> {
	const vm: VM.TaxTeaserVM = {
		jurisdiction: (jurisdictionRaw ?? '').trim().toUpperCase() || 'US',
		taxYear: new Date().getFullYear(),
		estimatedDrag: '',
		netBenefit: '',
		optimization: '',
		loadError: false,
		hasData: false
	};
	const parsed = /^[+-]?\d+$/.test(taxYearRaw ?? '') ? Number(taxYearRaw) : NaN;
	if (parsed >= 2020) vm.taxYear = parsed;
	try {
		const dashboard = await apiJSON<TaxDashboard>(event, 'GET', '/v1/tax/dashboard', undefined, {
			query: { jurisdiction: vm.jurisdiction, taxYear: vm.taxYear }
		});
		if (!dashboard.profileComplete) {
			vm.hasData = false;
		} else {
			vm.hasData = true;
			vm.estimatedDrag = dashboard.taxDrag
				? formatTaxMoney(dashboard.taxDrag.projectedYearEndTax)
				: formatTaxMoney(dashboard.summary?.embeddedUnrealizedLiability);
			vm.netBenefit = formatTaxMoney(dashboard.summary?.estimatedNetBenefit);
			const count = dashboard.opportunities?.length ?? 0;
			vm.optimization = count === 0 ? '' : count === 1 ? '1 optimization opportunity identified' : `${count} optimization opportunities identified`;
		}
	} catch {
		vm.loadError = true;
	}
	return vm;
}
