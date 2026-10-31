import { describe, expect, it } from 'vitest';
import {
	activityRamp,
	chartKind,
	getChartPalette,
	parseHex,
	pillarColor,
	themedOptionPatch,
	wealthTooltipFormatter,
	type ThemeEnv
} from './theme.js';

function env(
	dark: boolean,
	vars: Record<string, string> = {},
	extra: Partial<ThemeEnv> = {}
): ThemeEnv {
	return {
		dark,
		cssVar: (n, f) => vars[n] ?? f,
		reducedMotion: false,
		coarsePointer: false,
		...extra
	};
}

describe('chartKind', () => {
	it('classifies like echarts-theme.js', () => {
		expect(chartKind('spark_aapl', [{ type: 'line' }])).toBe('spark');
		expect(chartKind('cc-heatmap', { type: 'heatmap' })).toBe('density');
		expect(chartKind('cc-pillars', [{ type: 'bar', stack: 'spend' }])).toBe('pillars');
		expect(chartKind('x', [{ type: 'pie' }])).toBe('allocation');
		expect(chartKind('spending_chart', [{ type: 'line' }])).toBe('spending');
		expect(chartKind('sector_gains_chart', [{ type: 'bar' }])).toBe('allocation');
		expect(chartKind('wealth_chart', [{ type: 'line' }])).toBe('wealth');
		expect(chartKind('stocks', [{ type: 'treemap' }])).toBe('other');
	});
});

describe('palette', () => {
	it('falls back per appearance and reads overrides', () => {
		expect(getChartPalette(env(false)).line).toBe('#80612a');
		expect(getChartPalette(env(true)).line).toBe('#d8b477');
		expect(getChartPalette(env(false)).up).toBe('#1b6e51');
		expect(getChartPalette(env(true)).down).toBe('#e16d75');
		expect(getChartPalette(env(false, { '--chart-line': '#123456' })).line).toBe('#123456');
		expect(getChartPalette(env(true)).areaOpacity).toBe(0.18);
	});
	it('ramps one hue from --color-tint', () => {
		expect(parseHex('#abc')).toEqual([170, 187, 204]);
		expect(parseHex('oklch(0.5 0.1 200)')).toBeNull();
		expect(activityRamp(env(false, { '--color-tint': '#0f766e' }))).toEqual([
			'rgba(15,118,110,0.14)',
			'rgba(15,118,110,0.38)',
			'rgba(15,118,110,0.68)',
			'rgba(15,118,110,1)'
		]);
		// theme.css declares the tint in OKLCH, so the ramp falls back to the gold.
		expect(activityRamp(env(false, { '--color-tint': 'oklch(1 0 0)' }))[3]).toBe(
			'rgba(138,106,46,1)'
		);
		expect(activityRamp(env(true, { '--color-tint': 'oklch(1 0 0)' }))[3]).toBe(
			'rgba(216,180,119,1)'
		);
	});
	it('resolves pillar colors from colorVar, then the name', () => {
		expect(pillarColor({ colorVar: '--x' }, env(false, { '--x': '#111111' }))).toBe('#111111');
		expect(pillarColor({ name: 'Fun' }, env(false))).toBe('#4f78a8');
		expect(pillarColor({ name: 'Other' }, env(false))).toBe('#57626e');
	});
});

describe('themedOptionPatch', () => {
	const wealth = {
		tooltip: [{ trigger: 'axis', axisPointer: { type: 'line' } }],
		xAxis: [{ type: 'category', axisLabel: { color: '#8D8371' } }],
		yAxis: [{ type: 'value', splitLine: { show: true, lineStyle: { color: '#e7e0d2' } } }],
		series: [{ type: 'line', lineStyle: { color: '#C97A2B' }, areaStyle: { opacity: 0.25 } }]
	};

	it('recolours a wealth line and installs the currency tooltip', () => {
		const next = themedOptionPatch(wealth, 'wealth_chart', env(true)) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
		expect(next.tooltip).toMatchObject({
			backgroundColor: '#1b2940',
			confine: true,
			triggerOn: 'mousemove|click',
			transitionDuration: 0.12
		});
		expect(next.tooltip.formatter).toBe(wealthTooltipFormatter);
		expect(next.xAxis[0].axisLabel.color).toBe('#9da9b8');
		expect(next.xAxis[0].axisPointer).toEqual({ show: true, snap: true });
		expect(next.yAxis[0].splitLine.lineStyle).toEqual({ color: '#344258', type: 'dashed' });
		expect(next.series[0].lineStyle.color).toBe('#d8b477');
		expect(next.series[0].areaStyle).toEqual({ opacity: 0.18, color: '#d8b477' });
		expect(next.series[0].showSymbol).toBe(false);
		expect(next.animationDuration).toBe(320);
		expect(next.visualMap).toBeUndefined();
	});

	it('keeps red lines red and spending lines alt, honours coarse pointers and reduced motion', () => {
		const down = { ...wealth, series: [{ type: 'line', lineStyle: { color: '#f23645' } }] };
		const next = themedOptionPatch(
			down,
			'spark_x',
			env(false, {}, { coarsePointer: true, reducedMotion: true })
		) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
		expect(next.series[0].lineStyle.color).toBe('#ab3640');
		expect(next.tooltip.triggerOn).toBe('click');
		expect(next.tooltip.transitionDuration).toBe(0);
		expect(next.animationDuration).toBe(0);
		expect(next.xAxis).toBe(down.xAxis); // spark: axes untouched
		const spending = themedOptionPatch(wealth, 'spending_chart', env(false)) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
		expect(spending.series[0].lineStyle.color).toBe('#4a5568');
	});

	it('themes the activity calendar and visualMap', () => {
		const current = {
			tooltip: [{}],
			visualMap: [{ inRange: { color: ['#000'] } }],
			calendar: [{ dayLabel: { firstDay: 1 } }],
			series: [{ type: 'heatmap' }]
		};
		const next = themedOptionPatch(
			current,
			'cc-heatmap',
			env(false, { '--color-card-bg': '#fafafa' })
		) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
		expect(next.visualMap[0].inRange.color).toHaveLength(4); // hex --color-tint fallback: four alpha steps
		expect(next.calendar[0].dayLabel).toEqual({ firstDay: 1, color: '#4a5568' });
		expect(next.calendar[0].itemStyle).toEqual({ borderColor: '#fafafa', borderWidth: 2 });
		expect(next.series[0].itemStyle).toEqual({ borderColor: '#fafafa', borderWidth: 2 });
	});

	it('paints direction with the gain/loss tokens, never the brand tint', () => {
		const up = themedOptionPatch(
			{ series: [{ type: 'line', lineStyle: { color: '#42B894' } }] },
			'spark_x',
			env(true)
		) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
		expect(up.series[0].lineStyle.color).toBe('#42b894');
		const bars = themedOptionPatch(
			{
				series: [
					{
						type: 'bar',
						data: [
							{ value: 4, itemStyle: { color: '#42B894' } },
							{ value: -3, itemStyle: { color: '#E16D75' } },
							7
						]
					}
				]
			},
			'sector_gains_chart',
			env(false)
		) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
		expect(bars.series[0].data).toEqual([
			{ value: 4, itemStyle: { color: '#1b6e51' } },
			{ value: -3, itemStyle: { color: '#ab3640' } },
			7
		]);
		const candle = themedOptionPatch(
			{ series: [{ type: 'candlestick', itemStyle: {} }] },
			'x',
			env(false)
		) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
		expect(candle.series[0].itemStyle).toEqual({
			color: '#1b6e51',
			color0: '#ab3640',
			borderColor: '#1b6e51',
			borderColor0: '#ab3640'
		});
	});

	it('inks legends with the axis colour and keeps their shape', () => {
		const one = themedOptionPatch(
			{ legend: { show: true, textStyle: { fontSize: 11 } } },
			'x',
			env(true)
		) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
		expect(one.legend).toEqual({ show: true, textStyle: { fontSize: 11, color: '#9da9b8' } });
		const many = themedOptionPatch({ legend: [{}] }, 'x', env(false)) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
		expect(many.legend).toEqual([{ textStyle: { color: '#4a5568' } }]);
		expect(themedOptionPatch({}, 'x', env(false)).legend).toBeUndefined();
	});

	it('gives pies a theme-aware shadow', () => {
		const next = themedOptionPatch(
			{ series: [{ type: 'pie' }] },
			'allocation_chart',
			env(true)
		) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
		expect(next.series[0].emphasis).toMatchObject({
			focus: 'self',
			scale: true,
			itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.45)' }
		});
	});

	it('formats the wealth tooltip in whole dollars', () => {
		expect(wealthTooltipFormatter([{ axisValueLabel: 'Jan 2', data: { value: 105000.4 } }])).toBe(
			'Jan 2<br/><strong>$105,000</strong>'
		);
	});
});
