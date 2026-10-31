// Chart builders from norviq-web internal/pages/scenarios/page.templ
// (comparisonChart, comparisonFanChart, comparisonMetricChart). They return
// the same multi-series specs the Go charts.MultiSeries* builders produced.
import {
	multiSeriesBar,
	multiSeriesLine,
	type ChartSpec,
	type MultiSeriesData
} from '#lib/charts/index.js';
import { formatFloat } from '#lib/format.js';
import type { ScenarioRun } from './types.js';
import { numberFrom, objectArray } from './view.js';

type Obj = Record<string, unknown>;

export function comparisonElapsedDays(point: Obj): number {
	const value = point.elapsed_days;
	if (typeof value === 'number') return Math.trunc(value);
	return Math.trunc(numberFrom(point, 'elapsed_months') * 30.4375);
}

export const comparisonElapsedLabel = (days: number) =>
	days < 60 ? `${days}d` : `${formatFloat(days / 365.25, 1)}y`;

function sortedDays(daySet: Set<number>): number[] {
	return [...daySet].sort((a, b) => a - b);
}

export function comparisonChart(runs: ScenarioRun[], percentage: boolean): ChartSpec | null {
	const daySet = new Set<number>();
	const pointsByRun: Obj[][] = runs.map(() => []);
	runs.forEach((run, index) => {
		if (run.result == null) return;
		let points = objectArray(run.result.timeline);
		if (points.length === 0) points = objectArray(run.result.percentile_bands);
		pointsByRun[index] = points;
		for (const point of points) daySet.add(comparisonElapsedDays(point));
	});
	const days = sortedDays(daySet);
	const labels = days.map(comparisonElapsedLabel);
	const series: MultiSeriesData[] = [];
	pointsByRun.forEach((points, index) => {
		if (points.length === 0) return;
		const byDay = new Map<number, number>();
		for (const point of points) {
			const value = 'value' in point ? numberFrom(point, 'value') : numberFrom(point, 'p50');
			byDay.set(comparisonElapsedDays(point), value);
		}
		const initial = byDay.get(days[0]) ?? 0;
		const values = days.map((day) => {
			let value = byDay.get(day);
			if (value === undefined) return null;
			if (percentage && initial !== 0) value = value / initial - 1;
			return value;
		});
		series.push({ name: `Run ${index + 1}`, values, format: percentage ? 'percent' : '' });
	});
	return multiSeriesLine(
		percentage ? 'scenario-comparison-return' : 'scenario-comparison-value',
		labels,
		series
	);
}

export function comparisonFanChart(runs: ScenarioRun[]): ChartSpec | null {
	const daySet = new Set<number>();
	const bandsByRun: Obj[][] = runs.map(() => []);
	runs.forEach((run, index) => {
		if (run.result == null) return;
		bandsByRun[index] = objectArray(run.result.percentile_bands);
		for (const point of bandsByRun[index]) daySet.add(comparisonElapsedDays(point));
	});
	const days = sortedDays(daySet);
	const labels = days.map(comparisonElapsedLabel);
	const series: MultiSeriesData[] = [];
	bandsByRun.forEach((bands, index) => {
		for (const percentile of ['p10', 'p50', 'p90']) {
			const byDay = new Map<number, number>();
			for (const point of bands)
				byDay.set(comparisonElapsedDays(point), numberFrom(point, percentile));
			const values = days.map((day) => byDay.get(day) ?? null);
			if (bands.length > 0) series.push({ name: `Run ${index + 1} ${percentile}`, values });
		}
	});
	return multiSeriesLine('scenario-comparison-fan', labels, series);
}

export function comparisonMetricChart(
	runs: ScenarioRun[],
	key: string,
	chartID: string
): ChartSpec | null {
	const labels = runs.map((_, index) => `Run ${index + 1}`);
	const values = runs.map((run) => (run.result != null ? numberFrom(run.result, key) : null));
	return multiSeriesBar(chartID, labels, [{ name: key, format: 'percent', values }]);
}
