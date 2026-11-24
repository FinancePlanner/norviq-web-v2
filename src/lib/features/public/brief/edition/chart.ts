// Chart geometry for the editorial brief, computed on the server so the
// page ships SVG paths, not a charting library. Pure functions: the same
// inputs always draw the same picture.

export const SPARK_W = 100;
export const SPARK_H = 32;

export const CHART_W = 640;
export const CHART_H = 240;
/** Plot insets inside the viewBox: room for axis labels. */
export const PAD = { top: 12, right: 12, bottom: 28, left: 48 };

function fixed(n: number): string {
	return (Math.round(n * 10) / 10).toString();
}

/** An SVG path through points already in viewBox coordinates. */
export function pathOf(points: [number, number][]): string {
	return points.map(([x, y], i) => (i === 0 ? 'M' : 'L') + fixed(x) + ' ' + fixed(y)).join(' ');
}

/**
 * A sparkline of values in a SPARK_W × SPARK_H box, padded 2 units so the
 * stroke is not clipped. The baseline (previous close) is included in the
 * range, so a line under it reads as a loss at a glance.
 */
export function sparkline(
	values: number[],
	baseline?: number
): { path: string; baseline: number | null } | null {
	if (values.length < 2) return null;
	const all = baseline !== undefined ? [...values, baseline] : values;
	const min = Math.min(...all);
	const max = Math.max(...all);
	const span = max - min || 1;
	const inset = 2;
	const y = (v: number) => inset + (1 - (v - min) / span) * (SPARK_H - 2 * inset);
	const step = SPARK_W / (values.length - 1);
	return {
		path: pathOf(values.map((v, i) => [i * step, y(v)])),
		baseline: baseline !== undefined ? Math.round(y(baseline) * 10) / 10 : null
	};
}

/** Round "nice" tick step for a span split into about `count` parts. */
export function niceStep(span: number, count = 4): number {
	if (!(span > 0)) return 1;
	const raw = span / count;
	const mag = Math.pow(10, Math.floor(Math.log10(raw)));
	const norm = raw / mag;
	const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
	return nice * mag;
}

export interface PctSeries {
	symbol: string;
	/** [unix seconds, percent change from previous close]. */
	points: [number, number][];
}

export interface ChartGeometry {
	paths: Map<string, string>;
	yTicks: { y: number; value: number }[];
	xTicks: { x: number; t: number }[];
	zero: number | null;
}

/**
 * Comparative intraday chart: every series as percent from its previous
 * close, on one time axis. xTickTimes are the unix seconds to label.
 */
export function comparativeChart(series: PctSeries[], xTickTimes: number[]): ChartGeometry | null {
	const pts = series.flatMap((s) => s.points);
	if (pts.length < 2) return null;
	const t0 = Math.min(...pts.map((p) => p[0]));
	const t1 = Math.max(...pts.map((p) => p[0]));
	let lo = Math.min(0, ...pts.map((p) => p[1]));
	let hi = Math.max(0, ...pts.map((p) => p[1]));
	const step = niceStep(hi - lo);
	lo = Math.floor(lo / step) * step;
	hi = Math.ceil(hi / step) * step;
	if (hi === lo) hi = lo + step;
	const plotW = CHART_W - PAD.left - PAD.right;
	const plotH = CHART_H - PAD.top - PAD.bottom;
	const x = (t: number) => PAD.left + (t1 === t0 ? 0 : ((t - t0) / (t1 - t0)) * plotW);
	const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;
	const paths = new Map<string, string>();
	for (const s of series) {
		if (s.points.length >= 2) paths.set(s.symbol, pathOf(s.points.map(([t, v]) => [x(t), y(v)])));
	}
	const yTicks: { y: number; value: number }[] = [];
	for (let v = lo; v <= hi + step / 2; v += step) {
		const value = Math.round(v * 1000) / 1000;
		yTicks.push({ y: Math.round(y(value) * 10) / 10, value });
	}
	const xTicks = xTickTimes
		.filter((t) => t >= t0 && t <= t1)
		.map((t) => ({ x: Math.round(x(t) * 10) / 10, t }));
	return { paths, yTicks, xTicks, zero: lo < 0 && hi > 0 ? Math.round(y(0) * 10) / 10 : null };
}

/** Whole hours between t0 and t1 (unix seconds), in steps of `hours`. */
export function hourTicks(t0: number, t1: number, hours = 1): number[] {
	const out: number[] = [];
	const stepS = hours * 3600;
	for (let t = Math.ceil(t0 / stepS) * stepS; t <= t1; t += stepS) out.push(t);
	return out;
}
