// Port of norviq-web internal/charts/treemap.go: the Finviz-style markets
// heat-map (stocks and crypto), plus the shared red→neutral→green ramp.
import type { EChartsOption } from 'echarts';
import { normalizeChartID } from './options.js';
import type { ChartSpec } from './types.js';

/** One stock tile. */
export interface HeatmapTile {
	symbol: string;
	name?: string;
	sector: string;
	marketCap: number;
	changePct: number;
}

/** "change": diverging around zero. "athDistance": red at -scaleMaxPct (deep below the high) to green at 0. */
export type HeatmapColorMode = 'change' | 'athDistance';

export interface HeatmapOptions {
	/** Where the color ramp saturates. Default 3. */
	scaleMaxPct?: number;
	/** Names the window in the tooltip ("today", "1W", "YTD"). Default "today". */
	periodLabel?: string;
	colorMode?: HeatmapColorMode;
	/** Height in pixels. Default 540. */
	height?: number;
}

/** Go's math.Round (half away from zero). */
function round(v: number): number {
	return v < 0 ? -Math.round(-v) : Math.round(v);
}

/**
 * Maps a % value to the Finviz red→neutral→green ramp, saturating at
 * ±scaleMax (change) or across -scaleMax…0 (ATH distance).
 */
export function heatColorScaled(
	pct: number,
	scaleMax: number,
	mode: HeatmapColorMode | string
): string {
	if (scaleMax <= 0) scaleMax = 3;
	let t: number;
	if (mode === 'athDistance') t = 1 + (2 * Math.max(-scaleMax, Math.min(0, pct))) / scaleMax;
	else t = Math.max(-scaleMax, Math.min(scaleMax, pct)) / scaleMax;
	const neutral = [0x41, 0x44, 0x54];
	let target = [0x08, 0x99, 0x81];
	if (t < 0) {
		target = [0xf2, 0x36, 0x45];
		t = -t;
	}
	const hex = (a: number, b: number) =>
		round(a + (b - a) * t)
			.toString(16)
			.padStart(2, '0');
	return '#' + hex(neutral[0], target[0]) + hex(neutral[1], target[1]) + hex(neutral[2], target[2]);
}

/** Formats a market cap as T / B / M; crypto tiles go well below a billion. */
export function capFormatter(v: number): string {
	if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T';
	if (v >= 1e9) return (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + 'B';
	return (v / 1e6).toFixed(0) + 'M';
}

interface TileData {
	symbol?: string;
	fullName?: string;
	value?: number;
	changePct: number;
}

function sign(pct: number): string {
	return pct >= 0 ? '+' : '';
}

export function treemapTooltip(periodLabel: string) {
	const label = ' ' + periodLabel + ' · $';
	return (info: { data?: TileData; name?: string }): string => {
		const d = info.data || ({} as TileData);
		if (!d.symbol) return info.name ?? '';
		const cap = capFormatter(d.value as number);
		const pct = sign(d.changePct) + d.changePct.toFixed(2) + '%';
		return '<b>' + d.symbol + '</b> · ' + (d.fullName || '') + '<br/>' + pct + label + cap + ' cap';
	};
}

export function treemapLabel(info: { data?: TileData; name?: string }): string {
	const d = info.data || ({} as TileData);
	if (!d.symbol) return info.name ?? '';
	return d.symbol + '\n' + sign(d.changePct) + d.changePct.toFixed(1) + '%';
}

/** The stock markets heat-map: daily change, saturating at ±3%. */
export function marketHeatmap(chartID: string, tiles: readonly HeatmapTile[]): ChartSpec | null {
	return marketHeatmapWithOptions(chartID, tiles, { scaleMaxPct: 3, periodLabel: 'today' });
}

/** A sector / market-cap treemap, one node per sector in first-seen order. */
export function marketHeatmapWithOptions(
	chartID: string,
	tiles: readonly HeatmapTile[],
	opts: HeatmapOptions = {}
): ChartSpec | null {
	if (tiles.length === 0) return null;
	const id = normalizeChartID(chartID);
	const scaleMaxPct = opts.scaleMaxPct && opts.scaleMaxPct > 0 ? opts.scaleMaxPct : 3;
	const periodLabel = opts.periodLabel || 'today';
	const colorMode = opts.colorMode || 'change';
	const height = opts.height && opts.height > 0 ? opts.height : 540;

	// Field order and omitempty follow the Go struct tags: a zero value, an
	// empty symbol or name is left out; changePct is always present.
	const bySector = new Map<string, Record<string, unknown>[]>();
	for (const tile of tiles) {
		const node: Record<string, unknown> = { name: tile.symbol };
		if (tile.marketCap !== 0) node.value = tile.marketCap;
		if (tile.symbol) node.symbol = tile.symbol;
		if (tile.name) node.fullName = tile.name;
		node.changePct = tile.changePct;
		node.itemStyle = { color: heatColorScaled(tile.changePct, scaleMaxPct, colorMode) };
		const list = bySector.get(tile.sector);
		if (list) list.push(node);
		else bySector.set(tile.sector, [node]);
	}
	const roots = [...bySector].map(([sector, children]) => ({
		name: sector,
		changePct: 0,
		children
	}));

	const option = {
		tooltip: {
			formatter: treemapTooltip(periodLabel),
			backgroundColor: 'rgba(20,20,22,0.92)',
			borderWidth: 0,
			textStyle: { color: '#f4f5f8' }
		},
		series: [
			{
				type: 'treemap',
				roam: false,
				nodeClick: 'zoomToNode',
				width: '100%',
				height: '100%',
				breadcrumb: { show: true, top: 0 },
				label: {
					show: true,
					formatter: treemapLabel,
					fontSize: 12,
					fontWeight: 'bold',
					color: '#ffffff'
				},
				upperLabel: { show: true, height: 22, formatter: '{b}', color: '#ffffff', fontSize: 11 },
				itemStyle: { borderColor: 'rgba(0,0,0,0.35)', borderWidth: 1, gapWidth: 1 },
				levels: [
					{ itemStyle: { borderWidth: 0, gapWidth: 2 } },
					{ itemStyle: { gapWidth: 1, borderColor: 'rgba(0,0,0,0.4)' }, upperLabel: { show: true } }
				],
				data: roots
			}
		]
	};
	return { id, width: '100%', height: `${height}px`, option: option as unknown as EChartsOption };
}
