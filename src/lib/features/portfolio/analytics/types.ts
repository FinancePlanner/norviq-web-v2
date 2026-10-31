// View models for the portfolio analytics pages (pages/portfolio/viewmodel.go):
// allocation, sector gains, earnings, dividends, news. Field names are the Go
// names, camelCased.

import type { VisualizerVM } from '../earningsviz/types.js';

export interface AllocationSliceVM {
	label: string;
	value: string;
	percent: string;
	overweight: string;
	color: string;
	rawValue: number;
	rawPercent: number;
}

export interface AllocationMetricVM {
	label: string;
	value: string;
	delta: string;
	tone: string;
}

export interface AllocationTipVM {
	title: string;
	detail: string;
	value: string;
	tone: string;
	action: string;
}

export interface PortfolioListRowVM {
	id: string;
	name: string;
	isDefault: boolean;
	canDelete: boolean;
	positionCount: string;
	totalValue: string;
	holdingsURL: string;
}

/** Plain chart input; the page builds the ECharts spec (formatters do not serialize). */
export interface PieInput {
	chartID: string;
	labels: string[];
	weights: number[];
}

export interface AllocationViewModel {
	totalValue: string;
	subtitle: string;
	summaryMetrics: AllocationMetricVM[];
	tips: AllocationTipVM[];
	costMeta: AllocationMetricVM[];
	costRows: AllocationSliceVM[];
	costTopRows: AllocationSliceVM[];
	costOtherCount: number;
	costOtherValue: string;
	costOtherWeight: string;
	costChart: PieInput | null;
	sectorMeta: AllocationMetricVM[];
	sectorRows: AllocationSliceVM[];
	sectorChart: PieInput | null;
	portfolioLists: PortfolioListRowVM[];
	hasCostData: boolean;
	hasSectorData: boolean;
	hasLists: boolean;
	loadError: boolean;
}

/** ListFormVM (create/rename portfolio list modal). */
export interface ListFormVM {
	listID: string;
	name: string;
	isEdit: boolean;
	isDefault: boolean;
	canDelete: boolean;
	error: string;
}

export interface SectorGainsRowVM {
	sector: string;
	marketValue: string;
	costBasis: string;
	unrealizedPnl: string;
	unrealizedPnlPercent: string;
	weightPercent: string;
	positive: boolean;
}

export interface SectorGainsViewModel {
	subtitle: string;
	totalUnrealizedPnl: string;
	totalMarketValue: string;
	rows: SectorGainsRowVM[];
	chart: { labels: string[]; values: number[] } | null;
	hasData: boolean;
	loadError: boolean;
}

export interface EarningsDayVM {
	day: number;
	inMonth: boolean;
	hasEvents: boolean;
	isToday: boolean;
	eventCount: number;
	symbols: string[];
}

export interface EarningsEventVM {
	symbol: string;
	date: string;
	epsEstimate: string;
	hasPortfolio: boolean;
	detailURL: string;
}

export interface EarningsViewModel {
	monthLabel: string;
	calendarDays: EarningsDayVM[];
	upcoming: EarningsEventVM[];
	loadError: boolean;
	visualizer: VisualizerVM;
}

export interface DividendProjectedItemVM {
	symbol: string;
	exDividendDate: string;
	paymentDate: string;
	amountPerShare: string;
	projectedTotal: string;
}

export interface DividendsViewModel {
	annualProjectedIncome: string;
	upcoming: DividendProjectedItemVM[];
	monthlyChart: { labels: string[]; values: number[] } | null;
	loadError: boolean;
}

export interface NewsArticleVM {
	id: string;
	headline: string;
	source: string;
	symbol: string;
	timeAgo: string;
	url: string;
	summary: string;
	relationship: string;
	eventType: string;
	severity: string;
	whyItMatters: string;
	exposure: string;
	thesisImpact: string;
	isThesisWatch: boolean;
	isRead: boolean;
	/** Saved articles only: the edit form's values (loadNewsArticleFormVM). */
	form?: NewsArticleFormVM;
}

export interface NewsArticleFormVM {
	articleID: string;
	isEdit: boolean;
	symbol: string;
	headline: string;
	source: string;
	url: string;
	summary: string;
	publishedAt: string;
	error: string;
}

export interface NewsViewModel {
	articles: NewsArticleVM[];
	filter: string;
	loadError: boolean;
	isPro: boolean;
}

export const emptyNewsArticleForm = (): NewsArticleFormVM => ({
	articleID: '',
	isEdit: false,
	symbol: '',
	headline: '',
	source: '',
	url: '',
	summary: '',
	publishedAt: '',
	error: ''
});

export const emptyListForm = (): ListFormVM => ({
	listID: '',
	name: '',
	isEdit: false,
	isDefault: false,
	canDelete: false,
	error: ''
});
