import { describe, expect, test } from 'vitest';
import {
	HOLDINGS_FALLBACK,
	collidingSymbols,
	holdingsConfirmBody,
	holdingsListNameFromSummary,
	parseHoldingsAction,
	placeRowErrors,
	refusalReason,
	replaceLabel,
	rowBadge,
	rowProblem,
	type HoldingsReview
} from './holdings.js';

// The pending action the backend stores for a two-row card (proposedHoldings in
// internal/features/assistant/holdings.go): one new row and one the user holds.
const ARGUMENTS =
	'{"portfolioListId":"AAAAAAAA-1111-2222-3333-444444444444","fromCsv":false,"rows":[' +
	'{"symbol":"AAPL","shares":10,"avgPrice":150,"buyDate":null,"existing":"none","willReplaceImport":false,"needsCost":false},' +
	'{"symbol":"MSFT","shares":5,"avgPrice":null,"buyDate":"2024-03-10","existing":"manual","willReplaceImport":false,"needsCost":true}]}';

const action = (args: string = ARGUMENTS, toolName = 'update_holdings') => ({
	toolName,
	arguments: args
});

function review(): HoldingsReview {
	return parseHoldingsAction(action())!;
}

describe('parseHoldingsAction', () => {
	test('reads the stored shape', () => {
		const r = review();
		expect(r.portfolioListId).toBe('AAAAAAAA-1111-2222-3333-444444444444');
		expect(r.fromCsv).toBe(false);
		expect(r.rows).toEqual([
			{
				symbol: 'AAPL',
				shares: '10',
				avgPrice: '150',
				buyDate: '',
				keep: true,
				existing: 'none',
				willReplaceImport: false
			},
			{
				symbol: 'MSFT',
				shares: '5',
				avgPrice: '',
				buyDate: '2024-03-10',
				keep: true,
				existing: 'manual',
				willReplaceImport: false
			}
		]);
	});

	test('is null for another tool, unreadable arguments or no rows', () => {
		expect(parseHoldingsAction(action(ARGUMENTS, 'record_trades'))).toBeNull();
		expect(parseHoldingsAction(action('???'))).toBeNull();
		expect(parseHoldingsAction(action('{"portfolioListId":"L","rows":[]}'))).toBeNull();
		expect(parseHoldingsAction(action('{"rows":[{"symbol":"A"}]}'))).toBeNull();
		expect(parseHoldingsAction(action('{"portfolioListId":"L","rows":[{"shares":1}]}'))).toBeNull();
	});
});

describe('holdingsConfirmBody', () => {
	test('is the body holdings.go decodes: list, replaceExisting and parsed rows', () => {
		const r = review();
		r.rows[1].avgPrice = '300,5';
		expect(holdingsConfirmBody(r, r.rows, true)).toEqual({
			portfolioListId: 'AAAAAAAA-1111-2222-3333-444444444444',
			replaceExisting: true,
			rows: [
				{ symbol: 'AAPL', shares: 10, avgPrice: 150 },
				{ symbol: 'MSFT', shares: 5, avgPrice: 300.5, buyDate: '2024-03-10' }
			]
		});
	});

	test('sends only ticked rows and the chosen portfolio, and trims symbols', () => {
		const r = review();
		r.rows[0].keep = false;
		r.rows[1].avgPrice = '1';
		r.rows[1].symbol = ' msft ';
		const body = holdingsConfirmBody(r, r.rows, false, 'L2');
		expect(body.portfolioListId).toBe('L2');
		expect(body.replaceExisting).toBe(false);
		expect(body.rows).toEqual([{ symbol: 'msft', shares: 5, avgPrice: 1, buyDate: '2024-03-10' }]);
	});
});

describe('refusalReason', () => {
	test('reads reason', () => {
		expect(refusalReason({ reason: 'X' })).toBe('X');
	});
	test('falls back, never undefined and never the message field', () => {
		expect(HOLDINGS_FALLBACK).toBe("Couldn't save these holdings. Try again.");
		expect(refusalReason({ message: 'Y' })).toBe(HOLDINGS_FALLBACK);
		expect(refusalReason({ reason: '  ' })).toBe(HOLDINGS_FALLBACK);
		expect(refusalReason({})).toBe(HOLDINGS_FALLBACK);
		expect(refusalReason(null)).toBe(HOLDINGS_FALLBACK);
		expect(refusalReason(undefined)).toBe(HOLDINGS_FALLBACK);
	});
});

describe('rowProblem', () => {
	test('flags what iOS flags', () => {
		const [aapl, msft] = review().rows;
		expect(rowProblem(aapl)).toBe('');
		expect(rowProblem(msft)).toBe('Enter the average price.');
		expect(rowProblem({ ...aapl, symbol: ' ' })).toBe('Enter a symbol.');
		expect(rowProblem({ ...aapl, shares: '0' })).toBe('Enter the number of shares.');
		expect(rowProblem({ ...aapl, shares: '1,234' })).toContain('Type it without the comma');
		expect(rowProblem({ ...aapl, buyDate: '2024-02-31' })).toBe(
			'Enter the date as YYYY-MM-DD, or leave it blank.'
		);
	});
});

describe('replacing what is already held', () => {
	test('names the symbols held already, from the rows or from a collision refusal', () => {
		expect(collidingSymbols(review().rows)).toEqual(['MSFT']);
		expect(collidingSymbols(review().rows, ['AAPL'])).toEqual(['AAPL']);
	});

	test('uses the screenshot import wording when symbols are known, else the iOS label', () => {
		expect(replaceLabel(['MSFT', 'NVDA'])).toBe(
			'Replace positions you already hold in MSFT, NVDA. Without this, the import stops rather than leaving two rows for the same symbol.'
		);
		expect(replaceLabel([])).toBe('Replace existing');
	});

	test('badges follow iOS', () => {
		const [aapl, msft] = review().rows;
		expect(rowBadge(aapl)).toBe('New');
		expect(rowBadge(msft)).toBe('Replaces existing');
		expect(rowBadge({ ...aapl, existing: 'imported' })).toBe('Replaces import');
		expect(rowBadge({ ...aapl, willReplaceImport: true })).toBe('Replaces import');
	});
});

test('holdingsListNameFromSummary reads the destination from "Save 2 holdings to Main."', () => {
	expect(holdingsListNameFromSummary('Save 2 holdings to Growth fund.')).toBe('Growth fund');
	expect(holdingsListNameFromSummary('Something else')).toBe('');
});

test('placeRowErrors maps sent indexes back to rows, skipping unticked ones', () => {
	const r = review();
	r.rows[0].keep = false;
	const out = placeRowErrors(r.rows, [
		{ index: 0, code: '', message: 'On MSFT.' },
		{ index: 5, code: '', message: 'Nowhere.' }
	]);
	expect(out.byRow.get(1)).toEqual(['On MSFT.']);
	expect(out.unplaced).toEqual(['Nowhere.']);
});
