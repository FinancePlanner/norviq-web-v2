// Port of norviq-web internal/charts/pulse.go: the command center's spend
// pillar bar and activity calendar heat-map. Their ids are not normalized
// (Go's renderRawChart kept hyphens).
import type { EChartsOption } from 'echarts';
import { colorMuted } from './palette.js';
import type { ChartSpec } from './types.js';

/** One segment of the spend part-to-whole bar. colorVar names the CSS custom property carrying the pillar color. */
export interface PillarSlice {
	name: string;
	value: number;
	colorVar?: string;
}

/** Neutral placeholder; theme.ts resolves colorVar against the live appearance. */
export const pillarSeriesColor = '#8D8371';

export function pillarTooltip(info: { value?: unknown; marker?: unknown; seriesName?: string }): string {
	const v = Number(info.value || 0);
	return info.marker + ' ' + info.seriesName + ': $' + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Spending split by pillar as one horizontal stacked bar: segments share a
 * baseline, so the eye compares lengths rather than angles.
 */
export function spendPillarBar(chartID: string, slices: readonly PillarSlice[]): ChartSpec | null {
	const id = chartID || 'spend_pillars';
	// A zero or negative segment has no width but would still claim a legend swatch.
	const visible = slices.filter((s) => s.value > 0);
	if (visible.length === 0) return null;
	const option = {
		backgroundColor: 'transparent',
		grid: { left: '0%', right: '0%', top: '0%', bottom: '0%', containLabel: false },
		legend: { show: true, bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: colorMuted, fontSize: 11 } },
		tooltip: { trigger: 'item', triggerOn: 'mousemove|click', formatter: pillarTooltip },
		xAxis: { type: 'value', show: false, max: 'dataMax' },
		yAxis: { type: 'category', show: false, data: [''] },
		series: visible.map((s) => ({
			name: s.name,
			type: 'bar',
			stack: 'spend',
			colorVar: s.colorVar ?? '',
			data: [s.value],
			// A 2px surface gap keeps adjacent segments from fusing into one block.
			itemStyle: { color: pillarSeriesColor, borderColor: 'transparent', borderWidth: 2 },
			emphasis: { focus: 'series' }
		}))
	};
	return { id, width: '100%', height: '120px', option: option as unknown as EChartsOption };
}

/** One hue, light to dark; theme.ts re-derives it per appearance. These are the light-mode steps. */
export const activityRamp: readonly string[] = ['#F0E9DC', '#E0C89A', '#C97A2B', '#8A4F16'];

export function heatmapTooltip(info: { value?: unknown }): string {
	const v = (info.value || []) as unknown[];
	const n = Number(v[1] || 0);
	return v[0] + '<br/>' + n + (n === 1 ? ' event' : ' events');
}

function isoDay(d: Date | string, timeZone: string): string {
	if (typeof d === 'string') return d.slice(0, 10);
	// en-CA formats as YYYY-MM-DD.
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/**
 * Daily activity density on a calendar grid. counts are keyed "YYYY-MM-DD".
 * from/to may be Dates (formatted in timeZone, Go used their own location) or
 * "YYYY-MM-DD" strings. Go iterated a map, so its data order was random; here
 * it follows the input order.
 */
export function activityHeatmap(
	chartID: string,
	from: Date | string,
	to: Date | string,
	counts: Readonly<Record<string, number>> | ReadonlyMap<string, number> | null | undefined,
	timeZone = 'UTC'
): ChartSpec | null {
	const id = chartID || 'activity_heatmap';
	const entries = counts ? (counts instanceof Map ? [...counts] : Object.entries(counts)) : [];
	const fromDay = isoDay(from, timeZone);
	const toDay = isoDay(to, timeZone);
	const inverted = typeof from === 'string' || typeof to === 'string' ? toDay < fromDay : (to as Date).getTime() < (from as Date).getTime();
	if (entries.length === 0 || inverted) return null;

	const data: Array<[string, number]> = [];
	let max = 0;
	for (const [day, n] of entries) {
		if (n <= 0) continue;
		data.push([day, n]);
		if (n > max) max = n;
	}
	if (data.length === 0) return null;

	const option = {
		backgroundColor: 'transparent',
		tooltip: { trigger: 'item', triggerOn: 'mousemove|click', formatter: heatmapTooltip },
		visualMap: {
			min: 0,
			max,
			type: 'continuous',
			orient: 'horizontal',
			left: 'center',
			bottom: 0,
			itemWidth: 10,
			itemHeight: 90,
			text: ['more', 'less'],
			textStyle: { color: colorMuted, fontSize: 11 },
			inRange: { color: [...activityRamp] }
		},
		calendar: {
			top: 20,
			left: 20,
			right: 20,
			cellSize: ['auto', 13],
			range: [fromDay, toDay],
			itemStyle: { borderWidth: 2, borderColor: 'transparent' },
			splitLine: { show: false },
			yearLabel: { show: false },
			dayLabel: { firstDay: 1, color: colorMuted, fontSize: 10 },
			monthLabel: { color: colorMuted, fontSize: 10 }
		},
		series: { type: 'heatmap', coordinateSystem: 'calendar', data }
	};
	return { id, width: '100%', height: '200px', option: option as unknown as EChartsOption };
}
