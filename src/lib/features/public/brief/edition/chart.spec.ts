import { describe, expect, it } from 'vitest';
import {
	CHART_H,
	PAD,
	SPARK_H,
	comparativeChart,
	hourTicks,
	niceStep,
	pathOf,
	sparkline
} from './chart.js';

describe('edition chart geometry', () => {
	it('draws a sparkline inside its box, baseline included in the range', () => {
		const s = sparkline([10, 12, 11, 9], 11)!;
		expect(s.path.startsWith('M0 ')).toBe(true);
		expect(s.path.split(' L').length).toBe(4);
		const ys = s.path.match(/[\d.]+(?= L|$)/g)!.map(Number);
		for (const y of ys) {
			expect(y).toBeGreaterThanOrEqual(0);
			expect(y).toBeLessThanOrEqual(SPARK_H);
		}
		expect(s.baseline).not.toBeNull();
		expect(sparkline([1])).toBeNull();
	});

	it('is deterministic', () => {
		expect(
			pathOf([
				[0, 0],
				[1.234, 5.678]
			])
		).toBe('M0 0 L1.2 5.7');
		expect(sparkline([3, 1, 2])).toEqual(sparkline([3, 1, 2]));
	});

	it('picks round tick steps', () => {
		expect(niceStep(6, 4)).toBe(2);
		expect(niceStep(0.9, 4)).toBe(0.25);
		expect(niceStep(0, 4)).toBe(1);
	});

	it('charts percent series on one axis with a zero line when the range crosses zero', () => {
		const t0 = 1_795_530_600;
		const geo = comparativeChart(
			[
				{
					symbol: 'A',
					points: [
						[t0, 0.5],
						[t0 + 3600, -5.6]
					]
				},
				{
					symbol: 'B',
					points: [
						[t0, 0.2],
						[t0 + 3600, -1.9]
					]
				}
			],
			[t0, t0 + 3600]
		)!;
		expect(geo.paths.size).toBe(2);
		expect(geo.zero).not.toBeNull();
		expect(geo.yTicks[0].value).toBeLessThanOrEqual(-5.6);
		expect(geo.yTicks[geo.yTicks.length - 1].value).toBeGreaterThanOrEqual(0.5);
		for (const tick of geo.yTicks) {
			expect(tick.y).toBeGreaterThanOrEqual(PAD.top - 0.1);
			expect(tick.y).toBeLessThanOrEqual(CHART_H - PAD.bottom + 0.1);
		}
		expect(geo.xTicks.map((x) => x.t)).toEqual([t0, t0 + 3600]);
	});

	it('returns nothing to draw without two points', () => {
		expect(comparativeChart([{ symbol: 'A', points: [[1, 1]] }], [])).toBeNull();
	});

	it('labels whole hours', () => {
		expect(hourTicks(3600 * 10 + 1800, 3600 * 13)).toEqual([3600 * 11, 3600 * 12, 3600 * 13]);
	});
});
