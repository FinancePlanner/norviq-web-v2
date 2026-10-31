// Port of the palette and colour constants in norviq-web internal/charts.
//
// These are the colours a chart is BUILT with. theme.ts re-reads them after
// setOption and swaps each one for the live CSS token of the active appearance
// (theme.css --chart-*), so the hexes here are the dark-scope values and only
// show unpatched (server render, tests). Keep the up/down pair in step with the
// UP_COLORS / DOWN_COLORS sets in theme.ts — that is how a series is recognised.

/** Brand gold: the neutral "value over time" line. Never means profit. */
export const colorTint = '#D8B477';
export const colorMuted = '#7A8597';
export const colorCyan = '#26A69A';
export const colorPurple = '#B0803A';
/** Financial direction. Only for gains and losses — never decoration. */
export const colorUp = '#42B894';
export const colorDown = '#E16D75';
/** @deprecated The old gain green; use colorUp. Kept so theme.ts still recognises stored options. */
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
 * dark (#111B2B, Midnight Navy) chart surfaces, 2026-10-30:
 *
 *   lightness band ✓  chroma floor ✓  contrast ≥3:1 ✓ (both surfaces)
 *   CVD separation   worst adjacent ΔE 8.9 (deutan), target ≥8
 *   normal vision    worst adjacent ΔE 17.8, floor 15
 *
 * No slot sits on the gain-green (100–190°) or loss-red (350–35°) hues, so an
 * allocation slice can never be read as a gain or a loss. Gold leads because it
 * is the brand; it is a deeper gold than the UI accent so it clears 3:1 on white.
 *
 * Re-step with the dataviz skill's validator before touching this:
 *   node scripts/validate_palette.js "<comma-separated>" --mode light --surface "#ffffff"
 *   node scripts/validate_palette.js "<comma-separated>" --mode dark --surface "#111B2B"
 */
export const allocationColors: readonly string[] = [
	'#B07C1E', // gold — brand
	'#AD53B5', // orchid
	'#9D562B', // rust
	'#1689B0', // ocean
	'#7D4DBE', // violet
	'#08A2AF', // teal
	'#565FC1', // indigo
	'#B56A94', // mauve
	'#2E91F2' // sky
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
