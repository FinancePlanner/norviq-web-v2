// Port of norviq-web internal/charts/charts.go: the go-echarts builders.
//
// Each builder returns the exact option go-echarts emitted (checked against
// golden output from the Go code in options.spec.ts), or null where Go
// returned "". Two kinds of keys are left out on purpose, because the Go
// web's slim ECharts bundle never registered their components, so they drew
// nothing there and only raise "component not imported" errors in dev here:
//   - the empty `title: {}` / `toolbox: {}` go-echarts adds to every chart;
//   - SentimentHistoryLine's `markLine` (the "neutral" zero line never rendered).
import type { EChartsOption } from 'echarts';
import {
	allocationColors,
	colorCyan,
	colorGreen,
	colorMuted,
	colorTint,
	goEchartsDefaultColors
} from './palette.js';
import type { ChartSpec, OptionObject } from './types.js';

/**
 * Go's normalizeChartID: go-echarts embedded the id in JS identifiers, so
 * hyphens became underscores. The DOM id keeps that spelling for CSS parity.
 */
export function normalizeChartID(id: string): string {
	return id.replaceAll('-', '_');
}

function lineData(values: readonly number[]) {
	return values.map((value) => ({ value }));
}

// go-echarts writes these two on every axisLabel it touches; null is ECharts' default.
const labelDefaults = { showMinLabel: null, showMaxLabel: null };

function spec(id: string, width: string, height: string, option: OptionObject): ChartSpec {
	return { id, width, height, option: option as EChartsOption };
}

/** Monthly spending trend. */
export function spendingLine(
	chartID: string,
	labels: readonly string[],
	values: readonly number[]
): ChartSpec | null {
	return trendLine(chartID, labels, values, 'Spending', colorCyan, 0.22);
}

/** Portfolio wealth trend. */
export function wealthLine(
	chartID: string,
	labels: readonly string[],
	values: readonly number[]
): ChartSpec | null {
	return trendLine(chartID, labels, values, 'Wealth', colorTint, 0.25);
}

/** A single-asset close-price line (crypto coin detail). */
export function priceLine(
	chartID: string,
	labels: readonly string[],
	values: readonly number[]
): ChartSpec | null {
	return trendLine(chartID, labels, values, 'Price', colorTint, 0.18);
}

function trendLine(
	chartID: string,
	labels: readonly string[],
	values: readonly number[],
	seriesName: string,
	lineColor: string,
	areaOpacity: number
): ChartSpec | null {
	// Go's default for every trend line, spending included.
	const id = normalizeChartID(chartID || 'wealth_chart');
	if (labels.length === 0 || values.length === 0) return null;
	return spec(id, '100%', '220px', {
		backgroundColor: 'transparent',
		color: [lineColor],
		grid: [{ left: '0%', top: '8%', right: '2%', bottom: '8%', containLabel: true }],
		legend: {},
		series: [
			{
				name: seriesName,
				type: 'line',
				smooth: true,
				showSymbol: false,
				data: lineData(values),
				emphasis: { focus: 'series' },
				lineStyle: { color: lineColor, width: 2.5 },
				areaStyle: { color: lineColor, opacity: areaOpacity }
			}
		],
		tooltip: {
			trigger: 'axis',
			triggerOn: 'mousemove|click',
			formatter: '{b}<br/>{c}',
			borderColor: '#e7e0d2',
			backgroundColor: 'rgba(255,255,255,0.96)',
			axisPointer: { type: 'line', snap: true }
		},
		xAxis: [
			{
				type: 'category',
				data: [...labels],
				axisLine: { show: false },
				axisLabel: { ...labelDefaults, color: colorMuted, fontSize: 11 },
				axisTick: { show: false },
				axisPointer: { snap: true, show: true }
			}
		],
		yAxis: [
			{
				type: 'value',
				splitLine: { show: true, lineStyle: { color: '#e7e0d2', type: 'dashed' } },
				axisLabel: { ...labelDefaults, color: colorMuted, fontSize: 11 }
			}
		]
	});
}

/** Sector allocation donut. Ids containing "allocation" (but not "expenses") get the large variant. */
export function allocationPie(
	chartID: string,
	sectors: readonly string[],
	weights: readonly number[]
): ChartSpec | null {
	const id = normalizeChartID(chartID || 'allocation_chart');
	if (sectors.length === 0) return null;
	let height = '160px';
	let radius = ['55%', '78%'];
	if (id.includes('allocation') && !id.includes('expenses')) {
		height = '260px';
		radius = ['48%', '74%'];
	}
	return spec(id, '100%', height, {
		backgroundColor: 'transparent',
		color: [...allocationColors],
		legend: { show: false },
		series: [
			{
				name: 'Allocation',
				type: 'pie',
				center: ['50%', '50%'],
				radius,
				data: sectors.map((name, i) => ({ name, value: i < weights.length ? weights[i] : 0 })),
				label: { show: false },
				emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.25)' }, focus: 'self' }
			}
		],
		tooltip: {
			trigger: 'item',
			triggerOn: 'mousemove|click',
			formatter: '{b}: {d}%',
			borderColor: '#e7e0d2',
			backgroundColor: 'rgba(255,255,255,0.96)'
		}
	});
}

/**
 * Signed bar chart for unrealized P/L by sector. As in Go, the category axis
 * carries no data (go-echarts dropped the sectors passed to XAxis because
 * SetXAxis was never called), so ECharts labels the bars by index.
 */
export function sectorGainsBar(
	chartID: string,
	sectors: readonly string[],
	gains: readonly number[]
): ChartSpec | null {
	const id = normalizeChartID(chartID || 'sector_gains_chart');
	if (sectors.length === 0) return null;
	return spec(id, '100%', '220px', {
		backgroundColor: 'transparent',
		color: [...goEchartsDefaultColors],
		legend: {},
		series: [
			{
				name: 'Unrealized P/L',
				type: 'bar',
				data: gains.map((value) => ({
					value,
					itemStyle: { color: value < 0 ? '#f23645' : colorGreen }
				})),
				label: { show: false }
			}
		],
		tooltip: {
			trigger: 'axis',
			triggerOn: 'mousemove|click',
			borderColor: '#e7e0d2',
			backgroundColor: 'rgba(255,255,255,0.96)'
		},
		xAxis: [{ type: 'category', axisLabel: { rotate: 30, ...labelDefaults } }],
		yAxis: [{ type: 'value' }]
	});
}

/** Minimal 72×28 inline sparkline for a watchlist row. Tint when up over the period, red when down. */
export function sparkline(chartID: string, closes: readonly number[]): ChartSpec | null {
	const id = normalizeChartID(chartID || `spark_${closes.length}`);
	if (closes.length < 2) return null;
	const lineColor = closes[closes.length - 1] >= closes[0] ? colorTint : '#f23645';
	return spec(id, '72px', '28px', {
		backgroundColor: 'transparent',
		color: [lineColor],
		grid: [{ left: '0', top: '2', right: '0', bottom: '2' }],
		legend: {},
		series: [
			{
				name: 'p',
				type: 'line',
				smooth: true,
				showSymbol: false,
				data: lineData(closes),
				lineStyle: { color: lineColor, width: 1.5 }
			}
		],
		tooltip: { show: false },
		xAxis: [{ show: false, type: 'category', data: closes.map((_, i) => String(i)) }],
		yAxis: [{ type: 'value', show: false, scale: true }]
	});
}

/** OHLC candlestick; each bar is [open, close, low, high]. Unused by the Go pages, ported for completeness. */
export function candlestick(
	chartID: string,
	xLabels: readonly string[],
	klineData: readonly (readonly number[])[]
): ChartSpec | null {
	const id = normalizeChartID(chartID || 'candle_chart');
	if (xLabels.length === 0 || klineData.length === 0) return null;
	return spec(id, '100%', '420px', {
		backgroundColor: 'transparent',
		color: [...goEchartsDefaultColors],
		grid: [{ left: '8%', top: '10%', right: '8%', bottom: '15%', containLabel: true }],
		legend: { show: false },
		series: [
			{
				name: 'Price',
				type: 'candlestick',
				data: klineData.map((ohlc) => ({
					value: ohlc.length >= 4 ? [ohlc[0], ohlc[1], ohlc[2], ohlc[3]] : null
				})),
				itemStyle: {
					color: '#22c55e',
					color0: '#ef4444',
					borderColor: '#22c55e',
					borderColor0: '#ef4444'
				}
			}
		],
		tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
		xAxis: [
			{
				type: 'category',
				data: [...xLabels],
				axisLine: { show: true },
				axisLabel: { ...labelDefaults, color: colorMuted, fontSize: 10 }
			}
		],
		yAxis: [
			{
				type: 'value',
				scale: true,
				splitLine: { show: true, lineStyle: { color: '#57534e', type: 'dashed' } },
				axisLabel: { ...labelDefaults, color: colorMuted, fontSize: 10 }
			}
		]
	});
}

/**
 * A symbol's daily sentiment score. The Y axis is pinned to -100..100 so a
 * week of near-neutral noise does not read as a dramatic swing.
 */
export function sentimentHistoryLine(
	chartID: string,
	labels: readonly string[],
	scores: readonly number[]
): ChartSpec | null {
	const id = normalizeChartID(chartID || 'sentiment_history');
	if (scores.length < 2) return null;
	const lineColor = scores[scores.length - 1] >= 0 ? colorTint : '#f23645';
	return spec(id, '100%', '180px', {
		backgroundColor: 'transparent',
		color: [lineColor],
		grid: [{ left: '8', top: '16', right: '8', bottom: '24', containLabel: true }],
		legend: {},
		series: [
			{
				name: 'sentiment',
				type: 'line',
				smooth: true,
				showSymbol: false,
				data: lineData(scores),
				lineStyle: { color: lineColor, width: 2 }
			}
		],
		tooltip: { show: true, trigger: 'axis' },
		xAxis: [
			{
				type: 'category',
				data: [...labels],
				axisLabel: { show: true, ...labelDefaults, fontSize: 10 }
			}
		],
		yAxis: [
			{
				type: 'value',
				min: -100,
				max: 100,
				axisLabel: { show: true, ...labelDefaults, fontSize: 10 }
			}
		]
	});
}
