// Port of the palette and colour constants in norviq-web internal/charts.

export const colorTint = '#C97A2B';
export const colorMuted = '#8D8371';
export const colorCyan = '#26A69A';
export const colorPurple = '#B0803A';
export const colorGreen = '#089981';

/**
 * The categorical series palette: sector allocation, pie legend swatches, and
 * anything that colors by identity rather than magnitude.
 *
 * Order is load-bearing. allocationColor indexes into this list, so a slot
 * change repaints every existing chart, and adjacent slots are the pairs a
 * reader compares, which is what the CVD separation is measured on.
 *
 * Validated against all six dataviz checks on both the light (#ffffff) and
 * dark (#18181b) chart surfaces:
 *
 *   lightness band ✓  chroma floor ✓  contrast ≥3:1 ✓
 *   CVD separation   worst adjacent ΔE 10.2 (deutan), target ≥8
 *   normal vision    worst adjacent ΔE 23.6, floor 15
 *
 * Re-step with the dataviz skill's validator before touching this:
 *   node scripts/validate_palette.js "<comma-separated>" --mode light --surface "#ffffff"
 */
export const allocationColors: readonly string[] = [
	'#C97A2B', // amber — brand tint
	'#2563EB', // blue
	'#DB2777', // pink
	'#65A30D', // olive
	'#7C3AED', // purple
	'#0891B2', // cyan
	'#E11D48', // rose
	'#0D9488', // teal
	'#B45309' // bronze
];

/**
 * The multi-series comparison palette: the same list, so a sector keeps its
 * color whether it is a pie slice or one line in a comparison chart.
 */
export const multiSeriesColors: readonly string[] = [...allocationColors];

/** go-echarts' default palette (ECharts 5 colors), used where Go set no colors. */
export const goEchartsDefaultColors: readonly string[] = [
	'#5470c6',
	'#91cc75',
	'#fac858',
	'#ee6666',
	'#73c0de',
	'#3ba272',
	'#fc8452',
	'#9a60b4',
	'#ea7ccc'
];

/** A stable color for a sector index. Wraps; a negative index (a caller bug) gets the first slot. */
export function allocationColor(index: number): string {
	if (index < 0) return allocationColors[0];
	return allocationColors[index % allocationColors.length];
}
