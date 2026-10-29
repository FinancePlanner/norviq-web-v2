// View models for /dashboard and /dashboard/pulse (Go pages/dashboard
// viewmodel.go: OverviewViewModel, CommandCenterViewModel and friends).
//
// Charts travel as plain data (labels/values/slices); the page builds the
// ECharts spec, because options can hold formatter functions that do not
// serialise from +page.server.ts.

import type { PillarSlice } from '#lib/charts/index.js';
import type {
	ActivityItemVM,
	FinancialHealthVM,
	FocusPointVM,
	HealthMetricsVM,
	InsightCardVM,
	RecentSpendItemVM
} from '../types.js';

export interface SeriesData {
	labels: string[];
	values: number[];
}

export interface OverviewViewModel {
	greeting: string;
	username: string;
	totalWealth: string;
	ytdPercent: string;
	ytdPositive: boolean;
	portfolioPeriodPercent: string;
	portfolioPeriodSuffix: string;
	portfolioPeriodPositive: boolean;
	/** Go WealthChartHTML: null where Go had "". */
	wealthChart: SeriesData | null;
	spendingThisMonth: string;
	spendingPeriodPercent: string;
	spendingPeriodPositive: boolean;
	/** Go SpendingChartHTML. */
	spendingChart: SeriesData | null;
	activities: ActivityItemVM[];
	recentSpend: RecentSpendItemVM[];
	financialHealth: FinancialHealthVM;
	healthMetrics: HealthMetricsVM;
	insightCards: InsightCardVM[];
	focusPoints: FocusPointVM[];
	goalsError: boolean;
	loadErrors: Record<string, boolean>;
}

export interface RangeOptionVM {
	key: string;
	label: string;
	href: string;
	active: boolean;
}

export interface LedgerFilterVM {
	key: string;
	label: string;
	href: string;
	active: boolean;
}

export interface LedgerDayVM {
	label: string;
	items: ActivityItemVM[];
}

export interface ActionItemVM {
	id: string;
	/** budget | earnings | price_target | rebalancing | tax | watchlist_screen */
	kind: string;
	kindLabel: string;
	title: string;
	body: string;
	/** critical | warning | info */
	tone: string;
	href: string;
	readHref: string;
	relativeTime: string;
}

export interface ActionGroupVM {
	kind: string;
	kindLabel: string;
	tone: string;
	items: ActionItemVM[];
}

/** The NOW rail on its own (LoadActionQueueViewModel). */
export interface ActionQueueVM {
	actionQueue: ActionItemVM[];
	unreadCount: number;
	loadError: boolean;
}

/** The LEDGER rail on its own (LoadLedgerViewModel). */
export interface LedgerVM {
	range: string;
	rangeLabel: string;
	domain: string;
	ledgerFilters: LedgerFilterVM[];
	ledger: LedgerDayVM[];
	loadError: boolean;
}

export interface HeatmapData {
	from: string;
	to: string;
	counts: Record<string, number>;
}

export interface CommandCenterViewModel {
	overview: OverviewViewModel;
	range: string;
	rangeLabel: string;
	rangeOptions: RangeOptionVM[];
	queue: ActionQueueVM;
	ledger: LedgerVM;
	/** Go PillarChartHTML: null where Go had "". */
	pillarSlices: PillarSlice[] | null;
	/** Go HeatmapChartHTML: null where Go had "". */
	heatmap: HeatmapData | null;
	domain: string;
	loadErrors: Record<string, boolean>;
}
