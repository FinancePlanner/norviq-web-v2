import { describe, expect, it } from 'vitest';
import type { components } from '#lib/api/schema.js';
import { translator } from '#lib/i18n/index.js';
import { buildHoldingsHeroVM, type HoldingsHeroInput } from './hero-vm.js';

type Performance = components['schemas']['PortfolioPerformanceResponse'];
type Summary = components['schemas']['PortfolioSummaryResponse'];

const now = new Date('2026-11-24T12:00:00Z');

const freshPoints = [
	{ date: '2025-11-24', value: 80000 },
	{ date: '2026-05-24', value: 90000 },
	{ date: '2026-11-23', value: 96000 }
];
const stalePoints = [
	{ date: '2026-11-05', value: 810.19 },
	{ date: '2026-11-08', value: 870.5 },
	{ date: '2026-11-11', value: 919.06 }
];

function performance(baseCurrency: string, points = freshPoints): Performance {
	return { baseCurrency, points, changes: {} };
}

function summary(
	baseCurrency: string,
	allocation: Summary['allocation'],
	totalValue = 48432.05
): Summary {
	return {
		baseCurrency,
		totalValue,
		totalCost: 40000,
		unrealizedPnl: 8432.05,
		realizedPnl: 0,
		cashBalance: 2116,
		allocation
	};
}

function input(over: Partial<HoldingsHeroInput> = {}): HoldingsHeroInput {
	return {
		performance: performance('USD'),
		summary: summary('USD', [
			{ symbol: 'VST', value: 46316.05, currency: 'USD' },
			{ symbol: 'CASH', value: 2116, currency: 'USD' }
		]),
		costBasis: 40000,
		holdings: [],
		accountCurrency: { currency: 'USD', mixed: false },
		range: '1M',
		portfolioID: '',
		locale: 'en',
		now,
		t: translator('en'),
		...over
	};
}

describe('buildHoldingsHeroVM', () => {
	it('prints the total in the data currency and the locale separators', () => {
		const vm = buildHoldingsHeroVM(
			input({
				performance: performance('EUR'),
				summary: null,
				portfolioID: 'p1',
				costBasis: 48432.05 - 2116,
				locale: 'pt-PT',
				t: translator('pt-PT')
			})
		);
		expect(vm.totalValue).toContain('€');
		expect(vm.totalValue).toContain(',');
		expect(vm.totalValue).not.toContain('$');
		expect(vm.currency).toBe('EUR');
	});

	it('prefers the summary currency for the figure it prints', () => {
		const vm = buildHoldingsHeroVM(
			input({
				summary: summary('EUR', [{ symbol: 'ASML', value: 48432.05, currency: 'EUR' }]),
				performance: performance('EUR'),
				portfolioID: 'p1',
				locale: 'pt-PT',
				t: translator('pt-PT')
			})
		);
		expect(vm.totalValue).toBe('48 432,05 €');
	});

	it('never prints a dollar sign when no currency is known', () => {
		const vm = buildHoldingsHeroVM(
			input({
				performance: null,
				summary: null,
				costBasis: 1234,
				accountCurrency: { currency: null, mixed: false }
			})
		);
		expect(vm.totalValue).toBe('1,234.00 —');
		expect(vm.currency).toBeNull();
	});

	it('hides a stale change and says how old the prices are', () => {
		const vm = buildHoldingsHeroVM(input({ performance: performance('USD', stalePoints) }));
		expect(vm.delta).toBeNull();
		expect(vm.asOfCaption).toContain('11');
		expect(vm.asOfCaption).toBe('Prices as of 11 Nov 2026');
		expect(vm.chart).toBeNull();
	});

	it('subtotals by each holding’s quote currency (allocation rows all carry the base, API B3)', () => {
		const vm = buildHoldingsHeroVM(
			input({
				portfolioID: 'p1',
				summary: summary('USD', [
					{ symbol: 'ASML', value: 61210.4, currency: 'USD' },
					{ symbol: 'VST', value: 35514.22, currency: 'USD' }
				]),
				holdings: [
					{ currency: 'EUR', value: 61210.4 },
					{ currency: 'USD', value: 35514.22 }
				]
			})
		);
		expect(vm.totalValue).toBe('');
		expect(vm.subtotals).toEqual(['€61,210.40', '$37,630.22']);
		expect(vm.mixedCaption).not.toBeNull();
		expect(vm.delta).toBeNull();
		expect(vm.chart).toBeNull();
	});

	it('keeps one total when every holding is in the base currency', () => {
		const vm = buildHoldingsHeroVM(
			input({
				portfolioID: 'p1',
				holdings: [
					{ currency: 'USD', value: 46316.05 },
					{ currency: null, value: 1 }
				]
			})
		);
		expect(vm.subtotals).toBeNull();
		expect(vm.totalValue).toBe('$48,432.05');
	});

	it('never trusts the unscoped summary currency (a backend "USD" default)', () => {
		const vm = buildHoldingsHeroVM(
			input({ portfolioID: '', accountCurrency: { currency: 'EUR', mixed: false } })
		);
		expect(vm.currency).toBe('EUR');
		expect(vm.totalValue).toBe('€48,432.05');
	});

	it('subtotals when the account’s portfolios differ in currency', () => {
		const vm = buildHoldingsHeroVM(
			input({
				portfolioID: '',
				accountCurrency: { currency: null, mixed: true },
				holdings: [{ currency: 'USD', value: 46316.05 }]
			})
		);
		expect(vm.totalValue).toBe('');
		expect(vm.subtotals).toEqual(['$46,316.05', '2,116.00\u00a0\u2014']);
	});

	it('keeps the selected portfolio on every range link', () => {
		const vm = buildHoldingsHeroVM(input({ portfolioID: 'p2', range: '3M' }));
		expect(vm.rangeLinks.map((l) => l.range)).toEqual(['1W', '1M', '3M', '1Y', 'ALL']);
		for (const l of vm.rangeLinks) expect(l.href).toContain('portfolio=p2');
		expect(vm.rangeLinks.filter((l) => l.current).map((l) => l.range)).toEqual(['3M']);
	});

	it('labels the change with the range it was measured over', () => {
		const vm = buildHoldingsHeroVM(input({ range: '1Y' }));
		expect(vm.delta).not.toBeNull();
		expect(vm.delta!.basis).toBe('1 year');
		expect(vm.delta!.basis).not.toContain('previous close');
		expect(vm.delta!.direction).toBe('up');
		expect(vm.delta!.text).toBe('+$16,000.00 (+20.0%)');
		expect(vm.asOfCaption).toBeNull();
		expect(vm.chart?.values).toEqual([80000, 90000, 96000]);
	});

	it('draws no line and no change from fewer than 3 points', () => {
		const vm = buildHoldingsHeroVM(
			input({ performance: performance('USD', freshPoints.slice(1)) })
		);
		expect(vm.delta).toBeNull();
		expect(vm.chart).toBeNull();
		expect(vm.historyNote).not.toBeNull();
	});

	it('labels cost as cost when the summary is missing', () => {
		const vm = buildHoldingsHeroVM(input({ summary: null }));
		expect(vm.heroLabel).toBe('Portfolio value at cost');
	});
});
