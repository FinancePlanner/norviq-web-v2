import type { EChartsOption } from 'echarts';

/** The parameters ECharts passes to a click handler (the parts the Norviq charts read). */
export interface ChartClickParams {
	data?: unknown;
	name?: string;
	seriesName?: string;
	value?: unknown;
}

/**
 * What a chart builder returns: the option plus the container the Go builder
 * rendered around it (`<div class="container"><div class="item" id style>`).
 * Spread it into the component: `<EChart {...spec} />`.
 *
 * The option may hold formatter functions, so build specs where they are
 * rendered (a .svelte file or $derived), not in a +page.server.ts load —
 * functions do not serialize to the client.
 */
export interface ChartSpec {
	/** DOM id of the chart node. Also decides the chart "kind" for theming (see theme.ts chartKind). */
	id: string;
	width: string;
	height: string;
	/** Extra class on the .item node (bubbles add "crypto-bubbles"). */
	class?: string;
	option: EChartsOption;
	onclick?: (params: ChartClickParams) => void;
}

/** A plain JSON-ish option object, cast to EChartsOption once it is built. */
export type OptionObject = Record<string, unknown>;
