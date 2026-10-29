// Ports of norviq-web internal/handlers/crypto_markets_test.go and
// crypto_data_test.go (the view-model and formatting expectations).
import { describe, expect, it } from 'vitest';
import { buildCryptoMarketsVM, cryptoChangePercent, formatCryptoPrice, formatMultiple, normalizeCryptoTimeframe } from './markets.js';
import type { CryptoMarketsResponse } from './types.js';

const fixture: CryptoMarketsResponse = {
	timeframe: '1w',
	supportedTimeframes: ['1d', '1w', '1m', '1y', 'all'],
	source: 'coingecko',
	asOf: '2026-10-01T12:00:00Z',
	isStale: false,
	colorMode: 'change',
	colorScaleMaxPct: 15,
	attribution: 'Data provided by CoinGecko',
	summary: { totalMarketCap: 3100000000000, btcDominancePct: 57.2, advancers: 2, decliners: 1 },
	coins: [
		{ id: 'bitcoin', symbol: 'BTC', fmpSymbol: 'BTCUSD', name: 'Bitcoin', sector: 'Layer 1', price: 84377, marketCap: 1.7e12, changePct: 4.2, athChangePct: -33, sparkline7d: [1, 2, 3] },
		{ id: 'solana', symbol: 'SOL', fmpSymbol: 'SOLUSD', name: 'Solana', sector: 'Layer 1', price: 150, marketCap: 8e10, changePct: 9.5, sparkline7d: [] },
		{ id: 'pepe', symbol: 'PEPE', name: 'Pepe', sector: 'Meme', price: 0.0000091, marketCap: 4e9, changePct: -6.1, sparkline7d: [] }
	],
	gainers: [
		{ id: 'solana', symbol: 'SOL', fmpSymbol: 'SOLUSD', name: 'Solana', sector: 'Layer 1', price: 150, changePct: 9.5, sparkline7d: [] },
		{ id: 'bitcoin', symbol: 'BTC', fmpSymbol: 'BTCUSD', name: 'Bitcoin', sector: 'Layer 1', price: 84377, changePct: 4.2, sparkline7d: [] }
	],
	losers: [{ id: 'pepe', symbol: 'PEPE', name: 'Pepe', sector: 'Meme', price: 0.0000091, changePct: -6.1, sparkline7d: [] }],
	athBoard: {
		recentAths: [],
		nearAth: [
			{
				id: 'bitcoin',
				symbol: 'BTC',
				fmpSymbol: 'BTCUSD',
				name: 'Bitcoin',
				sector: 'Layer 1',
				price: 84377,
				sparkline7d: [],
				athChangePct: -33,
				athDate: '2025-10-06T10:57:42.000Z',
				atlChangePct: 124333
			}
		],
		deepestDrawdowns: []
	}
};

describe('crypto markets view model', () => {
	it('renders the market view', () => {
		const vm = buildCryptoMarketsVM(fixture, 'market', '1w', 'cap');
		expect(vm.timeframes.find((t) => t.active)?.label).toBe('1W');
		expect(vm.timeframes.find((t) => t.label === 'YTD')?.disabled).toBe(true);
		expect(vm.timeframes.find((t) => t.label === '1M')?.pushURL).toBe('/crypto/market?tf=1m');
		expect(vm.gainers.map((r) => r.name)).toEqual(['Solana', 'Bitcoin']);
		expect(vm.gainers[0].href).toBe('/crypto/coin/SOLUSD');
		expect(vm.gainers[0].change).toBe('+9.50%');
		expect(vm.losers[0].change).toBe('-6.10%');
		expect(vm.losers[0].price).toBe('$0.0000091');
		expect(vm.heatmap?.tiles).toHaveLength(3);
		expect(vm.nearAth[0]).toMatchObject({ fromATH: '-33.0%', athDate: 'High Oct 6, 2025', sinceATL: '1,244x' });
		expect(vm.attribution).toBe('Data provided by CoinGecko');
		expect(vm.asOf).toBe('Oct 1, 12:00 UTC');
		expect(vm.btcDominance).toBe('57.2%');
		expect(vm.totalMarketCap).toBe('$3100.00B');
	});

	it('renders bubbles without a link for coins FMP does not carry', () => {
		const vm = buildCryptoMarketsVM(fixture, 'bubbles', '1w', 'change');
		expect(vm.heatmap).toBeNull();
		expect(vm.bubbles?.sizeBy).toBe('change');
		expect(vm.bubbles?.nodes.find((n) => n.symbol === 'PEPE')?.href).toBe('');
		expect(vm.sizeOptions.map((o) => o.pushURL)).toEqual(['/crypto/bubbles?size=cap&tf=1w', '/crypto/bubbles?size=change&tf=1w']);
	});

	it('falls back to one day on a bad timeframe', () => {
		expect(normalizeCryptoTimeframe('forever')).toBe('1d');
	});
});

describe('crypto formatting', () => {
	it('formats prices', () => {
		expect(formatCryptoPrice(84377)).toBe('$84,377.00');
		expect(formatCryptoPrice(150)).toBe('$150.00');
		expect(formatCryptoPrice(0.54321)).toBe('$0.5432');
		expect(formatCryptoPrice(0.0000091)).toBe('$0.0000091');
	});

	it('formats multiples', () => {
		expect(formatMultiple(124333)).toBe('1,244x');
		expect(formatMultiple(45)).toBe('+45%');
	});

	it.each([
		[118741, -37.93, -0.031934],
		[2, 1, 100],
		[10, 0, 0]
	])('converts the short quote change to a percent (%d, %d)', (price, change, want) => {
		expect(cryptoChangePercent(price, change)).toBeCloseTo(want, 4);
	});

	it('has no percent without a usable previous price', () => {
		expect(cryptoChangePercent(5, 5)).toBeNull();
		expect(cryptoChangePercent(1, 3)).toBeNull();
	});
});
