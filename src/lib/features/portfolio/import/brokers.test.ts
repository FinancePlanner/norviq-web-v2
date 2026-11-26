import { describe, expect, it } from 'vitest';
import { BROKERS, methodHref } from './brokers.js';

describe('BROKERS', () => {
	it('lists the named brokers and the generic CSV entry', () => {
		expect(BROKERS.map((b) => [b.id, b.name])).toEqual([
			['ibkr', 'IBKR'],
			['degiro', 'DEGIRO'],
			['trading212', 'Trading 212'],
			['revolut', 'Revolut'],
			['other', 'Other broker (CSV)']
		]);
	});

	it('never offers csv for a named broker', () => {
		for (const b of BROKERS.filter((x) => x.id !== 'other')) {
			expect(b.methods).toEqual(['screenshot', 'ask-q']);
		}
	});

	it('offers csv first for other', () => {
		expect(BROKERS.find((b) => b.id === 'other')?.methods).toEqual(['csv', 'screenshot', 'ask-q']);
	});
});

describe('methodHref', () => {
	it('builds the three urls with a list id', () => {
		expect(methodHref('screenshot', 'a b&c')).toBe(
			'/portfolio/import/screenshot?portfolio_list_id=a%20b%26c'
		);
		expect(methodHref('csv', 'L1')).toBe('/onboarding/import/csv?portfolio_list_id=L1');
		expect(methodHref('ask-q', 'L1')).toBe('/assistant');
	});

	it('omits the param without a list id', () => {
		expect(methodHref('screenshot', null)).toBe('/portfolio/import/screenshot');
		expect(methodHref('csv', null)).toBe('/onboarding/import/csv');
		expect(methodHref('ask-q', null)).toBe('/assistant');
	});
});
