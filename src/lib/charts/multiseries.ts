// Port of norviq-web internal/charts/multiseries.go: period-aligned comparison
// charts (stock chart builder, scenarios, planning).
import type { EChartsOption } from 'echarts';
import { colorMuted, multiSeriesColors } from './palette.js';
import { normalizeChartID } from './options.js';
import type { ChartSpec } from './types.js';

/** One named, period-aligned series. A null value renders as a gap, not zero. */
export interface MultiSeriesData {
	name: string;
	/** "percent" | "ratio" | "perShare" | anything else (compact). Only the first series' format is used. */
	format?: string;
	values: ReadonlyArray<number | null | undefined>;
}

type AxisValue = number | string | null | undefined;

// The axis/tooltip formatters, verbatim from Go (they run in the browser, so
// toLocaleString(undefined, …) follows the reader's locale, as before).
export function compactAxisFormatter(value: AxisValue): string {
	const v = value as number;
	const absolute = Math.abs(v);
	if (absolute >= 1000000000000) return (v / 1000000000000).toFixed(1) + 'T';
	if (absolute >= 1000000000) return (v / 1000000000).toFixed(1) + 'B';
	if (absolute >= 1000000) return (v / 1000000).toFixed(1) + 'M';
	if (absolute >= 1000) return (v / 1000).toFixed(1) + 'K';
	return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function percentAxisFormatter(value: AxisValue): string {
	if (value === '-' || value === null || value === undefined) return '-';
	return (Number(value) * 100).toFixed(1) + '%';
}

export function ratioAxisFormatter(value: AxisValue): string {
	if (value === '-' || value === null || value === undefined) return '-';
	return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'x';
}

export function decimalAxisFormatter(value: AxisValue): string {
	if (value === '-' || value === null || value === undefined) return '-';
	return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function multiSeriesValueFormatter(
	format: string | undefined
): (value: AxisValue) => string {
	switch (format) {
		case 'percent':
			return percentAxisFormatter;
		case 'ratio':
			return ratioAxisFormatter;
		case 'perShare':
			return decimalAxisFormatter;
		default:
			return compactAxisFormatter;
	}
}

function valueAt(values: MultiSeriesData['values'], index: number): number | '-' {
	const v = index < values.length ? values[index] : null;
	return v === null || v === undefined ? '-' : v;
}

function aligned(values: MultiSeriesData['values'], count: number) {
	return Array.from({ length: count }, (_, i) => ({ value: valueAt(values, i) }));
}

function globalOptions(labels: readonly string[], format: string | undefined) {
	const formatter = multiSeriesValueFormatter(format);
	const labelDefaults = { showMinLabel: null, showMaxLabel: null };
	return {
		backgroundColor: 'transparent',
		color: [...multiSeriesColors],
		grid: [{ left: '1%', top: '18%', right: '2%', bottom: '8%', containLabel: true }],
		legend: {
			type: 'scroll',
			show: true,
			left: 'center',
			top: '0',
			textStyle: { color: colorMuted, fontSize: 11 }
		},
		tooltip: {
			trigger: 'axis',
			triggerOn: 'mousemove|click',
			valueFormatter: formatter,
			borderColor: '#e2e8f0',
			backgroundColor: 'rgba(255,255,255,0.96)',
			axisPointer: { type: 'shadow', snap: true }
		},
		xAxis: [
			{
				type: 'category',
				data: [...labels],
				axisLine: { show: false },
				axisLabel: { ...labelDefaults, color: colorMuted, fontSize: 11 },
				axisTick: { show: false }
			}
		],
		yAxis: [
			{
				type: 'value',
				splitLine: { show: true, lineStyle: { color: '#e2e8f0', type: 'dashed' } },
				axisLabel: { formatter, ...labelDefaults, color: colorMuted, fontSize: 11 }
			}
		]
	};
}

/** Several aligned series as an interactive line chart with a shared value axis. */
export function multiSeriesLine(
	chartID: string,
	labels: readonly string[],
	series: readonly MultiSeriesData[]
): ChartSpec | null {
	const id = normalizeChartID(chartID || 'multi_series_line');
	if (labels.length === 0 || series.length === 0) return null;
	const option = {
		...globalOptions(labels, series[0].format),
		series: series.map((item) => ({
			name: item.name,
			type: 'line',
			smooth: false,
			connectNulls: false,
			showSymbol: false,
			data: aligned(item.values, labels.length),
			emphasis: { focus: 'series' },
			lineStyle: { width: 2.5 }
		}))
	};
	return { id, width: '100%', height: '360px', option: option as EChartsOption };
}

/** Several aligned series as grouped bars with a shared value axis. */
export function multiSeriesBar(
	chartID: string,
	labels: readonly string[],
	series: readonly MultiSeriesData[]
): ChartSpec | null {
	const id = normalizeChartID(chartID || 'multi_series_bar');
	if (labels.length === 0 || series.length === 0) return null;
	const option = {
		...globalOptions(labels, series[0].format),
		series: series.map((item) => ({
			name: item.name,
			type: 'bar',
			data: aligned(item.values, labels.length),
			label: { show: false },
			emphasis: { focus: 'series' }
		}))
	};
	return { id, width: '100%', height: '360px', option: option as EChartsOption };
}
