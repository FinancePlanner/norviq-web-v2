// The holdings card's model: the stored update_holdings arguments in, the
// reviewed rows out. As on the trades card, what the card shows is what gets
// saved: the confirm body is built from the rows as they stand, never from the
// stored proposal. The shapes are proposedHoldings (the stored arguments) and
// reviewedHoldings (the confirm body) in the backend's assistant/holdings.go.
import {
	formatDecimal,
	isRealDate,
	parseDecimal,
	unclearNumberProblem,
	type RowError
} from './trades.js';

export interface HoldingRow {
	symbol: string;
	/** Text, so a half-typed number survives. Blank when the file had none. */
	shares: string;
	/** The average cost per share. Blank when the file had none. */
	avgPrice: string;
	/** YYYY-MM-DD, or blank. */
	buyDate: string;
	keep: boolean;
	/** What the portfolio holds of this symbol already: none, imported, manual or mixed. */
	existing: string;
	willReplaceImport: boolean;
}

export interface HoldingsReview {
	portfolioListId: string;
	fromCsv: boolean;
	rows: HoldingRow[];
}

/** One entry of a confirm 422's `rows`. `index` is into the submitted rows. */
export interface ConfirmHolding {
	symbol: string;
	shares?: number;
	avgPrice?: number;
	buyDate?: string;
}

export interface HoldingsConfirmBody {
	portfolioListId: string;
	replaceExisting: boolean;
	rows: ConfirmHolding[];
}

export const TOOL_NAME = 'update_holdings';
/** The backend's code for a 422 that asks for "Replace existing". */
export const HOLDINGS_COLLISION = 'holdings_collision';
export const HOLDINGS_FALLBACK = "Couldn't save these holdings. Try again.";
export const HOLDINGS_EXPIRED = 'This card expired. Send the file again.';
export const HOLDINGS_CLOSED =
	'Those holdings were not saved and this card is closed. Send the file again.';
export const HOLDINGS_MAYBE_SAVED =
	'This may have been saved. Check your portfolio before sending the file again.';
export const HOLDINGS_UPGRADE = 'Importing holdings from a file is part of Pro.';

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const numberText = (v: unknown): string =>
	typeof v === 'number' && Number.isFinite(v) ? formatDecimal(v) : '';

function readRow(raw: unknown): HoldingRow | null {
	if (!isRecord(raw) || typeof raw.symbol !== 'string') return null;
	return {
		symbol: raw.symbol,
		shares: numberText(raw.shares),
		avgPrice: numberText(raw.avgPrice),
		buyDate: typeof raw.buyDate === 'string' ? raw.buyDate : '',
		keep: true,
		existing: typeof raw.existing === 'string' ? raw.existing : 'none',
		willReplaceImport: raw.willReplaceImport === true
	};
}

/**
 * Reads a pending action as a holdings card. Null for another tool or for
 * arguments that cannot be read, and ActionSlot then falls back to the plain card.
 */
export function parseHoldingsAction(action: {
	toolName: string;
	arguments: string;
}): HoldingsReview | null {
	if (action.toolName !== TOOL_NAME) return null;
	let stored: unknown;
	try {
		stored = JSON.parse(action.arguments);
	} catch {
		return null;
	}
	if (!isRecord(stored) || typeof stored.portfolioListId !== 'string') return null;
	if (!Array.isArray(stored.rows) || stored.rows.length === 0) return null;
	const rows: HoldingRow[] = [];
	for (const item of stored.rows) {
		const row = readRow(item);
		if (!row) return null;
		rows.push(row);
	}
	return { portfolioListId: stored.portfolioListId, fromCsv: stored.fromCsv === true, rows };
}

/** The portfolio name in the summary "Save 2 holdings to Growth.". Empty when it does not fit. */
export function holdingsListNameFromSummary(summary: string): string {
	const m = /^Save .+? to (.+)\.$/.exec(summary.trim());
	return m ? m[1] : '';
}

/** Why a ticked row cannot be sent yet, or '' when it can. */
export function rowProblem(row: HoldingRow): string {
	if (row.symbol.trim() === '') return 'Enter a symbol.';
	const shares = parseDecimal(row.shares);
	if (shares === undefined || shares <= 0)
		return unclearNumberProblem(row.shares) || 'Enter the number of shares.';
	const cost = parseDecimal(row.avgPrice);
	if (cost === undefined || cost <= 0)
		return unclearNumberProblem(row.avgPrice) || 'Enter the average price.';
	const date = row.buyDate.trim();
	if (date !== '' && !isRealDate(date)) return 'Enter the date as YYYY-MM-DD, or leave it blank.';
	return '';
}

/** What saving this row does to what the portfolio holds already. */
export function rowBadge(row: HoldingRow): string {
	if (row.existing === 'imported' || row.willReplaceImport) return 'Replaces import';
	if (row.existing === 'manual' || row.existing === 'mixed') return 'Replaces existing';
	return 'New';
}

/**
 * The symbols a save would collide with: the ones a collision refusal named, or
 * else the ticked rows the preview found held by hand already.
 */
export function collidingSymbols(rows: HoldingRow[], refused: string[] = []): string[] {
	if (refused.length > 0) return refused;
	return rows
		.filter((r) => r.keep && (r.existing === 'manual' || r.existing === 'mixed'))
		.map((r) => r.symbol.trim().toUpperCase());
}

/** The switch's label: the screenshot import's wording when the symbols are known, else iOS's. */
export function replaceLabel(symbols: string[]): string {
	return symbols.length > 0
		? `Replace positions you already hold in ${symbols.join(', ')}. Without this, the import stops rather than leaving two rows for the same symbol.`
		: 'Replace existing';
}

/**
 * The confirm body holdings.go decodes (reviewedHoldings): the ticked rows with
 * numbers parsed and a blank date left out. `rows` is passed in so the card
 * sends its edited rows, and `portfolioListId` is the chosen portfolio.
 */
export function holdingsConfirmBody(
	review: HoldingsReview,
	rows: HoldingRow[],
	replaceExisting: boolean,
	portfolioListId: string = review.portfolioListId
): HoldingsConfirmBody {
	return {
		portfolioListId,
		replaceExisting,
		rows: rows
			.filter((r) => r.keep)
			.map((row) => {
				const holding: ConfirmHolding = {
					symbol: row.symbol.trim(),
					shares: parseDecimal(row.shares),
					avgPrice: parseDecimal(row.avgPrice)
				};
				const date = row.buyDate.trim();
				if (date !== '') holding.buyDate = date;
				return holding;
			})
	};
}

/** The backend's `reason`, or the fixed fallback. Never the `message` field, never undefined. */
export function refusalReason(body: unknown): string {
	const reason = isRecord(body) && typeof body.reason === 'string' ? body.reason.trim() : '';
	return reason || HOLDINGS_FALLBACK;
}

/**
 * Maps a 422's row errors, which index the submitted rows (ticked ones only),
 * back to positions in `rows`. Errors that name no sent row come back in `unplaced`.
 */
export function placeRowErrors(
	rows: HoldingRow[],
	errors: RowError[]
): { byRow: Map<number, string[]>; unplaced: string[] } {
	const sent: number[] = [];
	rows.forEach((r, i) => {
		if (r.keep) sent.push(i);
	});
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
