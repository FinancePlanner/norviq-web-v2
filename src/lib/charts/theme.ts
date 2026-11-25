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

import { compactMoney, money, percentPoints, type AppLocale } from '../money.js';
import { ACCENT_ACTION, DARK, FLAT, LIGHT, PILLAR } from './palette.generated.js';

/** Where the theme reads appearance from. domThemeEnv() is the browser one. */
export interface ThemeEnv {
	dark: boolean;
	/** getComputedStyle(documentElement) custom property, or fallback when unset. */
	cssVar: (name: string, fallback: string) => string;
	reducedMotion: boolean;
	coarsePointer: boolean;
	/** ISO 4217 code of a money series (wealth, spending); absent means unknown, never USD. */
	currency?: string | null;
	/** App locale for money in tooltips and axes. Defaults to 'en'. */
	locale?: AppLocale;
	/**
	 * How a single value line is coloured: 'direction' (gain or loss over the
	 * range) only for a portfolio or net-worth value; anything else is ink
	 * (spec § 5.5 rule 5, DESIGN.md: green and red mean P/L direction only).
	 */
	trend?: 'direction' | 'neutral';
	/** How the tooltip and y axis print a value: money (default) or percent points. */
	valueFormat?: 'money' | 'percent';
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
	up: string;
	down: string;
	tooltipBg: string;
	tooltipBorder: string;
	tooltipText: string;
	areaOpacity: number;
	pointer: string;
	emphasisBorder: string;
}

/**
 * Precision palettes, overridable through theme.css. The fallbacks are the
 * tokens (design/tokens.json via palette.generated.ts), so an unstyled
 * environment still renders on-brand; they only apply when the CSS variable is
 * missing.
 */
export function getChartPalette(env: ThemeEnv): ChartPalette {
	const v = env.cssVar;
	const f = env.dark ? DARK : LIGHT;
	return {
		axis: v('--chart-axis', f.axis),
		grid: v('--chart-grid', f.grid),
		line: v('--chart-line', f.line),
		lineAlt: v('--chart-line-alt', f.lineAlt),
		up: v('--chart-up', f.up),
		down: v('--chart-down', f.down),
		tooltipBg: v('--chart-tooltip-bg', f.tooltipBg),
		tooltipBorder: v('--chart-tooltip-border', f.tooltipBorder),
		tooltipText: v('--chart-tooltip-text', f.tooltipText),
		areaOpacity: Number(v('--chart-area-opacity', env.dark ? '0.18' : '0.16')),
		pointer: v('--chart-pointer', f.pointer),
		emphasisBorder: v('--chart-emphasis-border', f.emphasisBorder)
	};
}

// A builder marks direction by colouring a series with one of these; the patch
// swaps it for the live --chart-up / --chart-down. The first entry of each is
// palette.ts colorUp / colorDown; the rest are older literals still produced
// by some builders and stored options.
const UP_COLORS = new Set(['#42b894', '#22c55e']);
const DOWN_COLORS = new Set([
	'#e16d75',
	'#f85149',
	'#ff3b30',
	'#f23645',
	'#dc2626',
	'#ef5350',
	'#ef4444'
]);
const ALT_LINE_COLORS = new Set(['#26a69a', '#59d1cc', '#0d9488', '#32ade6', '#089981']);

export function isUpColor(color: unknown): boolean {
	return typeof color === 'string' && UP_COLORS.has(color.toLowerCase());
}

export function isDownColor(color: unknown): boolean {
	return typeof color === 'string' && DOWN_COLORS.has(color.toLowerCase());
}

export function isAltLineColor(color: unknown): boolean {
	return typeof color === 'string' && ALT_LINE_COLORS.has(color.toLowerCase());
}

/** Parse #rgb/#rrggbb into [r,g,b]; null for anything else (a token may resolve to oklch). */
export function parseHex(hex: unknown): [number, number, number] | null {
	const raw = typeof hex === 'string' ? hex.trim() : '';
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
	const scope = env.dark ? 'dark' : 'light';
	const muted = FLAT[scope];
	if (item.colorVar)
		return env.cssVar(typeof item.colorVar === 'string' ? item.colorVar : '', muted);
	switch ((typeof item.name === 'string' ? item.name : '').toLowerCase()) {
		case 'fundamentals':
			return env.cssVar('--color-pillar-fundamentals', PILLAR[scope].fundamentals);
		case 'future you':
		case 'futureyou':
			return env.cssVar('--color-pillar-future-you', PILLAR[scope].futureYou);
		case 'fun':
			return env.cssVar('--color-pillar-fun', PILLAR[scope].fun);
		default:
			return env.cssVar('--muted-foreground', muted);
	}
}

/** Density ramp for the activity calendar: one hue (live --color-tint), stepped by alpha. */
export function activityRamp(env: ThemeEnv): string[] {
	// --color-tint is OKLCH in theme.css, which parseHex cannot read, so in the
	// browser this almost always falls through to color.accent.action
	// (tokens.json: champagne dark, deep gold light).
	const rgb = parseHex(env.cssVar('--color-tint', '')) ??
		parseHex(env.dark ? ACCENT_ACTION.dark : ACCENT_ACTION.light) ?? [0, 0, 0];
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
	// Spending has no good or bad direction: ink, never gold (spec § 5.5 rule 5).
	if (kind === 'spending' || chartID.includes('spending') || chartID.includes('expenses-year'))
		return palette.line;
	if (isDownColor(existingColor)) return palette.down;
	if (isUpColor(existingColor)) return palette.up;
	if (isAltLineColor(existingColor)) return palette.lineAlt;
	return palette.line;
}

const pointValue = (d: unknown): number => Number(d && typeof d === 'object' ? obj(d).value : d);

/**
 * Spec § 5.5 rule 5: a value line is gain-coloured when its last point is at or
 * above its first, loss-coloured otherwise, and ink when it has no direction to
 * show (under two points, or a non-directional series). Never gold.
 */
export function directionColor(data: unknown, palette: ChartPalette, env: ThemeEnv): string {
	// Opt-in: only a series marked directional (a portfolio or net-worth value)
	// may be green or red; a price, a projection or a rate stays ink.
	if (env.trend !== 'direction' || !Array.isArray(data)) return palette.line;
	const values = data.map(pointValue).filter((n) => Number.isFinite(n));
	if (values.length < 2) return palette.line;
	return values[values.length - 1] >= values[0] ? palette.up : palette.down;
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
	const singleLine = list(series).filter((s) => obj(s).type === 'line').length === 1;
	return list(series).map((raw) => {
		const item = obj(raw);
		const next: Obj = { ...item };

		if (item.type === 'line') {
			const existing = obj(item.lineStyle).color;
			const lineColor =
				kind === 'wealth' && singleLine && !isUpColor(existing) && !isDownColor(existing)
					? directionColor(item.data, palette, env)
					: resolveLineColor(existing, palette, chartID, kind);
			next.lineStyle = { ...obj(item.lineStyle), color: lineColor };
			// The point markers and hover state wear the line's colour too, so a
			// builder's gold default can't show through anywhere (A13).
			next.itemStyle = { ...obj(item.itemStyle), color: lineColor };
			if (item.areaStyle)
				next.areaStyle = { ...obj(item.areaStyle), color: lineColor, opacity: palette.areaOpacity };
			const emphasis = obj(item.emphasis);
			if (kind === 'wealth' || kind === 'spending') {
				next.emphasis = {
					...emphasis,
					focus: 'series',
					scale: true,
					itemStyle: {
						...obj(emphasis.itemStyle),
						color: lineColor,
						borderColor: palette.emphasisBorder,
						borderWidth: 2
					}
				};
				next.showSymbol = false;
			} else if (item.emphasis) {
				next.emphasis = {
					...emphasis,
					itemStyle: { ...obj(emphasis.itemStyle), color: lineColor }
				};
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

		// Gain/loss bars colour each data point; repaint only the direction colours.
		if (item.type === 'bar' && Array.isArray(item.data)) {
			next.data = item.data.map((d) => {
				const style = obj(obj(d).itemStyle);
				const color = isUpColor(style.color)
					? palette.up
					: isDownColor(style.color)
						? palette.down
						: null;
				return color ? { ...obj(d), itemStyle: { ...style, color } } : d;
			});
		}

		if (item.type === 'candlestick') {
			next.itemStyle = {
				...obj(item.itemStyle),
				color: palette.up,
				color0: palette.down,
				borderColor: palette.up,
				borderColor0: palette.down
			};
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

type ValueEnv = Pick<ThemeEnv, 'currency' | 'locale' | 'valueFormat'>;

function formatValue(value: unknown, env: ValueEnv): string {
	const n = Number(value);
	if (!Number.isFinite(n)) return typeof value === 'string' ? value : '';
	if (env.valueFormat === 'percent') return percentPoints(n, env.locale ?? 'en');
	return money(n, env.currency, env.locale ?? 'en');
}

/**
 * Tooltip for wealth/spending lines: "<date><br/><strong>€12,345.00</strong>",
 * in the series' currency and the app locale (DS 2.0 money contract).
 */
export function wealthTooltipFormatter(params: unknown, env: ValueEnv = {}): string {
	const items = Array.isArray(params) ? params : [params];
	const first = items[0] as Obj | undefined;
	if (!first) return '';
	const label = first.axisValueLabel ?? first.name;
	const date = typeof label === 'string' ? label : '';
	const data = first.data as Obj | number | undefined;
	const value = (data && typeof data === 'object' ? data.value : undefined) ?? first.value ?? data;
	return `${date}<br/><strong>${formatValue(value, env)}</strong>`;
}

/**
 * The value axis in the series' unit: percent points, or compact money
 * ("$48.43K") when the currency is known. Otherwise the axis is left alone.
 */
function withMoneyAxis(axes: unknown, env: ThemeEnv): unknown {
	const currency = env.currency;
	const locale = env.locale ?? 'en';
	const percent = env.valueFormat === 'percent';
	if ((!currency && !percent) || !axes) return axes;
	const formatter = percent
		? (v: number) => percentPoints(v, locale)
		: (v: number) => compactMoney(v, currency, locale);
	return list(axes).map((raw) => {
		const axis = obj(raw);
		return { ...axis, axisLabel: { ...obj(axis.axisLabel), formatter } };
	});
}

/** Calendar charts have no cartesian axes and the pillar bar hides both. */
const skipAxesFor = (kind: ChartKind) =>
	kind === 'spark' || kind === 'density' || kind === 'pillars';

/**
 * What dashboard-charts.js refreshCharts() setOption'd onto one chart:
 * `current` is chart.getOption(), chartID the node id.
 */
export function themedOptionPatch(current: Obj, chartID: string, env: ThemeEnv): Obj {
	const palette = getChartPalette(env);
	const triggerOn = env.coarsePointer ? 'click' : 'mousemove|click';
	const kind = chartKind(chartID, current.series);
	const isMoney = kind === 'wealth' || kind === 'spending';
	const formatter = isMoney ? (p: unknown) => wealthTooltipFormatter(p, env) : undefined;
	const yAxis = skipAxesFor(kind) ? current.yAxis : patchAxisList(current.yAxis, palette);
	const next: Obj = {
		backgroundColor: 'transparent',
		tooltip: buildTooltipOption(current, palette, triggerOn, env, formatter),
		xAxis: skipAxesFor(kind) ? current.xAxis : patchAxisList(current.xAxis, palette),
		yAxis: isMoney ? withMoneyAxis(yAxis, env) : yAxis,
		animationDuration: env.reducedMotion ? 0 : 320,
		animationEasing: 'cubicOut',
		series: patchSeriesList(current.series, palette, chartID, kind, env)
	};
	// The option's palette is what ECharts falls back to (legend swatch,
	// tooltip marker): for a trend line it is the lines' own colours, never a
	// builder's gold default.
	if (kind === 'wealth' || kind === 'spending') {
		const lineColors = list(next.series)
			.map((s) => obj(obj(s).lineStyle).color)
			.filter((c): c is string => typeof c === 'string');
		if (lineColors.length > 0) next.color = lineColors;
	}
	// Only send these when the chart has them: an explicit undefined drops the component.
	const visualMap = patchVisualMap(current, env);
	if (visualMap) next.visualMap = visualMap;
	const calendar = patchCalendar(current, palette, env);
	if (calendar) next.calendar = calendar;
	// Legend text wears the axis ink: a builder's fixed hex cannot clear 4.5:1 on
	// both the white and the navy surface.
	if (current.legend) {
		// A single series is already named by the panel title, and its legend
		// collided with the x-axis labels (A9), so it is hidden.
		// Only a line chart: a pie's legend names its slices, not its one series.
		const series = current.series ? list(current.series) : [];
		const single = series.length === 1 && obj(series[0]).type === 'line';
		const ink = (l: unknown) => ({
			...obj(l),
			...(single ? { show: false } : {}),
			textStyle: { ...obj(obj(l).textStyle), color: palette.axis }
		});
		next.legend = Array.isArray(current.legend) ? current.legend.map(ink) : ink(current.legend);
	}
	return next;
}

/** Wrappers that fade the chart in on first render and on theme change (dashboard-charts.js). */
export const FADE_WRAPPERS =
	'.overview-wealth-chart, .stock-chart-wrap, .overview-allocation-chart, .overview-watchlist-spark';
