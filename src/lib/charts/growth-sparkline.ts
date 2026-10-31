// Port of norviq-web internal/charts/growth_sparkline.go: a compact area+line
// sparkline for YoY growth rates. Rendered by GrowthSparkline.svelte (SSR);
// growthSparklineSVG() returns the exact Go markup as a string.
import { formatFloat } from '../format.js';
import { colorTint } from './palette.js';

export interface GrowthSparklinePoint {
	label: string;
	value: number;
}

export interface GrowthSparklineGeometry {
	viewBox: string;
	stroke: string;
	/** Same fixed id for every sparkline of a tone, as in Go. */
	fillID: string;
	zeroLine: { x1: string; y1: string; x2: string; y2: string } | null;
	areaPath: string;
	points: string;
}

const width = 220;
const height = 52;
const padX = 2;
const padY = 6;

const f2 = (v: number) => formatFloat(v, 2);

/** null when there are fewer than two points. tone "negative" is red; anything else is the brand tint. */
export function growthSparklineGeometry(
	points: readonly GrowthSparklinePoint[],
	tone: string
): GrowthSparklineGeometry | null {
	if (points.length < 2) return null;
	const values = points.map((p) => p.value);
	let minV = values[0];
	let maxV = values[0];
	for (const v of values.slice(1)) {
		minV = Math.min(minV, v);
		maxV = Math.max(maxV, v);
	}
	if (minV === maxV) {
		minV -= 1;
		maxV += 1;
	}
	const rangeV = maxV - minV;
	const xStep = (width - padX * 2) / (values.length - 1);
	const plotH = height - padY * 2;
	const coords = values.map(
		(v, i) => `${f2(padX + i * xStep)},${f2(padY + ((maxV - v) / rangeV) * plotH)}`
	);
	const linePath = 'M ' + coords.join(' L ');
	const areaPath = `${linePath} L ${f2(padX + (values.length - 1) * xStep)},${f2(height - padY)} L ${f2(padX)},${f2(height - padY)} Z`;
	const stroke = tone === 'negative' ? '#f85149' : colorTint;
	const zeroY = padY + ((maxV - 0) / rangeV) * plotH;
	return {
		viewBox: `0 0 ${formatFloat(width, 0)} ${formatFloat(height, 0)}`,
		stroke,
		fillID: tone === 'negative' ? 'fin-growth-fill-negative' : 'fin-growth-fill-positive',
		zeroLine:
			minV < 0 && maxV > 0
				? { x1: f2(padX), y1: f2(zeroY), x2: f2(width - padX), y2: f2(zeroY) }
				: null,
		areaPath,
		points: coords.join(' ')
	};
}

/** The exact markup charts.GrowthSparklineSVG produced, or "". */
export function growthSparklineSVG(points: readonly GrowthSparklinePoint[], tone: string): string {
	const g = growthSparklineGeometry(points, tone);
	if (!g) return '';
	let out = `<svg class="fin-growth-sparkline-svg" viewBox="${g.viewBox}" role="img" aria-hidden="true">`;
	out += `<defs><linearGradient id="${g.fillID}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${g.stroke}" stop-opacity="0.35"/><stop offset="100%" stop-color="${g.stroke}" stop-opacity="0"/></linearGradient></defs>`;
	if (g.zeroLine)
		out += `<line class="fin-growth-sparkline-zero" x1="${g.zeroLine.x1}" y1="${g.zeroLine.y1}" x2="${g.zeroLine.x2}" y2="${g.zeroLine.y2}"/>`;
	out += `<path class="fin-growth-sparkline-area" fill="url(#${g.fillID})" d="${g.areaPath}"/>`;
	out += `<polyline class="fin-growth-sparkline-line" fill="none" stroke="${g.stroke}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" points="${g.points}"/>`;
	return out + '</svg>';
}
