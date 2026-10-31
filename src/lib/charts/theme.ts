// Port of norviq-web internal/server/assets/echarts-theme.js plus the
// per-chart part of dashboard-charts.js refreshCharts().
//
// The Go web registers no ECharts theme: go-echarts inits with "white" (not a
// registered theme, so ECharts defaults) and the raw charts with null. The
// "Norviq theme" is this post-init patch: after setOption, the chart's
// normalized option is re-read and its tooltip, axes and series are recoloured
// from the CSS variables of the active appearance (theme.css --chart-*). It
// runs again whenever html.dark flips. EChart.svelte drives it; everything
// here is pure apart from the default DOM environment, so it is unit tested.

/** Where the theme reads appearance from. domThemeEnv() is the browser one. */
export interface ThemeEnv {
	dark: boolean;
	/** getComputedStyle(documentElement) custom property, or fallback when unset. */
	cssVar(name: string, fallback: string): string;
	reducedMotion: boolean;
	coarsePointer: boolean;
}

export function domThemeEnv(): ThemeEnv {
	const root = document.documentElement;
	const style = getComputedStyle(root);
	const media = (q: string) =>
		typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
	return {
		dark: root.classList.contains('dark'),
		cssVar: (name, fallback) => style.getPropertyValue(name).trim() || fallback,
		reducedMotion: media('(prefers-reduced-motion: reduce)'),
		coarsePointer: media('(pointer: coarse)')
	};
}

export interface ChartPalette {
	axis: string;
	grid: string;
	line: string;
	lineAlt: string;
	down: string;
	tooltipBg: string;
	tooltipBorder: string;
	tooltipText: string;
	areaOpacity: number;
	pointer: string;
	emphasisBorder: string;
}

/** Fiscal.ai (light) / TradingView (dark) palettes, overridable through theme.css. */
export function getChartPalette(env: ThemeEnv): ChartPalette {
	const v = env.cssVar;
	if (env.dark) {
		return {
			axis: v('--chart-axis', '#787b86'),
			grid: v('--chart-grid', '#2a2e39'),
			line: v('--chart-line', '#2962ff'),
			lineAlt: v('--chart-line-alt', '#26a69a'),
			down: v('--chart-down', '#f23645'),
			tooltipBg: v('--chart-tooltip-bg', '#1e222d'),
			tooltipBorder: v('--chart-tooltip-border', '#363a45'),
			tooltipText: v('--chart-tooltip-text', '#d1d4dc'),
			areaOpacity: Number(v('--chart-area-opacity', '0.22')),
			pointer: v('--chart-pointer', '#787b86'),
			emphasisBorder: v('--chart-emphasis-border', '#d1d4dc')
		};
	}
	return {
		axis: v('--chart-axis', '#64748b'),
		grid: v('--chart-grid', '#e2e8f0'),
		line: v('--chart-line', '#2563eb'),
		lineAlt: v('--chart-line-alt', '#0d9488'),
		down: v('--chart-down', '#dc2626'),
		tooltipBg: v('--chart-tooltip-bg', '#ffffff'),
		tooltipBorder: v('--chart-tooltip-border', '#e2e8f0'),
		tooltipText: v('--chart-tooltip-text', '#0f172a'),
		areaOpacity: Number(v('--chart-area-opacity', '0.14')),
		pointer: v('--chart-pointer', '#94a3b8'),
		emphasisBorder: v('--chart-emphasis-border', '#ffffff')
	};
}

const DOWN_COLORS = new Set(['#f85149', '#ff3b30', '#f23645', '#dc2626', '#ef5350']);
const ALT_LINE_COLORS = new Set(['#26a69a', '#59d1cc', '#0d9488', '#32ade6', '#089981']);

export function isDownColor(color: unknown): boolean {
	return typeof color === 'string' && DOWN_COLORS.has(color.toLowerCase());
}

export function isAltLineColor(color: unknown): boolean {
	return typeof color === 'string' && ALT_LINE_COLORS.has(color.toLowerCase());
}

/** Parse #rgb/#rrggbb into [r,g,b]; null for anything else (a token may resolve to oklch). */
export function parseHex(hex: unknown): [number, number, number] | null {
	const raw = String(hex || '').trim();
	const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(raw);
	if (short)
		return [short[1], short[2], short[3]].map((c) => parseInt(c + c, 16)) as [
			number,
			number,
			number
		];
	const full = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(raw);
	if (!full) return null;
	return [full[1], full[2], full[3]].map((c) => parseInt(c, 16)) as [number, number, number];
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {});
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [v]);

/**
 * Spend pillars carry semantic tokens (chosen server-side), resolved against
 * the live appearance. The name fallback covers series without colorVar.
 */
export function pillarColor(series: unknown, env: ThemeEnv): string {
	const item = series && typeof series === 'object' ? (series as Obj) : { name: series };
	if (item.colorVar)
		return env.cssVar(String(item.colorVar), env.cssVar('--muted-foreground', '#8D8371'));
	switch (String(item.name || '').toLowerCase()) {
		case 'fundamentals':
			return env.cssVar('--color-pillar-fundamentals', '#0f766e');
		case 'future you':
		case 'futureyou':
			return env.cssVar('--color-pillar-future-you', '#5856d6');
		case 'fun':
			return env.cssVar('--color-pillar-fun', '#0d9488');
		default:
			return env.cssVar('--muted-foreground', '#8D8371');
	}
}

/** Density ramp for the activity calendar: one hue (live --color-tint), stepped by alpha. */
export function activityRamp(env: ThemeEnv): string[] {
	const rgb = parseHex(env.cssVar('--color-tint', '#0f766e'));
	if (!rgb) return ['rgba(15,118,110,0.15)', 'rgba(15,118,110,1)'];
	const [r, g, b] = rgb;
	return [0.14, 0.38, 0.68, 1].map((a) => `rgba(${r},${g},${b},${a})`);
}

/** The visualMap with the theme's density ramp; undefined when the chart has none. */
export function patchVisualMap(current: Obj, env: ThemeEnv): Obj[] | undefined {
	const visualMap = current?.visualMap;
	if (!visualMap) return undefined;
	const items = list(visualMap);
	if (items.length === 0) return undefined;
	const palette = getChartPalette(env);
	return items.map((raw) => {
		const item = obj(raw);
		return {
			...item,
			textStyle: { ...obj(item.textStyle), color: palette.axis },
			inRange: { ...obj(item.inRange), color: activityRamp(env) }
		};
	});
}

/** Calendar day/month labels on the axis ink; the 2px cell gap in the surface color. */
export function patchCalendar(
	current: Obj,
	palette: ChartPalette,
	env: ThemeEnv
): Obj[] | undefined {
	const calendar = current?.calendar;
	if (!calendar) return undefined;
	const items = list(calendar);
	if (items.length === 0) return undefined;
	return items.map((raw) => {
		const item = obj(raw);
		return {
			...item,
			dayLabel: { ...obj(item.dayLabel), color: palette.axis },
			monthLabel: { ...obj(item.monthLabel), color: palette.axis },
			itemStyle: {
				...obj(item.itemStyle),
				borderColor: env.cssVar('--color-card-bg', '#ffffff'),
				borderWidth: 2
			}
		};
	});
}

export type ChartKind =
	'spark' | 'density' | 'pillars' | 'allocation' | 'spending' | 'wealth' | 'other';

/** Classifies a chart by its DOM id and first series, exactly as echarts-theme.js did. */
export function chartKind(chartID: string, series: unknown): ChartKind {
	const id = (chartID || '').toLowerCase();
	if (id.startsWith('spark-') || id.includes('spark')) return 'spark';
	const first = obj(Array.isArray(series) ? series[0] : series);
	if (first.type === 'heatmap') return 'density';
	if (first.type === 'bar' && first.stack === 'spend') return 'pillars';
	if (first.type === 'pie') return 'allocation';
	if (id.includes('spending') || id.includes('expenses-year')) return 'spending';
	if (
		id.includes('allocation') ||
		id.includes('donut') ||
		id.includes('sector') ||
		id.includes('cost-allocation')
	)
		return 'allocation';
	if (first.type === 'line') return 'wealth';
	return 'other';
}

export function resolveLineColor(
	existingColor: unknown,
	palette: ChartPalette,
	chartID: string,
	kind: ChartKind
): string {
	if (kind === 'spending' || chartID.includes('spending') || chartID.includes('expenses-year'))
		return palette.lineAlt;
	if (isDownColor(existingColor)) return palette.down;
	if (isAltLineColor(existingColor)) return palette.lineAlt;
	return palette.line;
}

export function patchAxisList(axes: unknown, palette: ChartPalette): unknown {
	if (!axes) return axes;
	return list(axes).map((raw) => {
		const axis = obj(raw);
		const splitLine = axis.splitLine ? obj(axis.splitLine) : undefined;
		return {
			...axis,
			axisLabel: { ...obj(axis.axisLabel), color: palette.axis },
			axisPointer: axis.axisPointer
				? { ...obj(axis.axisPointer), snap: true }
				: { show: true, snap: true },
			splitLine: splitLine
				? {
						...splitLine,
						lineStyle: {
							...obj(splitLine.lineStyle),
							color: palette.grid,
							type: obj(splitLine.lineStyle).type || 'dashed'
						}
					}
				: axis.splitLine
		};
	});
}

export function patchSeriesList(
	series: unknown,
	palette: ChartPalette,
	chartID: string,
	kind: ChartKind,
	env: ThemeEnv
): unknown {
	if (!series) return series;
	return list(series).map((raw) => {
		const item = obj(raw);
		const next: Obj = { ...item };

		if (item.type === 'line') {
			const lineColor = resolveLineColor(obj(item.lineStyle).color, palette, chartID, kind);
			next.lineStyle = { ...obj(item.lineStyle), color: lineColor };
			if (item.areaStyle)
				next.areaStyle = { ...obj(item.areaStyle), color: lineColor, opacity: palette.areaOpacity };
			if (kind === 'wealth' || kind === 'spending') {
				const emphasis = obj(item.emphasis);
				next.emphasis = {
					...emphasis,
					focus: 'series',
					scale: true,
					itemStyle: {
						...obj(emphasis.itemStyle),
						borderColor: palette.emphasisBorder,
						borderWidth: 2
					}
				};
				next.showSymbol = false;
			}
		}

		if (item.type === 'bar' && item.stack === 'spend') {
			next.itemStyle = {
				...obj(item.itemStyle),
				color: pillarColor(item, env),
				// The 2px separator in the surface color keeps stacked segments distinct.
				borderColor: env.cssVar('--color-card-bg', '#ffffff'),
				borderWidth: 2
			};
			next.emphasis = { ...obj(item.emphasis), focus: 'series' };
		}

		if (item.type === 'heatmap') {
			next.itemStyle = {
				...obj(item.itemStyle),
				borderColor: env.cssVar('--color-card-bg', '#ffffff'),
				borderWidth: 2
			};
		}

		if (item.type === 'pie') {
			const emphasis = obj(item.emphasis);
			next.emphasis = {
				...emphasis,
				focus: 'self',
				scale: true,
				itemStyle: {
					...obj(emphasis.itemStyle),
					shadowBlur: 10,
					shadowColor: env.dark ? 'rgba(0,0,0,0.45)' : 'rgba(15,23,42,0.12)'
				}
			};
		}
		return next;
	});
}

export type TooltipFormatter = (params: unknown) => string;

export function buildTooltipOption(
	current: Obj,
	palette: ChartPalette,
	triggerOn: string,
	env: ThemeEnv,
	formatter?: TooltipFormatter
): Obj {
	const base = obj(Array.isArray(current.tooltip) ? current.tooltip[0] : current.tooltip);
	const pointer = obj(base.axisPointer);
	const tooltip: Obj = {
		...base,
		backgroundColor: palette.tooltipBg,
		borderColor: palette.tooltipBorder,
		confine: true,
		triggerOn,
		// ECharts' 0.4s default makes the tooltip float behind the pointer.
		transitionDuration: env.reducedMotion ? 0 : 0.12,
		padding: [8, 12],
		extraCssText:
			'border-radius: 10px; box-shadow: var(--panel-shadow-md); font-variant-numeric: tabular-nums;',
		textStyle: { ...obj(base.textStyle), color: palette.tooltipText },
		axisPointer: {
			...pointer,
			type: pointer.type || 'line',
			snap: true,
			lineStyle: { ...obj(pointer.lineStyle), color: palette.pointer, width: 1 }
		}
	};
	if (formatter) tooltip.formatter = formatter;
	return tooltip;
}

function formatUSD(value: unknown): string {
	const n = Number(value);
	if (!Number.isFinite(n)) return String(value ?? '');
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(n);
}

/** Tooltip for wealth/spending lines: "<date><br/><strong>$12,345</strong>". */
export function wealthTooltipFormatter(params: unknown): string {
	const items = Array.isArray(params) ? params : [params];
	const first = items[0] as Obj | undefined;
	if (!first) return '';
	const date = first.axisValueLabel ?? first.name ?? '';
	const data = first.data as Obj | number | undefined;
	const value = (data && typeof data === 'object' ? data.value : undefined) ?? first.value ?? data;
	return `${date}<br/><strong>${formatUSD(value)}</strong>`;
}

/**
 * What dashboard-charts.js refreshCharts() setOption'd onto one chart:
 * `current` is chart.getOption(), chartID the node id.
 */
export function themedOptionPatch(current: Obj, chartID: string, env: ThemeEnv): Obj {
	const palette = getChartPalette(env);
	const triggerOn = env.coarsePointer ? 'click' : 'mousemove|click';
	const kind = chartKind(chartID, current.series);
	const formatter = kind === 'wealth' || kind === 'spending' ? wealthTooltipFormatter : undefined;
	// Calendar charts have no cartesian axes and the pillar bar hides both.
	const skipAxes = kind === 'spark' || kind === 'density' || kind === 'pillars';
	const next: Obj = {
		backgroundColor: 'transparent',
		tooltip: buildTooltipOption(current, palette, triggerOn, env, formatter),
		xAxis: skipAxes ? current.xAxis : patchAxisList(current.xAxis, palette),
		yAxis: skipAxes ? current.yAxis : patchAxisList(current.yAxis, palette),
		animationDuration: env.reducedMotion ? 0 : 420,
		animationEasing: 'cubicOut',
		series: patchSeriesList(current.series, palette, chartID, kind, env)
	};
	// Only send these when the chart has them: an explicit undefined drops the component.
	const visualMap = patchVisualMap(current, env);
	if (visualMap) next.visualMap = visualMap;
	const calendar = patchCalendar(current, palette, env);
	if (calendar) next.calendar = calendar;
	return next;
}

/** Wrappers that fade the chart in on first render and on theme change (dashboard-charts.js). */
export const FADE_WRAPPERS =
	'.overview-wealth-chart, .stock-chart-wrap, .overview-allocation-chart, .overview-watchlist-spark';
