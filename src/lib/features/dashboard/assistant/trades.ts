// The trades card's model: the stored record_trades arguments in, the reviewed
// rows out. What the card shows is what gets saved, so the confirm body is
// built from the rows exactly as they stand, never from the stored proposal.

export interface TradeIssue {
	code: string;
	message: string;
	blocking: boolean;
}

export interface TradeRow {
	symbol: string;
	side: 'buy' | 'sell';
	quantity: string;
	price: string;
	tradeDate: string;
	/** Absent when the model did not read one. */
	currency?: string;
	/** Absent when the model did not read one (it is told to leave fees out). */
	fees?: string;
	/** Absent when the model gave none. That is never high confidence. */
	confidence?: number;
	issues: TradeIssue[];
	keep: boolean;
}

export interface TradesProposal {
	portfolioListId: string;
	skippedRows: number;
	baseCurrency: string;
	synced: boolean;
	rows: TradeRow[];
}

/** One entry of a confirm 422's rowErrors. `index` is into the submitted trades. */
export interface RowError {
	index: number;
	code: string;
	message: string;
}

export interface ConfirmTrade {
	symbol: string;
	side: 'buy' | 'sell';
	quantity: number;
	price: number;
	tradeDate: string;
	currency?: string;
	fees?: number;
}

export const LOW_CONFIDENCE = 0.8;
export const TRADES_UPGRADE = 'Saving trades from a screenshot is part of Pro.';
export const SYNCED_COPY =
	'This portfolio syncs from IBKR, so saved trades would be overwritten. Pick another portfolio.';
export const ALREADY_RECORDED = 'already_recorded';

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

function text(v: unknown): string | undefined {
	if (typeof v === 'string') return v;
	if (typeof v === 'number' && Number.isFinite(v)) return formatDecimal(v);
	return undefined;
}

function readIssues(raw: unknown): TradeIssue[] {
	if (!Array.isArray(raw)) return [];
	const out: TradeIssue[] = [];
	for (const item of raw) {
		if (!isRecord(item)) continue;
		out.push({
			code: typeof item.code === 'string' ? item.code : '',
			message: typeof item.message === 'string' ? item.message : '',
			blocking: item.blocking === true
		});
	}
	return out;
}

function readRow(raw: unknown): TradeRow | null {
	if (!isRecord(raw)) return null;
	const symbol = text(raw.symbol);
	const quantity = text(raw.quantity);
	const price = text(raw.price);
	const tradeDate = text(raw.trade_date);
	if (symbol === undefined || quantity === undefined || price === undefined) return null;
	if (tradeDate === undefined) return null;
	if (raw.side !== 'buy' && raw.side !== 'sell') return null;
	const issues = readIssues(raw.issues);
	const recorded = issues.some((i) => i.code === ALREADY_RECORDED && i.blocking);
	return {
		symbol,
		side: raw.side,
		quantity,
		price,
		tradeDate,
		currency: text(raw.currency),
		fees: text(raw.fees),
		confidence:
			typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)
				? raw.confidence
				: undefined,
		issues,
		keep: !recorded
	};
}

/**
 * Reads the stored arguments of a record_trades action. Null when they cannot
 * be read, and ActionSlot then falls back to the plain card.
 */
export function parseTradesProposal(args: string): TradesProposal | null {
	let stored: unknown;
	try {
		stored = JSON.parse(args);
	} catch {
		return null;
	}
	if (!isRecord(stored) || typeof stored.portfolio_list_id !== 'string') return null;
	if (!Array.isArray(stored.trades) || stored.trades.length === 0) return null;
	const rows: TradeRow[] = [];
	for (const item of stored.trades) {
		const row = readRow(item);
		if (!row) return null;
		rows.push(row);
	}
	return {
		portfolioListId: stored.portfolio_list_id,
		skippedRows:
			typeof stored.skipped_rows === 'number' && stored.skipped_rows > 0
				? Math.floor(stored.skipped_rows)
				: 0,
		baseCurrency: typeof stored.base_currency === 'string' ? stored.base_currency : '',
		synced: stored.synced === true,
		rows
	};
}

/** One comma and exactly three digits after a non-zero integer part: 1.234 or 1234? */
const AMBIGUOUS_COMMA = /^[+-]?0*[1-9]\d*,\d{3}$/;
const PLAIN = /^(\d+|\d*[.,]\d+|\d+\.)$/;
// "1 234", "1,234,567.5", "1.234.567,5": groups of three after 1-3 digits, one kind of
// separator throughout, and a decimal part that uses the other mark.
const GROUPED = [
	/^([1-9]\d{0,2}(?:,\d{3})+)(?:\.(\d+))?$/,
	/^([1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d+))?$/,
	/^([1-9]\d{0,2}(?: \d{3})+)(?:,(\d+))?$/,
	/^([1-9]\d{0,2}(?:\u00a0\d{3})+)(?:,(\d+))?$/,
	/^([1-9]\d{0,2}(?:'\d{3})+)(?:[.,](\d+))?$/
];

/**
 * Reads a typed number, or says undefined. It accepts a short list of shapes and
 * nothing else, so it never guesses: "1,5" and "1.5" are 1.5, "1 234" and
 * "1,234,567" are grouped, and "1,234" is refused because it is 1.234 in one
 * country and 1234 in another. A single dot group ("1.000") stays a decimal,
 * because stored values use dots. Only the ends are trimmed, so "100 150.25"
 * pasted from two cells is judged as typed.
 */
export function parseDecimal(raw: string): number | undefined {
	const trimmed = raw.trim();
	const sign = /^[+-]/.test(trimmed) ? trimmed[0] : '';
	const body = sign ? trimmed.slice(1) : trimmed;
	if (body === '' || AMBIGUOUS_COMMA.test(body)) return undefined;
	let digits: string;
	if (PLAIN.test(body)) {
		digits = body.replace(',', '.');
	} else {
		const m = GROUPED.map((re) => re.exec(body)).find((x) => x !== null);
		if (!m) return undefined;
		digits = m[1].replace(/\D/g, '') + (m[2] ? '.' + m[2] : '');
	}
	const n = Number(sign + digits);
	return Number.isFinite(n) ? n : undefined;
}

/** A number as text without an exponent: 5e-7 is "0.0000005". */
export function formatDecimal(n: number): string {
	return n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
}

/**
 * What a cell will be saved as, when that differs from what the user typed.
 * Empty when the text is blank, unreadable, or already the saved value.
 */
export function savesAs(raw: string): string {
	if (raw.trim() === '') return '';
	const n = parseDecimal(raw);
	if (n === undefined) return '';
	const text = formatDecimal(n);
	return text === raw.trim() ? '' : text;
}

const SPACE_GROUP_DOT = /^[+-]?[1-9]\d{0,2}([ \u00a0]\d{3})+\.\d+$/;

/** "100 150.25": spaces group digits only before a comma decimal, so this may be two cells pasted together. */
export function spaceBeforeDotProblem(raw: string): string {
	return SPACE_GROUP_DOT.test(raw.trim())
		? 'Spaces and a decimal point do not go together here. Type it without the spaces.'
		: '';
}

/** Why a typed number was refused as unclear, or '' when that is not the reason. */
export const unclearNumberProblem = (raw: string): string =>
	ambiguousCommaProblem(raw) || spaceBeforeDotProblem(raw);

const THOUSANDS_LOOKALIKE = /^[1-9]\d{0,2}\.\d{3}$/;

/**
 * A hint under a numeric cell, or null. An edited cell that looks like a dot
 * thousands group ("1.234") gets a warning, because it saves as 1.234 and a
 * user whose country groups with dots may mean 1234. Fractional values are real,
 * so it is only a warning. A stored value (the cell as it came from the backend)
 * stays quiet. Otherwise it is the plain "Saves as <n>" when that differs from
 * what was typed.
 */
export function cellHint(
	raw: string,
	stored: string | undefined
): { text: string; warn: boolean } | null {
	const typed = raw.trim();
	if (typed !== (stored ?? '').trim() && THOUSANDS_LOOKALIKE.test(typed)) {
		const saved = formatDecimal(parseDecimal(typed) as number);
		return { text: `Saves as ${saved}, not ${typed.replace('.', '')}`, warn: true };
	}
	const text = savesAs(raw);
	return text ? { text: `Saves as ${text}`, warn: false } : null;
}

/** The message for a number refused as ambiguous ("1,234"), or '' when it is not that case. */
export function ambiguousCommaProblem(raw: string): string {
	const body = raw.trim().replace(/^[+-]/, '');
	if (!AMBIGUOUS_COMMA.test(raw.trim())) return '';
	const [whole, tail] = body.split(',');
	return `Is that ${Number(whole)}${tail} or ${Number(whole)}.${tail}? Type it without the comma.`;
}

/** True for a row the card flags: confidence below 0.8, or none at all. */
export function isLowConfidence(row: TradeRow): boolean {
	return row.confidence === undefined || row.confidence < LOW_CONFIDENCE;
}

export function canBeKept(row: TradeRow): boolean {
	return !row.issues.some((i) => i.code === ALREADY_RECORDED && i.blocking);
}

/** Copy for "<n> row(s) left out". Empty when nothing was left out. */
export function skippedRowsText(count: number): string {
	if (count <= 0) return '';
	const noun = count === 1 ? 'row' : 'rows';
	return `${count} ${noun} left out (options, shorts, dividends or fees).`;
}

/** The portfolio name in a summary like "Record 2 buys and 1 sell in Growth.". Empty when it does not fit. */
export function listNameFromSummary(summary: string): string {
	const m = /^Record .+? in (.+)\.$/.exec(summary.trim());
	return m ? m[1] : '';
}

/** True for a YYYY-MM-DD that exists on the calendar. */
function isRealDate(raw: string): boolean {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
	if (!m) return false;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const date = new Date(Date.UTC(y, mo - 1, d));
	return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Why a kept row cannot be sent yet, or '' when it can. */
export function rowProblem(row: TradeRow): string {
	if (row.symbol.trim() === '') return 'Enter a symbol.';
	const quantity = parseDecimal(row.quantity);
	if (quantity === undefined || quantity <= 0)
		return unclearNumberProblem(row.quantity) || 'Enter the number of shares.';
	const price = parseDecimal(row.price);
	if (price === undefined || price <= 0)
		return unclearNumberProblem(row.price) || 'Enter the price.';
	if (!isRealDate(row.tradeDate)) return 'Enter the date.';
	const fees = (row.fees ?? '').trim();
	if (fees !== '' && (parseDecimal(fees) ?? -1) < 0)
		return unclearNumberProblem(fees) || 'Fees must be a number, or blank.';
	return '';
}

/** The rows that would be sent, in order. */
export function keptRows(p: TradesProposal): TradeRow[] {
	return p.rows.filter((r) => r.keep && canBeKept(r));
}

/** Positions of the sent rows among p.rows: submitted index i is row keptIndexes(p)[i]. */
export function keptIndexes(p: TradesProposal): number[] {
	const out: number[] = [];
	p.rows.forEach((r, i) => {
		if (r.keep && canBeKept(r)) out.push(i);
	});
	return out;
}

/**
 * The confirm body: only kept rows, numbers parsed. A blank fees or currency is
 * left out, never sent as '' or 0.
 */
export function tradesConfirmBody(p: TradesProposal): {
	portfolioListId: string;
	trades: unknown[];
} {
	const trades = keptRows(p).map((row) => {
		const trade: ConfirmTrade = {
			symbol: row.symbol.trim(),
			side: row.side,
			quantity: parseDecimal(row.quantity) as number,
			price: parseDecimal(row.price) as number,
			tradeDate: row.tradeDate
		};
		const currency = (row.currency ?? '').trim();
		if (currency !== '') trade.currency = currency.toUpperCase();
		const fees = (row.fees ?? '').trim();
		if (fees !== '') trade.fees = parseDecimal(fees) as number;
		return trade;
	});
	return { portfolioListId: p.portfolioListId, trades };
}

/**
 * Maps a 422's rowErrors, which index the submitted array (kept rows only), back
 * to positions in p.rows. Errors that name no sent row come back in `unplaced`.
 */
export function placeRowErrors(
	p: TradesProposal,
	errors: RowError[]
): { byRow: Map<number, string[]>; unplaced: string[] } {
	const sent = keptIndexes(p);
	const byRow = new Map<number, string[]>();
	const unplaced: string[] = [];
	for (const e of errors) {
		const row = Number.isInteger(e.index) ? sent[e.index] : undefined;
		if (row === undefined) {
			unplaced.push(e.message);
			continue;
		}
		byRow.set(row, [...(byRow.get(row) ?? []), e.message]);
	}
	return { byRow, unplaced };
}
