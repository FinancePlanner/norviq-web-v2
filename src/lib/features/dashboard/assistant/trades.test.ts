import { describe, expect, test } from 'vitest';
import {
	isLowConfidence,
	listNameFromSummary,
	parseDecimal,
	parseTradesProposal,
	rowProblem,
	placeRowErrors,
	skippedRowsText,
	SYNCED_COPY,
	tradesConfirmBody,
	type TradesProposal
} from './trades.js';

// The exact arguments the backend stores for one plain buy
// (TestProposalArgumentsShape): no currency, fees or confidence.
const SHAPE =
	'{"portfolio_list_id":"AAAAAAAA-1111-2222-3333-444444444444","skipped_rows":0,"base_currency":"USD","synced":false,' +
	'"trades":[{"symbol":"AAPL","side":"buy","quantity":1,"price":100.5,"trade_date":"2024-03-10","issues":[]}]}';

function args(trades: unknown[], extra: Record<string, unknown> = {}) {
	return JSON.stringify({
		portfolio_list_id: 'L1',
		skipped_rows: 0,
		base_currency: 'USD',
		synced: false,
		trades,
		...extra
	});
}
const row = (over: Record<string, unknown> = {}) => ({
	symbol: 'AAPL',
	side: 'buy',
	quantity: 2,
	price: 10,
	trade_date: '2024-03-10',
	currency: 'USD',
	fees: 1.5,
	confidence: 0.95,
	issues: [],
	...over
});

describe('parseTradesProposal', () => {
	test('reads the stored shape', () => {
		const p = parseTradesProposal(
			args([row(), row({ symbol: 'MSFT' })], { skipped_rows: 3, synced: true })
		)!;
		expect(p.portfolioListId).toBe('L1');
		expect(p.skippedRows).toBe(3);
		expect(p.synced).toBe(true);
		expect(p.baseCurrency).toBe('USD');
		expect(p.rows.map((r) => r.symbol)).toEqual(['AAPL', 'MSFT']);
		expect(p.rows[0]).toMatchObject({
			quantity: '2',
			price: '10',
			tradeDate: '2024-03-10',
			currency: 'USD',
			fees: '1.5',
			confidence: 0.95
		});
	});

	test('reads the backend row with currency, fees and confidence absent', () => {
		const p = parseTradesProposal(SHAPE)!;
		expect(p.rows).toHaveLength(1);
		const r = p.rows[0];
		expect(r).toMatchObject({ symbol: 'AAPL', side: 'buy', quantity: '1', price: '100.5' });
		expect(r.currency).toBeUndefined();
		expect(r.fees).toBeUndefined();
		expect(r.confidence).toBeUndefined();
		expect(r.keep).toBe(true);
	});

	test('tolerates null values the same as absent ones', () => {
		const p = parseTradesProposal(
			args([row({ currency: null, fees: null, confidence: null, issues: null })])
		)!;
		expect(p.rows[0].currency).toBeUndefined();
		expect(p.rows[0].fees).toBeUndefined();
		expect(p.rows[0].confidence).toBeUndefined();
		expect(p.rows[0].issues).toEqual([]);
	});

	test('already_recorded rows start unticked and cannot be kept', () => {
		const blocking = {
			code: 'already_recorded',
			message: 'Already in your history.',
			blocking: true
		};
		const p = parseTradesProposal(args([row({ issues: [blocking] }), row()]))!;
		expect(p.rows[0].keep).toBe(false);
		const body = tradesConfirmBody({ ...p, rows: [{ ...p.rows[0], keep: true }, p.rows[1]] });
		expect(body.trades).toHaveLength(1);
	});

	test('other rows start ticked, including warnings', () => {
		const warn = { code: 'unusual_price', message: 'Far from the market price.', blocking: false };
		const p = parseTradesProposal(args([row({ issues: [warn] }), row({ confidence: 0.2 })]))!;
		expect(p.rows.map((r) => r.keep)).toEqual([true, true]);
	});

	test('unreadable arguments give null', () => {
		expect(parseTradesProposal('not json')).toBeNull();
		expect(parseTradesProposal('{}')).toBeNull();
		expect(parseTradesProposal(args([]))).toBeNull();
		expect(parseTradesProposal(args([row({ side: 'hold' })]))).toBeNull();
		expect(parseTradesProposal(args([row({ symbol: null })]))).toBeNull();
	});
});

describe('confidence', () => {
	test('a row with no confidence is shown as low confidence', () => {
		const [absent] = parseTradesProposal(SHAPE)!.rows;
		expect(isLowConfidence(absent)).toBe(true);
	});
	test('0.8 and above is not flagged, below is', () => {
		const rows = parseTradesProposal(
			args([row({ confidence: 0.8 }), row({ confidence: 0.79 })])
		)!.rows;
		expect(rows.map(isLowConfidence)).toEqual([false, true]);
	});
});

describe('tradesConfirmBody', () => {
	const proposal = (): TradesProposal =>
		parseTradesProposal(args([row(), row({ symbol: 'MSFT' })]))!;

	test('sends only kept rows with parsed numbers', () => {
		const p = proposal();
		p.rows[0].keep = false;
		p.rows[1].quantity = '1,5';
		p.rows[1].price = '210.25';
		expect(tradesConfirmBody(p)).toEqual({
			portfolioListId: 'L1',
			trades: [
				{
					symbol: 'MSFT',
					side: 'buy',
					quantity: 1.5,
					price: 210.25,
					tradeDate: '2024-03-10',
					currency: 'USD',
					fees: 1.5
				}
			]
		});
	});

	test('a blank fees or currency is absent, never "" or 0', () => {
		const p = proposal();
		p.rows[0].fees = '';
		p.rows[0].currency = '  ';
		p.rows[1].fees = undefined;
		p.rows[1].currency = undefined;
		const body = JSON.parse(JSON.stringify(tradesConfirmBody(p)));
		for (const t of body.trades) {
			expect('fees' in t).toBe(false);
			expect('currency' in t).toBe(false);
		}
	});

	test('sends the list that is selected', () => {
		const p = proposal();
		p.portfolioListId = 'L2';
		expect(tradesConfirmBody(p).portfolioListId).toBe('L2');
	});
});

describe('placeRowErrors', () => {
	test('maps submitted indexes back past an unticked row', () => {
		const p = parseTradesProposal(args([row(), row({ symbol: 'MSFT' }), row({ symbol: 'NVDA' })]))!;
		p.rows[0].keep = false; // submitted: [MSFT, NVDA]
		const { byRow, unplaced } = placeRowErrors(p, [
			{ index: 1, code: 'bad', message: 'NVDA problem' }
		]);
		expect(byRow.get(2)).toEqual(['NVDA problem']);
		expect(byRow.has(1)).toBe(false);
		expect(unplaced).toEqual([]);
	});

	test('an index that names no sent row is not lost', () => {
		const p = parseTradesProposal(args([row()]))!;
		const { byRow, unplaced } = placeRowErrors(p, [{ index: 5, code: 'x', message: 'Elsewhere' }]);
		expect(byRow.size).toBe(0);
		expect(unplaced).toEqual(['Elsewhere']);
	});
});

describe('parseDecimal', () => {
	test('reads a decimal comma', () => {
		expect(parseDecimal('1,5')).toBe(1.5);
		expect(parseDecimal('1.5')).toBe(1.5);
		expect(parseDecimal(' 12 ')).toBe(12);
		expect(parseDecimal('1.234,56')).toBe(1234.56);
		expect(parseDecimal('1,234.56')).toBe(1234.56);
	});
	test('empty and non-numbers are undefined', () => {
		expect(parseDecimal('')).toBeUndefined();
		expect(parseDecimal('  ')).toBeUndefined();
		expect(parseDecimal('abc')).toBeUndefined();
		expect(parseDecimal('1,2,3')).toBeUndefined();
		expect(parseDecimal('1e5')).toBeUndefined();
	});
});

describe('skippedRowsText', () => {
	test('is singular-safe', () => {
		expect(skippedRowsText(0)).toBe('');
		expect(skippedRowsText(1)).toBe('1 row left out (options, shorts, dividends or fees).');
		expect(skippedRowsText(2)).toBe('2 rows left out (options, shorts, dividends or fees).');
	});
});

test('the IBKR refusal copy is the backend wording', () => {
	expect(SYNCED_COPY).toBe(
		'This portfolio syncs from IBKR, so saved trades would be overwritten. Pick another portfolio.'
	);
});

describe('parseDecimal never writes a wrong number', () => {
	test('one comma and exactly three digits is ambiguous, unless the integer part is 0', () => {
		for (const raw of ['1,234', '1,000', '12,345', '999,999']) {
			expect(parseDecimal(raw), raw).toBeUndefined();
		}
		expect(parseDecimal('0,123')).toBe(0.123);
		expect(parseDecimal('1,23')).toBe(1.23);
		expect(parseDecimal('1,2345')).toBe(1.2345);
	});
	test('both marks need proper groups and a decimal part', () => {
		for (const raw of ['1,2.3', '1.2.3,4', '12,34.5', '1.234.56,7', '1,234,567', '1,234.5,6']) {
			expect(parseDecimal(raw), raw).toBeUndefined();
		}
		expect(parseDecimal('1.234,56')).toBe(1234.56);
		expect(parseDecimal('1,234.56')).toBe(1234.56);
		expect(parseDecimal('1.234.567,5')).toBe(1234567.5);
		expect(parseDecimal('1,234,567.5')).toBe(1234567.5);
	});
	test('dots are plain decimals because stored values use them', () => {
		expect(parseDecimal('1.000')).toBe(1);
		expect(parseDecimal('100.5')).toBe(100.5);
		expect(parseDecimal('1.2.3')).toBeUndefined();
	});
	test('a row with an ambiguous cell cannot be saved', () => {
		const p = parseTradesProposal(args([row({ quantity: '1,234', price: '1,500' })]))!;
		expect(rowProblem(p.rows[0])).not.toBe('');
	});
});

describe('rowProblem', () => {
	const ok = () => parseTradesProposal(args([row()]))!.rows[0];
	test('a clean row has no problem', () => expect(rowProblem(ok())).toBe(''));
	test('price must be above zero, like the backend', () => {
		expect(rowProblem({ ...ok(), price: '0' })).not.toBe('');
		expect(rowProblem({ ...ok(), price: '-1' })).not.toBe('');
	});
	test('a date must be a real calendar date', () => {
		for (const d of ['2026-13-45', '2026-02-30', '2026-00-10']) {
			expect(rowProblem({ ...ok(), tradeDate: d }), d).not.toBe('');
		}
		expect(rowProblem({ ...ok(), tradeDate: '2024-02-29' })).toBe('');
	});
});

test('listNameFromSummary reads the list out of the backend summary', () => {
	expect(listNameFromSummary('Record 1 buy in Main.')).toBe('Main');
	expect(listNameFromSummary('Record 2 buys and 1 sell in My IBKR in EUR.')).toBe('My IBKR in EUR');
	expect(listNameFromSummary('something else')).toBe('');
});
