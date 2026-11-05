import { describe, expect, test } from 'vitest';
import {
	isLowConfidence,
	ambiguousCommaProblem,
	formatDecimal,
	listNameFromSummary,
	cellHint,
	savesAs,
	spaceBeforeDotProblem,
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
		for (const raw of ['1,2.3', '1.2.3,4', '12,34.5', '1.234.56,7', '1,234.5,6']) {
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

describe('parseDecimal is a whitelist', () => {
	const NBSP = '\u00a0';
	// Every input the reviewer showed being read wrongly.
	const refused = [
		'100\t150.25',
		'1 5',
		'12 34',
		"1'5",
		'1 2 3',
		'1,234 5',
		'01,234',
		'001,500',
		'0.123,45',
		'0,123.45',
		'1,234',
		'12,345',
		'1,000',
		'999,999',
		'1e3',
		'Infinity',
		'NaN',
		'\uff11\uff12\uff13',
		'',
		'  ',
		'abc',
		'1,2,3',
		'1.2.3',
		'1,234.5,6',
		`1${NBSP}5`,
		'1  234',
		'12 3456',
		'1.234.5',
		'--1',
		'1,',
		',',
		'.',
		'1 234 56'
	];
	test.each(refused)('refuses %j', (raw) => expect(parseDecimal(raw)).toBeUndefined());

	const accepted: [string, number][] = [
		['1 234', 1234],
		["1'234", 1234],
		[`1${NBSP}234`, 1234],
		['.5', 0.5],
		['5.', 5],
		[',5', 0.5],
		['0,123', 0.123],
		['00,123', 0.123],
		['1,5', 1.5],
		['12,34', 12.34],
		['1.234,56', 1234.56],
		['1,234.56', 1234.56],
		['1,234,567', 1234567],
		['1.234.567', 1234567],
		['1.000', 1],
		['1.234', 1.234],
		['100.5', 100.5],
		['007', 7],
		['1 234,5', 1234.5],
		["1'234.5", 1234.5],
		['1,234,567.5', 1234567.5],
		[' 12 ', 12],
		['-5', -5]
	];
	test.each(accepted)('reads %j as %d', (raw, n) => expect(parseDecimal(raw)).toBe(n));

	// R20: spaces group digits only before a comma decimal. A space group followed by a dot
	// may be two pasted cells, so it is refused with its own message.
	test('a space or NBSP group followed by a dot decimal is refused', () => {
		for (const raw of ['100 150.25', `100${NBSP}150.25`, '1 234.5']) {
			expect(parseDecimal(raw), raw).toBeUndefined();
			expect(spaceBeforeDotProblem(raw), raw).toContain('Type it without the spaces');
		}
		expect(savesAs('100 150.25')).toBe('');
	});
	test('the locales that group with spaces, apostrophes or commas keep working', () => {
		expect(parseDecimal('1 234,56')).toBe(1234.56);
		expect(parseDecimal(`1${NBSP}234,56`)).toBe(1234.56);
		expect(parseDecimal("1'234.56")).toBe(1234.56);
		expect(parseDecimal('1 234')).toBe(1234);
		expect(spaceBeforeDotProblem('1 234,56')).toBe('');
		expect(spaceBeforeDotProblem('100.5')).toBe('');
	});
	test('rowProblem says why', () => {
		const base = parseTradesProposal(args([row()]))!.rows[0];
		expect(rowProblem({ ...base, price: '100 150.25' })).toContain('Type it without the spaces');
	});
});

describe('ambiguousCommaProblem', () => {
	test('says why, with both readings', () => {
		expect(ambiguousCommaProblem('1,234')).toBe(
			'Is that 1234 or 1.234? Type it without the comma.'
		);
		expect(ambiguousCommaProblem('01,500')).toBe(
			'Is that 1500 or 1.500? Type it without the comma.'
		);
	});
	test('is empty for everything else', () => {
		for (const raw of ['0,123', '1,5', '1.234', '', 'abc', '1,234.5']) {
			expect(ambiguousCommaProblem(raw), raw).toBe('');
		}
	});
	test('rowProblem uses it on shares, price and fees', () => {
		const base = parseTradesProposal(args([row()]))!.rows[0];
		for (const field of ['quantity', 'price', 'fees'] as const) {
			const msg = rowProblem({ ...base, [field]: '1,234' });
			expect(msg, field).toContain('Is that 1234 or 1.234?');
		}
	});
});

describe('savesAs', () => {
	test('shows what will be sent only when it differs from what was typed', () => {
		expect(savesAs('1.000')).toBe('1');
		expect(savesAs('1,5')).toBe('1.5');
		expect(savesAs('.5')).toBe('0.5');
		expect(savesAs('1 234')).toBe('1234');
		expect(savesAs('100.5')).toBe('');
		expect(savesAs('12')).toBe('');
		expect(savesAs(' 12 ')).toBe('');
	});
	test('is empty for blank and unreadable text', () => {
		expect(savesAs('')).toBe('');
		expect(savesAs('abc')).toBe('');
		expect(savesAs('1,234')).toBe('');
	});
});

describe('formatDecimal', () => {
	test('never uses an exponent', () => {
		expect(formatDecimal(5e-7)).toBe('0.0000005');
		expect(formatDecimal(1e21)).toBe('1000000000000000000000');
		expect(formatDecimal(1.5)).toBe('1.5');
		expect(formatDecimal(100)).toBe('100');
	});
	test('a stored 5e-7 reads back and can be saved', () => {
		const p = parseTradesProposal(args([row({ quantity: 5e-7 })]))!;
		expect(p.rows[0].quantity).toBe('0.0000005');
		expect(rowProblem(p.rows[0])).toBe('');
		expect(tradesConfirmBody(p).trades[0]).toMatchObject({ quantity: 5e-7 });
	});
});

describe('cellHint', () => {
	test('an edited cell that looks like a dot thousands group is warned about', () => {
		for (const raw of ['1.234', '12.345', '999.999']) {
			expect(cellHint(raw, '5')).toEqual({
				text: `Saves as ${raw}, not ${raw.replace('.', '')}`,
				warn: true
			});
		}
		expect(cellHint('1.234', '5')?.text).toBe('Saves as 1.234, not 1234');
	});
	test.each([
		['1.000', 'Saves as 1, not 1000'],
		['1.500', 'Saves as 1.5, not 1500'],
		['10.000', 'Saves as 10, not 10000'],
		['100.000', 'Saves as 100, not 100000'],
		['1.050', 'Saves as 1.05, not 1050'],
		['999.999', 'Saves as 999.999, not 999999'],
		['1.234', 'Saves as 1.234, not 1234']
	])('the warning for %s names the saved value', (raw, text) => {
		expect(cellHint(raw, '5')).toEqual({ text, warn: true });
	});
	test('a stored 1.234 shows nothing until it is edited', () => {
		expect(cellHint('1.234', '1.234')).toBeNull();
		expect(cellHint(' 1.234 ', '1.234')).toBeNull();
		expect(cellHint('999.999', '999.999')).toBeNull();
		expect(cellHint('1.234', undefined)?.warn).toBe(true);
	});
	test('other shapes are not warned about', () => {
		for (const raw of ['0.123', '1.23', '1.2345', '1234.567', '100']) {
			expect(cellHint(raw, '5'), raw).toBeNull();
		}
	});
	test('otherwise it is the plain saves-as line', () => {
		expect(cellHint('1,5', '5')).toEqual({ text: 'Saves as 1.5', warn: false });
		expect(cellHint('1.50', '5')).toEqual({ text: 'Saves as 1.5', warn: false });
		// 1.000 looks like a dot thousands group, so it is the warning, not the plain line.
		expect(cellHint('1.000', '5')).toEqual({ text: 'Saves as 1, not 1000', warn: true });
	});
});
