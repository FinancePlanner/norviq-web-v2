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
export const SYNCED_COPY =
	'This portfolio syncs from IBKR, so saved trades would be overwritten. Pick another portfolio.';
export const ALREADY_RECORDED = 'already_recorded';

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

function text(v: unknown): string | undefined {
	if (typeof v === 'string') return v;
	if (typeof v === 'number' && Number.isFinite(v)) return String(v);
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

/**
 * Reads "1,5" and "1.5" as 1.5. Undefined for anything that is not a plain
 * decimal, and for anything that could be read two ways: "1,234" is 1.234 in
 * one country and 1234 in another, so it is refused rather than guessed.
 * Dots are never refused as groups, because stored values use them ("1.000" is 1).
 */
export function parseDecimal(raw: string): number | undefined {
	const s = raw.trim().replace(/[\s\u00a0']/g, '');
	if (s === '') return undefined;
	const sign = /^[+-]/.test(s) ? s[0] : '';
	const body = sign ? s.slice(1) : s;
	const hasComma = body.includes(',');
	const hasDot = body.includes('.');
	let digits: string;
	if (hasComma && hasDot) {
		// "1.234,56" or "1,234.56": thousands groups of three, then the decimal part.
		const decimal = body.lastIndexOf(',') > body.lastIndexOf('.') ? ',' : '.';
		const group = decimal === ',' ? '.' : ',';
		const g = '\\' + group;
		const d = '\\' + decimal;
		if (!new RegExp(`^\\d{1,3}(${g}\\d{3})+${d}\\d+$`).test(body)) return undefined;
		digits = body.split(group).join('').replace(decimal, '.');
	} else if (hasComma) {
		if (!/^\d*,\d+$/.test(body)) return undefined;
		if (/^[1-9]\d*,\d{3}$/.test(body)) return undefined;
		digits = body.replace(',', '.');
	} else {
		digits = body;
	}
	if (!/^(\d+\.?\d*|\.\d+)$/.test(digits)) return undefined;
	const n = Number(sign + digits);
	return Number.isFinite(n) ? n : undefined;
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
	if (quantity === undefined || quantity <= 0) return 'Enter the number of shares.';
	const price = parseDecimal(row.price);
	if (price === undefined || price <= 0) return 'Enter the price.';
	if (!isRealDate(row.tradeDate)) return 'Enter the date.';
	const fees = (row.fees ?? '').trim();
	if (fees !== '' && (parseDecimal(fees) ?? -1) < 0) return 'Fees must be a number, or blank.';
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
