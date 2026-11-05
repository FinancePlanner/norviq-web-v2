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

/** Reads "1,5" and "1.5" as 1.5. Undefined for anything that is not a plain decimal. */
export function parseDecimal(raw: string): number | undefined {
	let s = raw.trim().replace(/[\s\u00a0']/g, '');
	if (s === '') return undefined;
	const comma = s.lastIndexOf(',');
	const dot = s.lastIndexOf('.');
	if (comma >= 0 && dot >= 0) {
		// "1.234,56" or "1,234.56": the later mark is the decimal point.
		const decimal = comma > dot ? ',' : '.';
		const group = decimal === ',' ? '.' : ',';
		s = s.split(group).join('').replace(decimal, '.');
	} else if (comma >= 0) {
		if (s.indexOf(',') !== comma) return undefined;
		s = s.replace(',', '.');
	}
	if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return undefined;
	const n = Number(s);
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

/** Why a kept row cannot be sent yet, or '' when it can. */
export function rowProblem(row: TradeRow): string {
	if (row.symbol.trim() === '') return 'Enter a symbol.';
	const quantity = parseDecimal(row.quantity);
	if (quantity === undefined || quantity <= 0) return 'Enter the number of shares.';
	const price = parseDecimal(row.price);
	if (price === undefined || price < 0) return 'Enter the price.';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(row.tradeDate)) return 'Enter the date.';
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
