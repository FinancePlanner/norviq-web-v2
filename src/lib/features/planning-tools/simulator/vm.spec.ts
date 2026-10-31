// Ports of norviq-web internal/pages/simulator/preview_test.go, plus the
// form parsing of internal/handlers/simulator.go.
import { describe, expect, it } from 'vitest';
import {
	cashBasisPoints,
	diffSentiment,
	errBadCapital,
	errBadWeight,
	isOverAllocated,
	money,
	parseSimulatorForm,
	percent,
	quantity,
	simulatorUpsertRequest,
	weightValue
} from './vm.js';

const legs = (...bp: number[]) => ({
	legs: bp.map((targetBasisPoints, i) => ({ symbol: 'S' + i, targetBasisPoints }))
});

function form(entries: [string, string][]): FormData {
	const fd = new FormData();
	for (const [k, v] of entries) fd.append(k, v);
	return fd;
}

describe('simulator draft', () => {
	it('holds the unclaimed remainder as cash', () => {
		expect(cashBasisPoints(legs(3000, 2000))).toBe(5000);
		expect(isOverAllocated(legs(3000, 2000))).toBe(false);
	});

	it('holds no cash when fully allocated', () => {
		expect(cashBasisPoints(legs(10000))).toBe(0);
		expect(isOverAllocated(legs(10000))).toBe(false);
	});

	it('flags over-allocation and never goes negative on cash', () => {
		expect(isOverAllocated(legs(6000, 5000))).toBe(true);
		expect(cashBasisPoints(legs(6000, 5000))).toBe(0);
	});

	it('follows the delta for the diff sentiment', () => {
		expect(diffSentiment({ currentBasisPoints: 1000, targetBasisPoints: 2000 })).toBe('positive');
		expect(diffSentiment({ currentBasisPoints: 2000, targetBasisPoints: 1000 })).toBe('negative');
		expect(diffSentiment({ currentBasisPoints: 1500, targetBasisPoints: 1500 })).toBe('');
	});

	it('renders basis points, money and quantities', () => {
		expect(percent(3000)).toBe('30.00%');
		expect(percent(50)).toBe('0.50%');
		expect(money(257.5, 'usd')).toBe('USD 257.50');
		expect(quantity(41)).toBe('41');
		expect(quantity(0.12345)).toBe('0.1235');
		expect(weightValue(0)).toBe('');
		expect(weightValue(2550)).toBe('25.5');
	});
});

describe('parseSimulatorForm', () => {
	it('keeps blank rows, upper-cases symbols and converts weights to basis points', () => {
		const { draft, error } = parseSimulatorForm(
			form([
				['name', ''],
				['targetCapital', '25000'],
				['baseCurrency', 'eur'],
				['symbol', ' nvda '],
				['weight', '30'],
				['symbol', ''],
				['weight', '']
			])
		);
		expect(error).toBe('');
		expect(draft.name).toBe('Untitled simulation');
		expect(draft.baseCurrency).toBe('EUR');
		expect(draft.mode).toBe('fromScratch');
		expect(draft.legs).toEqual([
			{ symbol: 'NVDA', targetBasisPoints: 3000 },
			{ symbol: '', targetBasisPoints: 0 }
		]);
		expect(simulatorUpsertRequest(draft).legs).toEqual([
			{ symbol: 'NVDA', targetBasisPoints: 3000 }
		]);
	});

	it('clones when a source portfolio is picked', () => {
		const { draft } = parseSimulatorForm(
			form([
				['targetCapital', '1'],
				['sourcePortfolioId', 'P1']
			])
		);
		expect(draft.mode).toBe('cloneCurrentPortfolio');
		expect(draft.legs).toHaveLength(3);
	});

	it('rejects a missing capital and negative weights', () => {
		expect(parseSimulatorForm(form([['targetCapital', '']])).error).toBe(errBadCapital);
		expect(
			parseSimulatorForm(
				form([
					['targetCapital', '10'],
					['symbol', 'A'],
					['weight', '-1']
				])
			).error
		).toBe(errBadWeight);
	});

	it('sends no legs as null, like a nil Go slice', () => {
		const { draft } = parseSimulatorForm(form([['targetCapital', '10']]));
		expect(simulatorUpsertRequest(draft).legs).toBeNull();
	});
});
