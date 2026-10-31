// Port of norviq-web internal/charts/bubbles.go: the crypto bubbles chart, an
// ECharts force graph with no edges so repulsion alone spreads the coins out.
import type { EChartsOption } from 'echarts';
import { normalizeChartID } from './options.js';
import { capFormatter, heatColorScaled, type HeatmapColorMode } from './treemap.js';
import type { ChartClickParams, ChartSpec } from './types.js';

export interface BubbleNode {
	symbol: string;
	name?: string;
	marketCap: number;
	changePct: number;
	/** Opens on click; empty disables the link. */
	href?: string;
}

/** "marketCap" sizes by cap; "change" by the size of the move, either direction (cryptobubbles.net look). */
export type BubbleSizeBy = 'marketCap' | 'change';

export interface BubbleOptions {
	/** Default 5. */
	scaleMaxPct?: number;
	periodLabel?: string;
	colorMode?: HeatmapColorMode;
	sizeBy?: BubbleSizeBy;
	/** Height in pixels. Default 620. */
	height?: number;
}

export const bubbleMinSize = 18;
export const bubbleMaxSize = 110;

/**
 * Maps weights to diameters so area tracks the weight (square root), clamped
 * so the largest coin cannot swallow the canvas and the smallest stays tappable.
 */
export function bubbleSizes(weights: readonly number[]): number[] {
	const maxWeight = Math.max(0, ...weights);
	return weights.map((w) =>
		maxWeight <= 0 || w <= 0
			? bubbleMinSize
			: Math.max(bubbleMinSize, bubbleMaxSize * Math.sqrt(w / maxWeight))
	);
}

interface BubbleData {
	name: string;
	fullName?: string;
	changePct: number;
	marketCap?: number;
	symbolSize: number;
	href?: string;
}

export function bubbleTooltip(periodLabel: string) {
	const label = ' ' + periodLabel + ' · $';
	return (info: { data?: BubbleData }): string => {
		const d = info.data || ({} as BubbleData);
		const cap = capFormatter(d.marketCap || 0);
		const pct = (d.changePct >= 0 ? '+' : '') + d.changePct.toFixed(2) + '%';
		return '<b>' + d.name + '</b> · ' + (d.fullName || '') + '<br/>' + pct + label + cap + ' cap';
	};
}

/** Small bubbles show the ticker only; the percentage needs room. */
export function bubbleLabel(info: { data?: BubbleData }): string {
	const d = info.data || ({} as BubbleData);
	if (d.symbolSize < 34) return d.name;
	return d.name + '\n' + (d.changePct >= 0 ? '+' : '') + d.changePct.toFixed(1) + '%';
}

/** Same as Go: a click on a bubble with an href is a full navigation. */
export function openBubbleHref(params: ChartClickParams): void {
	const data = params.data as BubbleData | undefined;
	if (data && data.href) window.location.href = data.href;
}

export function cryptoBubbles(
	chartID: string,
	nodes: readonly BubbleNode[],
	opts: BubbleOptions = {}
): ChartSpec | null {
	if (nodes.length === 0) return null;
	const id = normalizeChartID(chartID);
	const scaleMaxPct = opts.scaleMaxPct && opts.scaleMaxPct > 0 ? opts.scaleMaxPct : 5;
	const colorMode = opts.colorMode || 'change';
	const sizeBy = opts.sizeBy || 'marketCap';
	const height = opts.height && opts.height > 0 ? opts.height : 620;

	const sizes = bubbleSizes(
		nodes.map((n) => (sizeBy === 'change' ? Math.abs(n.changePct) : n.marketCap))
	);
	const data = nodes.map((node, i) => {
		const item: Record<string, unknown> = {
			name: node.symbol,
			value: sizes[i],
			symbolSize: sizes[i],
			fullName: node.name ?? '',
			changePct: node.changePct,
			marketCap: node.marketCap
		};
		if (node.href) item.href = node.href;
		item.itemStyle = {
			color: heatColorScaled(node.changePct, scaleMaxPct, colorMode),
			borderColor: 'rgba(255,255,255,0.18)',
			borderWidth: 1
		};
		return item;
	});

	const option = {
		tooltip: {
			formatter: bubbleTooltip(opts.periodLabel ?? ''),
			backgroundColor: 'rgba(20,20,22,0.92)',
			borderWidth: 0,
			textStyle: { color: '#f4f5f8' }
		},
		series: [
			{
				type: 'graph',
				layout: 'force',
				roam: false,
				draggable: true,
				force: {
					// Mapped across node values, so big bubbles push harder.
					repulsion: [bubbleMinSize * 4, bubbleMaxSize * 4],
					gravity: 0.12,
					friction: 0.6,
					edgeLength: 0,
					layoutAnimation: true
				},
				label: {
					show: true,
					formatter: bubbleLabel,
					color: '#ffffff',
					fontWeight: 'bold',
					fontSize: 11
				},
				emphasis: { scale: 1.08 },
				data
			}
		]
	};
	return {
		id,
		width: '100%',
		height: `${height}px`,
		class: 'crypto-bubbles',
		option: option as unknown as EChartsOption,
		onclick: openBubbleHref
	};
}
