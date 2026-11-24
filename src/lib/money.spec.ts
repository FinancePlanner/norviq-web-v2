import { describe, expect, it } from 'vitest';
import fixtures from './__fixtures__/money.json';
import {
	compactMoney,
	money,
	normalise,
	signedMoney,
	signedPercent,
	type AppLocale
} from './money.js';

// The DS 2.0 money contract (spec § 5.4), proven by the shared golden table.
// The master is docs/design-system-fixtures/money.json; the copy here is
// byte-for-byte, and every platform tests the rows tagged for it.

interface MoneyCase {
	kind: string;
	style: string;
	value: number;
	currency?: string;
	locale: string;
	platforms: string[];
	expected: string;
}

const NBSP = ' ';
const MINUS = '−';
const EM_DASH = '—';

const cases: MoneyCase[] = fixtures.cases;
const webCases = cases.filter((c) => c.platforms.includes('web'));
const appLocale = (l: string): AppLocale => (l === 'en-US' ? 'en' : 'pt-PT');

function render(c: MoneyCase): string {
	const locale = appLocale(c.locale);
	if (c.kind === 'percent') return signedPercent(c.value, locale);
	switch (c.style) {
		case 'standard':
			return money(c.value, c.currency, locale);
		case 'signed':
			return signedMoney(c.value, c.currency, locale);
		case 'compact':
			return compactMoney(c.value, c.currency, locale);
	}
	throw new Error(`unknown money style ${c.style}`);
}

describe('money golden fixtures', () => {
	it('vendors the 2026-11-24 master with 24 web cases', () => {
		expect(fixtures.version).toBe('2026-11-24');
		expect(webCases).toHaveLength(24);
	});

	for (const c of webCases) {
		it(`${c.kind}/${c.style} ${c.value} ${c.currency ?? ''} ${c.locale}`, () => {
			expect(render(c)).toBe(c.expected);
		});
	}
});

describe('money', () => {
	it('missing currency never prints $', () => {
		expect(money(1234, null, 'en')).toBe(`1,234.00${NBSP}${EM_DASH}`);
		expect(money(1234, '', 'pt-PT')).toBe(`1234,00${NBSP}${EM_DASH}`);
		expect(money(1234, undefined, 'en')).not.toContain('$');
	});

	it('treats a malformed currency code as missing instead of throwing', () => {
		expect(money(10, 'EURO', 'en')).toBe(`10.00${NBSP}${EM_DASH}`);
		expect(money(10, '€', 'en')).toBe(`10.00${NBSP}${EM_DASH}`);
	});

	it('accepts a lower-case code', () => {
		expect(money(10, 'eur', 'en')).toBe('€10.00');
	});

	it('signs a missing-currency delta with U+2212', () => {
		expect(signedMoney(-5, null, 'en')).toBe(`${MINUS}5.00${NBSP}${EM_DASH}`);
		expect(signedMoney(5, null, 'en')).toBe(`+5.00${NBSP}${EM_DASH}`);
	});

	it('normalises narrow and thin spaces and hyphen-minus', () => {
		expect(normalise('1 234 € -3')).toBe(`1${NBSP}234${NBSP}€ ${MINUS}3`);
	});
});
