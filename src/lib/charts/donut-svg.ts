// Port of norviq-web internal/charts/donut_svg.go: a static, script-free donut
// for pages whose HTML is cached and shared (the public portfolio page), where
// ECharts cannot be used. Rendered by DonutSVG.svelte (so it SSRs); donutSVG()
// returns the exact Go markup as a string.
import { formatFloat } from '../format.js';
import { allocationColor } from './palette.js';

/** One wedge. color is optional; empty falls back to allocationColor by position. */
export interface DonutSlice {
	label: string;
	weight: number;
	color?: string;
}

/** Makes the ring's circumference 100 user units, so a slice's dash length is its percentage. */
export const donutRadius = 15.91549430918954;

export interface DonutCircle {
	color: string;
	/** stroke-dasharray, e.g. "60.000 40.000" */
	dasharray: string;
	/** stroke-dashoffset, e.g. "-60.000" */
	dashoffset: string;
	/** "AAPL 60.0%" (the slice's own weight, as given) */
	title: string;
}

export interface DonutGeometry {
	radius: string;
	ariaLabel: string;
	circles: DonutCircle[];
}

/**
 * The donut's circles. Weights are normalised, so callers can pass
 * percentages that do not sum to exactly 100. null when there is nothing to draw.
 */
export function donutGeometry(slices: readonly DonutSlice[] | null | undefined): DonutGeometry | null {
	const list = slices ?? [];
	let total = 0;
	for (const s of list) if (s.weight > 0) total += s.weight;
	if (total <= 0) return null;

	// Each circle is rotated -90deg so its path starts at 12 o'clock; starting
	// there means no wedge wraps across the path's start (a visible seam).
	const circles: DonutCircle[] = [];
	let offset = 0;
	list.forEach((s, i) => {
		if (s.weight <= 0) return;
		const pct = (s.weight / total) * 100;
		const title = `${s.label} ${formatFloat(s.weight, 1)}%`;
		circles.push({
			color: s.color || allocationColor(i),
			dasharray: `${formatFloat(pct, 3)} ${formatFloat(100 - pct, 3)}`,
			dashoffset: formatFloat(offset, 3),
			title
		});
		offset -= pct;
	});
	return {
		radius: formatFloat(donutRadius, 5),
		ariaLabel: 'Allocation: ' + circles.map((c) => c.title).join(', '),
		circles
	};
}

/** Go's html.EscapeString. */
export function goHTMLEscape(s: string): string {
	return s.replace(/[&'<>"]/g, (c) => ({ '&': '&amp;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '"': '&#34;' })[c]!);
}

/** The exact markup charts.DonutSVG produced, or "" when there is nothing to draw. */
export function donutSVG(slices: readonly DonutSlice[] | null | undefined): string {
	const g = donutGeometry(slices);
	if (!g) return '';
	const circles = g.circles
		.map(
			(c) =>
				`<circle class="donut-slice" cx="21" cy="21" r="${g.radius}" fill="none" stroke="${goHTMLEscape(c.color)}" stroke-width="6" stroke-dasharray="${c.dasharray}" stroke-dashoffset="${c.dashoffset}" transform="rotate(-90 21 21)"><title>${goHTMLEscape(c.title)}</title></circle>`
		)
		.join('');
	return `<svg class="donut-chart" viewBox="0 0 42 42" role="img" aria-label="${goHTMLEscape(g.ariaLabel)}">${circles}</svg>`;
}
