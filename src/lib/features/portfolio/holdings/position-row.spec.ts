import { describe, expect, it } from 'vitest';
import type { PnlBySymbol, QuoteResponse, StockListItem } from '../market.server.js';
import { mapPositionRow } from './holdings.server.js';

const MINUS = '−';
const NBSP = ' ';

const stock: StockListItem = {
	id: '00000000-0000-0000-0000-0000000000aa',
	symbol: 'asml',
	shares: 10,
	buyPrice: 600,
	buyDate: '2026-01-02',
	category: 'stock',
	createdAt: '2026-01-02T00:00:00Z'
};

const quote: QuoteResponse = {
	symbol: 'ASML',
	currency: 'EUR',
	c: 650.5,
	d: -3.2,
	dp: -0.49,
	t: 0
};

const pnl: PnlBySymbol = {
	symbol: 'ASML',
	currency: 'USD',
	realizedPnl: 0,
	unrealizedPnl: 505,
	costBasis: 6000,
	currentPrice: 650.5,
	marketValue: 6505,
	unrealizedPnlPercent: 8.42,
	dayChange: -32,
	dayChangePercent: -0.49,
	weightPercent: 12.3
};

const row = (q: QuoteResponse | null, p: PnlBySymbol | null, locale: 'en' | 'pt-PT') =>
	mapPositionRow(
		stock,
		null,
		new Map(q ? [['ASML', q]] : []),
		new Map(p ? [['ASML', p]] : []),
		null,
		null,
		0,
		{ currency: 'USD', locale }
	);

describe('mapPositionRow (DS 2.0: one screen, one format)', () => {
	it('prints a pt-PT row with pt-PT separators in the holding’s own quote currency', () => {
		const r = row(quote, pnl, 'pt-PT');
		expect(r.marketValue).toBe(`6505,00${NBSP}€`);
		expect(r.costBasis).toBe(`6000,00${NBSP}€`);
		expect(r.lastPrice).toBe(`650,50${NBSP}€`);
		expect(r.todayGL).toBe(`${MINUS}32,00${NBSP}€`);
		expect(r.totalGL).toBe(`+505,00${NBSP}€`);
		expect(r.chgPct).toBe(`${MINUS}0,49%`);
		expect(r.totalGLPct).toBe('+8,42%');
		expect(r.weightPct).toBe('12,3%');
		expect(r.netChg).toBe(`${MINUS}3,20${NBSP}€`);
	});

	it('falls back to the portfolio currency when the holding has no quote', () => {
		const r = row(null, null, 'en');
		expect(r.marketValue).toBe('$6,000.00');
		expect(r.costBasis).toBe('$6,000.00');
	});

	it('never prints a dollar sign when no currency is known', () => {
		const r = mapPositionRow(stock, null, new Map(), new Map(), null, null, 0, {
			currency: null,
			locale: 'en'
		});
		expect(r.marketValue).toBe(`6,000.00${NBSP}—`);
	});
});
