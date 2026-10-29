// ChartBuilder* view models (pages/stock/viewmodel.go). Shared by the stock
// Builder tab and, for the result, by /chart-builder.

import type { MultiSeriesData } from '#lib/charts/index.js';

/** ChartBuilderTabVM holds the metric catalog used by the interactive builder. */
export interface ChartBuilderTabVM {
	groups: ChartBuilderMetricGroupVM[];
	error: string;
}

/** ChartBuilderMetricGroupVM is one statement-derived section of metrics. */
export interface ChartBuilderMetricGroupVM {
	key: string;
	label: string;
	metrics: ChartBuilderMetricVM[];
}

/** ChartBuilderMetricVM is one selectable series descriptor. */
export interface ChartBuilderMetricVM {
	key: string;
	label: string;
	format: string;
	supportsTTM: boolean;
	selected: boolean;
}

/**
 * ChartBuilderResultVM is what GET /portfolio/{symbol}/builder/chart returns
 * (Go rendered it as the HTMX fragment). Go's ChartHTML is replaced by the
 * builder inputs (chartID, labels, series); ChartBuilderResult.svelte builds
 * the ECharts spec with multiSeriesLine / multiSeriesBar.
 */
export interface ChartBuilderResultVM {
	hasData: boolean;
	error: string;
	title: string;
	chartType: string;
	period: string;
	mixedUnits: boolean;
	showGrowth: boolean;
	csvURL: string;
	growth: ChartBuilderGrowthTableVM;
	seriesCount: number;
	chartID: string;
	labels: string[];
	series: MultiSeriesData[];
}

/** ChartBuilderGrowthTableVM holds the backend-computed YoY, total, and CAGR values per series. */
export interface ChartBuilderGrowthTableVM {
	periods: string[];
	rows: ChartBuilderGrowthRowVM[];
}

/** ChartBuilderGrowthRowVM is one metric/company row in the growth table. */
export interface ChartBuilderGrowthRowVM {
	label: string;
	yoy: string[];
	totalChange: string;
	cagr: string;
}

export const emptyChartBuilderResult = (error = ''): ChartBuilderResultVM => ({
	hasData: false,
	error,
	title: '',
	chartType: '',
	period: '',
	mixedUnits: false,
	showGrowth: false,
	csvURL: '',
	growth: { periods: [], rows: [] },
	seriesCount: 0,
	chartID: '',
	labels: [],
	series: []
});

/** chartBuilderChartPath (chart_builder.templ). */
export function chartBuilderChartPath(symbol: string): string {
	return '/portfolio/' + symbol.toLowerCase() + '/builder/chart';
}

/** chartBuilderFormatLabel (chart_builder.templ). */
export function chartBuilderFormatLabel(format: string): string {
	return format === 'perShare' ? 'per share' : format;
}

/** chartBuilderPeriodLabel (chart_builder_fragment.templ) / chartBuilderPeriodTitle (handler). */
export function chartBuilderPeriodLabel(period: string): string {
	switch (period) {
		case 'quarter':
			return 'Quarterly';
		case 'ttm':
			return 'TTM';
		default:
			return 'Annual';
	}
}
