// View models from norviq-web internal/pages/expenses/viewmodel.go, camelCased.
import type { Option } from '#lib/components/norviq/types.js';
import { BUDGET_PILLARS } from '../pillars.js';

export interface PlannerViewModel {
	hasLoadError: boolean;
	errorMessage: string;
	monthLabel: string;
	monthQuery: string;
	prevMonthURL: string;
	nextMonthURL: string;
	hasSnapshot: boolean;
	snapshotID: string;
	salary: string;
	plannedTotal: string;
	spentTotal: string;
	spentPct: number;
	/** Go DonutHTML: AllocationPie(["Spent","Remaining"]); null when nothing is planned. */
	donut: { spent: number; remaining: number } | null;
	pillars: PillarCardVM[];
	activity: ActivityItemVM[];
	suggestions: SuggestionVM[];
	suggestionsError: string;
	planItems: PlanItemVM[];
	categories: CategoryRowVM[];
	recurring: RecurringTemplateVM[];
	partnerName: string;
	hasPartner: boolean;
	isPro: boolean;
	drift: BudgetDriftVM | null;
	capacity: SpendToUnitsVM | null;
	alertPolicy: BudgetAlertPolicyVM | null;
	discipline: BudgetDisciplineVM | null;
	reallocations: { effectiveMonth: string; freedCapital: string }[];
	templates: { id: string; name: string }[];
	financialGoals: { id: string; name: string; portfolioID: string }[];
	portfolioLists: { id: string; name: string }[];
}

export interface BudgetDriftVM {
	snapshotID: string;
	revision: number;
	currencyCode: string;
	level: string;
	levelLabel: string;
	totalTarget: string;
	totalActual: string;
	driftAmount: string;
	driftPercent: string;
	lostCapital: string;
	investmentTarget: string;
	surplusReady: string;
	deployPct: number;
	categories: CategoryDriftVM[];
	hasSuggestions: boolean;
}

export interface CategoryDriftVM {
	id: string;
	title: string;
	target: string;
	actual: string;
	drift: string;
	driftPercent: string;
	level: string;
	levelLabel: string;
	eligible: boolean;
	suggestedCut: number;
	suggestedCutLabel: string;
}

export interface SpendToUnitsVM {
	symbol: string;
	hero: string;
	priceLine: string;
	disclaimer: string;
	quoteStale: boolean;
	overspend: { title: string; line: string }[];
}

export interface BudgetDisciplineVM {
	score: string;
	streak: string;
	compliance: string;
}

export interface BudgetAlertPolicyVM {
	categoryThreshold: string;
	totalThreshold: string;
	alertsEnabled: boolean;
	alertOnUnbudgeted: boolean;
}

export interface PillarCardVM {
	key: string;
	label: string;
	hint: string;
	icon: string;
	colorVar: string;
	isCustom: boolean;
	target: string;
	planned: string;
	spent: string;
	left: string;
	overspent: boolean;
	progressPct: number;
	progressLabel: string;
	progressState: string;
	hasTarget: boolean;
	detailURL: string;
}

export interface ActivityItemVM {
	id: string;
	title: string;
	amount: string;
	date: string;
	pillar: string;
	icon: string;
}

export interface SuggestionVM {
	id: string;
	title: string;
	message: string;
	severity: string;
	savings: string;
}

export interface PlanItemVM {
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

export interface CategoryRowVM {
	id: string;
	name: string;
	pillarLabel: string;
	isDefault: boolean;
	canDelete: boolean;
}

export interface RecurringTemplateVM {
	id: string;
	title: string;
	amount: string;
	pillar: string;
	frequency: string;
}

export interface CategoryOptionVM {
	id: string;
	name: string;
	pillarKey: string;
	pillarLabel: string;
}

export interface TaxTeaserVM {
	jurisdiction: string;
	taxYear: number;
	estimatedDrag: string;
	netBenefit: string;
	optimization: string;
	loadError: boolean;
	hasData: boolean;
}

export interface RecordExpenseFormVM {
	monthQuery: string;
	title: string;
	amount: string;
	pillar: string;
	categories: CategoryOptionVM[];
	selectedCategory: string;
	splitMode: string;
	userSharePercent: string;
	hasPartner: boolean;
	error: string;
}

export interface SalaryFormVM {
	monthQuery: string;
	snapshotID: string;
	salary: string;
	shares: { key: string; label: string; hint: string; value: string }[];
	error: string;
}

export interface PlanItemFormVM {
	monthQuery: string;
	snapshotID: string;
	itemID: string;
	title: string;
	plannedAmount: string;
	pillar: string;
	splitMode: string;
	userSharePercent: string;
	hasPartner: boolean;
	isEdit: boolean;
	error: string;
}

export interface CategoryFormVM {
	monthQuery: string;
	name: string;
	pillar: string;
	error: string;
}

export interface RecurringTemplateFormVM {
	monthQuery: string;
	templateID: string;
	title: string;
	amount: string;
	pillar: string;
	frequency: string;
	categoryID: string;
	splitMode: string;
	userSharePercent: string;
	categories: CategoryOptionVM[];
	hasPartner: boolean;
	isEdit: boolean;
	error: string;
}

export interface PartnerFormVM {
	displayName: string;
	defaultSharePercent: string;
	error: string;
}

// ---- option builders (viewmodel.go) ----

export function categoryOptionLabel(c: CategoryOptionVM): string {
	if (c.pillarLabel !== '' && c.pillarLabel !== 'All pillars')
		return c.name + ' · ' + c.pillarLabel;
	return c.name;
}

export const pillarOptions = (selected: string): Option[] =>
	BUDGET_PILLARS.map((p) => ({ value: p.key, label: p.label, selected: selected === p.key }));

export const pillarOptionsWithAll = (selected: string): Option[] => [
	{ value: '', label: 'All pillars', selected: selected === '' },
	...pillarOptions(selected)
];

export const splitModeOptions = (selected: string): Option[] => [
	{ value: 'personal', label: 'Personal', selected: selected === 'personal' || selected === '' },
	{ value: 'shared', label: 'Shared with partner', selected: selected === 'shared' }
];

export const frequencyOptions = (selected: string): Option[] => [
	{ value: 'monthly', label: 'Monthly', selected: selected === 'monthly' || selected === '' },
	{ value: 'weekly', label: 'Weekly', selected: selected === 'weekly' }
];

export const categoryOptions = (categories: CategoryOptionVM[], selected: string): Option[] => [
	{ value: '', label: 'None', selected: selected === '' },
	...categories.map((c) => ({
		value: c.id,
		label: categoryOptionLabel(c),
		selected: selected === c.id
	}))
];

export const destinationPortfolioOptions = (
	portfolios: { id: string; name: string }[]
): Option[] => [
	{ value: '', label: 'General Investments bucket' },
	...portfolios.map((p) => ({ value: p.id, label: p.name }))
];

export const destinationGoalOptions = (
	goals: { id: string; name: string; portfolioID: string }[]
): Option[] => [
	{ value: '', label: 'No linked goal' },
	...goals.map((g) => ({ value: g.id, label: g.name, attrs: { 'data-portfolio': g.portfolioID } }))
];
