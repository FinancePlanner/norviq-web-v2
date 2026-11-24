import { describe, expect, it } from 'vitest';
import {
	directionOf,
	formatBps,
	formatLevel,
	formatLongDate,
	formatPercent,
	formatSigned,
	formatTime,
	formatYield,
	parseLegacyPercent
} from './format.js';

const MINUS = '−';

describe('edition formatting', () => {
	it('formats levels in the brief convention for each language', () => {
		expect(formatLevel(25029.33, 'en')).toBe('25,029.33');
		expect(formatLevel(25029.33, 'pt-PT')).toBe('25.029,33');
		expect(formatLevel(7698, 'pt-PT')).toBe('7.698,00');
	});

	it('signs moves with a true minus and a plus', () => {
		expect(formatSigned(-1490.32, 'en', 2)).toBe(MINUS + '1,490.32');
		expect(formatSigned(12.6, 'en', 2)).toBe('+12.60');
		expect(formatPercent(-5.61, 'en')).toBe(MINUS + '5.61%');
		expect(formatPercent(-5.61, 'pt-PT')).toBe(MINUS + '5,61%');
		expect(formatPercent(0.48, 'en')).toBe('+0.48%');
	});

	it('never shows a sign on a move that rounds to zero', () => {
		expect(formatPercent(-0.001, 'en')).toBe('0.00%');
		expect(directionOf(-0.001)).toBe('flat');
		expect(directionOf(-0.006)).toBe('down');
	});

	it('quotes yields as a level and moves in basis points', () => {
		expect(formatYield(4.91, 'en', 3)).toBe('4.910%');
		expect(formatBps(-13.9, 'en')).toBe(MINUS + '13.9 bp');
		expect(formatBps(-13.9, 'pt-PT')).toBe(MINUS + '13,9 p.b.');
	});

	it('formats dates and times in their zones', () => {
		expect(formatLongDate('2026-11-20', 'en')).toBe('20 November 2026');
		expect(formatLongDate('2026-11-20', 'pt-PT')).toBe('20 de novembro de 2026');
		expect(formatTime('2026-11-20T22:33:52Z', 'Europe/Lisbon', 'en')).toBe('22:33');
		expect(formatTime('2026-11-20T21:00:00Z', 'America/New_York', 'en')).toBe('16:00');
		expect(formatTime('not a date', 'Europe/Lisbon', 'en')).toBe('');
	});

	it('reads legacy unsigned percents in either language', () => {
		expect(parseLegacyPercent('5.61%')).toBe(5.61);
		expect(parseLegacyPercent('5,61%')).toBe(5.61);
		expect(parseLegacyPercent('1,234.50%')).toBe(1234.5);
		expect(parseLegacyPercent('1.234,50%')).toBe(1234.5);
		expect(parseLegacyPercent('n/a')).toBeNull();
	});
});
