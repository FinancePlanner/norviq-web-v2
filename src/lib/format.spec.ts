import { describe, expect, it } from 'vitest';
import {
	DASH,
	ErrEmpty,
	ErrNotNumber,
	changeClass,
	compact,
	compactCurrency,
	currency,
	currencySymbol,
	formatCompactCurrency,
	formatCompactNumber,
	formatCurrency,
	formatFloat,
	formatMoney,
	formatPercentValue,
	formatSignedCurrency,
	formatSignedPercent,
	formatWithCommas,
	inputNumber,
	number,
	parseAmount,
	percent,
	wholeShares
} from './format.js';
import goFormat from './__fixtures__/go-format.json' with { type: 'json' };
import goHandlers from './__fixtures__/go-handlers-format.json' with { type: 'json' };

// Cases ported from norviq-web internal/format/format_test.go.

describe('compact', () => {
	it('matches the Go cases', () => {
		const cases: Array<[number, string]> = [
			[10e12, '10T'],
			[1.25e9, '1.25B'],
			[11e9, '11B'],
			[10.6e9, '10.6B'],
			[1e6, '1M'],
			[2_916_670, '2.92M'],
			[1500, '1.5K'],
			[999_999, '1M'],
			[999.999, '1K'],
			[909.0909, '909.09'],
			[0, '0'],
			[-1500, '-1.5K'],
			[-0.001, '0']
		];
		for (const [v, want] of cases) expect(compact(v), `compact(${v})`).toBe(want);
		expect(compact(NaN)).toBe(DASH);
		expect(compact(Infinity)).toBe(DASH);
	});
});

describe('compactCurrency', () => {
	it('matches the Go cases', () => {
		expect(compactCurrency(10e12, 'USD')).toBe('$10T');
		expect(compactCurrency(1.25e9, 'EUR')).toBe('€1.25B');
		expect(compactCurrency(1500, 'SEK')).toBe('SEK 1.5K');
		expect(compactCurrency(-1500, 'USD')).toBe('-$1.5K');
		expect(compactCurrency(1e6, '')).toBe('1M');
		expect(compactCurrency(NaN, 'USD')).toBe(DASH);
	});
});

describe('currencySymbol', () => {
	it('matches the Go cases', () => {
		expect(currencySymbol('usd')).toBe('$');
		expect(currencySymbol(' EUR ')).toBe('€');
		expect(currencySymbol('GBP')).toBe('£');
		expect(currencySymbol('CHF')).toBe('CHF ');
		expect(currencySymbol('SEK')).toBe('SEK ');
		expect(currencySymbol('')).toBe('');
	});
});

describe('number', () => {
	it('matches the Go cases', () => {
		expect(number(1100, 2)).toBe('1,100');
		expect(number(909.0909, 2)).toBe('909.09');
		expect(number(2916.666, 2)).toBe('2,916.67');
		expect(number(1234567.5, 2)).toBe('1,234,567.5');
		expect(number(1099.6, 0)).toBe('1,100');
		expect(number(0.004, 2)).toBe('0');
		expect(number(-0.004, 2)).toBe('0');
		expect(number(-1234.5, 2)).toBe('-1,234.5');
		expect(number(NaN, 2)).toBe(DASH);
	});
});

describe('currency', () => {
	it('matches the Go cases', () => {
		expect(currency(909.0909090909091, 'USD')).toBe('$909.09');
		expect(currency(204050, 'USD')).toBe('$204,050');
		expect(currency(185.5, 'USD')).toBe('$185.50');
		expect(currency(318181.8181818182, 'USD')).toBe('$318,181.82');
		expect(currency(-12.5, 'EUR')).toBe('-€12.50');
		expect(currency(0, 'USD')).toBe('$0');
		expect(currency(-0.001, 'USD')).toBe('$0');
		expect(currency(185.5, '')).toBe('185.50');
		expect(currency(-Infinity, 'USD')).toBe(DASH);
	});
});

describe('percent', () => {
	it('matches the Go cases', () => {
		expect(percent(0.6818181818181818)).toBe('68.18%');
		expect(percent(0)).toBe('0%');
		expect(percent(1.2)).toBe('120%');
		expect(percent(NaN)).toBe(DASH);
	});
});

describe('wholeShares', () => {
	it('matches the Go cases', () => {
		expect(wholeShares(1100)).toBe(1100);
		expect(wholeShares(1099.6)).toBe(1099);
		expect(wholeShares(-3)).toBe(0);
		expect(wholeShares(NaN)).toBe(0);
	});
});

describe('inputNumber', () => {
	it('matches the Go cases', () => {
		expect(inputNumber(10e12)).toBe('10000000000000');
		expect(inputNumber(185.5)).toBe('185.5');
		expect(inputNumber(0)).toBe('0');
		expect(inputNumber(NaN)).toBe('');
	});
});

describe('parseAmount', () => {
	it('matches the Go cases', () => {
		const ok: Record<string, number> = {
			'1100': 1100,
			'1,100': 1100,
			'1,25': 1.25,
			'0,500': 0.5,
			'0,125': 0.125,
			'1.234,56': 1234.56,
			'1,234.56': 1234.56,
			'1.234.567': 1234567,
			'1.100': 1.1,
			'10T': 10e12,
			'11B': 11e9,
			'1.25b': 1.25e9,
			'$1,000,000': 1e6,
			' 750 ': 750,
			'€ 2,5K': 2500,
			'-5': -5
		};
		for (const [raw, want] of Object.entries(ok)) {
			const got = parseAmount(raw);
			expect(got.ok, raw).toBe(true);
			if (got.ok) expect(got.value, raw).toBeCloseTo(want, 6);
		}
		for (const raw of ['', '   ']) {
			const got = parseAmount(raw);
			expect(!got.ok && got.error === ErrEmpty, raw).toBe(true);
		}
		for (const raw of ['abc', '1,2,3', 'NaN', 'Inf', 'T', '$', '1e300T']) {
			const got = parseAmount(raw);
			expect(!got.ok && got.error === ErrNotNumber, raw).toBe(true);
		}
	});
});

// Golden output captured by running the Go package itself over edge values
// (exact ties, 1e21+, tiny numbers): proves the TS rounding matches Go's.
describe('Go golden output', () => {
	for (const row of goFormat.rows) {
		it(`formats ${row.in}`, () => {
			expect(compact(row.in)).toBe(row.Compact);
			expect(compactCurrency(row.in, 'USD')).toBe(row.CompactCurrency);
			expect(compactCurrency(row.in, 'eur')).toBe(row.CompactEUR);
			expect(number(row.in, 2)).toBe(row.Number2);
			expect(number(row.in, 0)).toBe(row.Number0);
			expect(currency(row.in, 'USD')).toBe(row.Currency);
			expect(currency(row.in, '')).toBe(row.CurrencyNone);
			expect(percent(row.in)).toBe(row.Percent);
			expect(inputNumber(row.in)).toBe(row.Input);
		});
	}
	it('parses like strconv.ParseFloat', () => {
		for (const row of goFormat.parse) {
			const got = parseAmount(row.in);
			if (row.err === '') {
				expect(got.ok, JSON.stringify(row.in)).toBe(true);
				if (got.ok) expect(got.value, JSON.stringify(row.in)).toBe(row.out);
			} else {
				expect(got.ok, JSON.stringify(row.in)).toBe(false);
				if (!got.ok) expect(got.error.message, JSON.stringify(row.in)).toBe(row.err);
			}
		}
	});
	for (const row of goHandlers) {
		it(`handler helpers format ${row.In}`, () => {
			expect(formatCurrency(row.In)).toBe(row.Currency);
			expect(formatWithCommas(row.In)).toBe(row.WithCommas);
			expect(formatSignedPercent(row.In)).toBe(row.SignedPercent);
			expect(formatCompactNumber(row.In)).toBe(row.CompactNumber);
			expect(formatSignedCurrency(row.In)).toBe(row.SignedCurrency);
			expect(formatPercentValue(row.In)).toBe(row.Percent);
			expect(formatMoney(row.In, 'EUR')).toBe(row.Money);
			expect(formatMoney(row.In, 'SEK')).toBe(row.MoneySEK);
			expect(formatCompactCurrency(row.In)).toBe(row.CompactCurrency);
			expect(changeClass(row.In)).toBe(row.ChangeClass);
		});
	}
});

describe('formatFloat', () => {
	it('rounds exact ties to even like Go', () => {
		expect(formatFloat(0.125, 2)).toBe('0.12');
		expect(formatFloat(0.375, 2)).toBe('0.38');
		expect(formatFloat(2.5, 0)).toBe('2');
		expect(formatFloat(3.5, 0)).toBe('4');
		expect(formatFloat(-2.5, 0)).toBe('-2');
		expect(formatFloat(-0.001, 2)).toBe('-0.00');
		expect(formatFloat(1e21, 1)).toBe('1000000000000000000000.0');
		expect(formatFloat(1e-7, -1)).toBe('0.0000001');
	});
});
