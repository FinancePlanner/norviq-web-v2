// Port of norviq-web internal/pages/reports/cards_meta.go and the report
// tab strip (page.templ reportTabs). Pure.

import type { SegmentItem } from '#lib/components/norviq/types.js';
import { normalizeReportTab } from '#lib/nav.js';

export const CardNetWorth = 'net-worth';
export const CardQuickStats = 'quick-stats';
export const CardInsights = 'insights';
export const CardPerformance = 'performance';
export const CardAllocation = 'allocation';
export const CardSpending = 'spending';
export const CardBudget = 'budget-tracking';
export const CardSavings = 'savings-rate';
export const CardHousehold = 'household-split';
export const CardCashFlow = 'cash-flow';

/** DefaultCardOrder mirrors iOS ReportCard.allCases. */
export const DefaultCardOrder = [
	CardNetWorth,
	CardQuickStats,
	CardInsights,
	CardPerformance,
	CardAllocation,
	CardSpending,
	CardBudget,
	CardSavings,
	CardHousehold,
	CardCashFlow
];

export interface CardMeta {
	id: string;
	label: string;
	tabs: string[];
	wide?: boolean;
}

export function cardCatalog(): CardMeta[] {
	return [
		{ id: CardNetWorth, label: 'Net Worth', tabs: ['', 'portfolio'] },
		{ id: CardQuickStats, label: 'Quick Stats', tabs: [''] },
		{ id: CardInsights, label: 'Insights', tabs: [''], wide: true },
		{ id: CardPerformance, label: 'Performance', tabs: ['portfolio'] },
		{ id: CardAllocation, label: 'Allocation', tabs: ['portfolio'] },
		{ id: CardSpending, label: 'Spending', tabs: ['spending'] },
		{ id: CardBudget, label: 'Budget Tracking', tabs: ['spending'] },
		{ id: CardSavings, label: 'Savings Rate', tabs: ['spending'] },
		{ id: CardHousehold, label: 'Household Split', tabs: ['trends'] },
		{ id: CardCashFlow, label: 'Cash Flow', tabs: ['trends'] }
	];
}

export function cardLabel(id: string): string {
	return cardCatalog().find((c) => c.id === id)?.label ?? id;
}

/** CardMatchesTab mirrors iOS cardMatchesSelectedTab. */
export function cardMatchesTab(cardID: string, tab: string): boolean {
	const t = normalizeReportTab(tab);
	return (
		cardCatalog()
			.find((c) => c.id === cardID)
			?.tabs.includes(t) ?? false
	);
}

export function isWideCard(cardID: string): boolean {
	return cardCatalog().find((c) => c.id === cardID)?.wide ?? false;
}

export const reportCardSlotClass = (wide: boolean) =>
	wide ? 'report-card-slot report-card-wide' : 'report-card-slot';

/** reportTabs: the segmented control on every /reports page. */
export function reportTabs(): SegmentItem[] {
	return [
		{ label: 'Overview', path: '/reports' },
		{ label: 'Portfolio', path: '/reports/portfolio' },
		{ label: 'Spending', path: '/reports/spending' },
		{ label: 'Trends', path: '/reports/trends' },
		{ label: 'Reporting Center', path: '/reports/advanced' },
		{ label: 'Deep Dive', path: '/reports/deep-dive' }
	];
}

/** reportChangeClass */
export const reportChangeClass = (positive: boolean) =>
	positive ? 'report-change report-change-positive' : 'report-change report-change-negative';
