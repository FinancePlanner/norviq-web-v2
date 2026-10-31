import {
	DASH,
	compact,
	compactCurrency,
	currency,
	currencySymbol,
	inputNumber,
	number,
	percent,
	wholeShares
} from '#lib/format.js';
import {
	Cadence,
	SuggestionState,
	type AutobuyFormVM,
	type AutobuyResponse,
	type AutobuyVM,
	type AutobuysListResponse,
	type AutobuysVM,
	type CreateFormVM,
	type FooterVM,
	type RowVM,
	type ShareFactsSuggestion,
	type SuggestionVM,
	type TerminalPositionResponse,
	type TerminalPositionsSummaryResponse,
	type TerminalScenarioSuggestion
} from './types.js';

// Ports of norviq-web internal/handlers/terminal_map.go, the formatting half of
// terminal_ai.go and internal/pages/terminal/{vm,autobuys}.go. Every number is
// computed by the backend; this only formats. Client-safe (no server imports).

export const TERMINAL_TITLE = 'Terminal position sizing';
export const TERMINAL_SUBTITLE =
	'Decide the future market cap and share count. Norviq tells you how many shares that target is.';
export const TERMINAL_DISCLAIMER =
	'Terminal prices are your assumptions, not forecasts. Not financial advice.';

export const TERMINAL_UNAVAILABLE = 'Terminal sizing is unavailable right now. Try again shortly.';
export const TERMINAL_SAVE_FAILED = 'Could not save that. Try again.';
export const TERMINAL_GONE = 'That item no longer exists. Reload the page.';
export const TERMINAL_TICKER_PROBLEM = 'Use a ticker like AMZN or BRK.B.';

// The sample row is the spec's worked example: shown, never stored.
export const SAMPLE_TICKER = 'AMZN';
export const SAMPLE_TERMINAL_SHARE_COUNT = 11e9;
export const SAMPLE_TERMINAL_MARKET_CAP = 10e12;
export const SAMPLE_VALUE_WANTED = 1e6;
export const SAMPLE_CREATE_VALS: Record<string, string> = {
	ticker: 'AMZN',
	terminalShareCount: '11000000000',
	terminalMarketCap: '10000000000000',
	valueWanted: '1000000'
};

const TICKER_PATTERN = /^[A-Z0-9.-]{1,12}$/;

/** normalizeTerminalTicker: trimmed, upper case, and whether it passes the backend rule. */
export function normalizeTerminalTicker(raw: string | null | undefined): [string, boolean] {
	const ticker = (raw ?? '').trim().toUpperCase();
	return [ticker, TICKER_PATTERN.test(ticker)];
}

/** The PATCH-able numeric cells, in the Go order (terminalNumberFields). */
export const TERMINAL_NUMBER_FIELDS = [
	{ name: 'sharesOutstanding', label: 'Shares outstanding', nullable: true },
	{ name: 'terminalShareCount', label: 'Terminal share count', nullable: false },
	{ name: 'terminalMarketCap', label: 'Terminal market cap', nullable: false },
	{ name: 'valueWanted', label: 'Value wanted', nullable: false },
	{ name: 'sharesOwned', label: 'Shares owned', nullable: false },
	{ name: 'currentSharePrice', label: 'Current share price', nullable: true }
] as const;

export type TerminalField = 'ticker' | (typeof TERMINAL_NUMBER_FIELDS)[number]['name'];

function optionalInput(v: number | null | undefined): string {
	return v == null ? '' : inputNumber(v);
}

function optionalCompact(v: number | null | undefined): string {
	return v == null ? '' : compact(v);
}

function clampPct(v: number): number {
	if (Number.isNaN(v) || v < 0) return 0;
	return Math.min(v, 100);
}

/** scenarioErrorCopy explains the backend's TerminalScenarioError raw values. */
export function scenarioErrorCopy(code: string): string {
	switch (code) {
		case 'share_count_not_positive':
			return 'Terminal share count must be above zero.';
		case 'market_cap_not_positive':
			return 'Terminal market cap must be above zero.';
		case 'invalid_number':
			return "Check the numbers: values can't be negative, and this combination is too large to calculate.";
		default:
			return 'This scenario cannot be calculated. Check its numbers.';
	}
}

function emptyRow(): RowVM {
	return {
		id: '',
		ticker: '',
		currency: '',
		currencySymbol: '',
		isFirst: false,
		isLast: false,
		isSample: false,
		isPro: false,
		sharesOutstanding: '',
		terminalShareCount: '',
		terminalMarketCap: '',
		valueWanted: '',
		sharesOwned: '',
		currentSharePrice: '',
		sharesOutstandingCompact: '',
		terminalShareCountCompact: '',
		terminalMarketCapCompact: '',
		valueWantedCompact: '',
		valid: false,
		terminalSharePrice: '',
		sharesNeeded: '',
		sharesNeededWhole: '',
		progressPct: 0,
		progressLabel: '',
		stillNeeded: '',
		stillNeededWhole: '',
		gapValueAtTerminal: '',
		capitalAtTodayPrice: '',
		scenarioError: '',
		fieldError: ''
	};
}

function markUncomputed(row: RowVM): RowVM {
	row.valid = false;
	row.terminalSharePrice = DASH;
	row.sharesNeeded = DASH;
	row.sharesNeededWhole = DASH;
	row.progressLabel = DASH;
	row.stillNeeded = DASH;
	row.stillNeededWhole = DASH;
	row.gapValueAtTerminal = DASH;
	return row;
}

/** terminalRowVM formats one backend row; it never computes a derived value. */
export function terminalRowVM(p: TerminalPositionResponse, code: string, isPro: boolean): RowVM {
	const row: RowVM = {
		...emptyRow(),
		id: String(p.id).toLowerCase(), // uuid.UUID formats lower case in Go
		ticker: p.ticker,
		currency: code,
		currencySymbol: currencySymbol(code),
		isPro,
		sharesOutstanding: optionalInput(p.sharesOutstanding),
		terminalShareCount: inputNumber(p.terminalShareCount),
		terminalMarketCap: inputNumber(p.terminalMarketCap),
		valueWanted: inputNumber(p.valueWanted),
		sharesOwned: inputNumber(p.sharesOwned),
		currentSharePrice: optionalInput(p.currentSharePrice),
		sharesOutstandingCompact: optionalCompact(p.sharesOutstanding),
		terminalShareCountCompact: compact(p.terminalShareCount),
		terminalMarketCapCompact: compactCurrency(p.terminalMarketCap, code),
		valueWantedCompact: compactCurrency(p.valueWanted, code)
	};
	if (p.scenarioError) {
		row.scenarioError = scenarioErrorCopy(p.scenarioError);
		return markUncomputed(row);
	}
	if (
		p.terminalSharePrice == null ||
		p.sharesNeeded == null ||
		p.progress == null ||
		p.sharesStillNeeded == null ||
		p.gapValueAtTerminal == null
	) {
		row.scenarioError = scenarioErrorCopy('');
		return markUncomputed(row);
	}
	row.valid = true;
	row.terminalSharePrice = currency(p.terminalSharePrice, code);
	row.sharesNeeded = number(p.sharesNeeded, 2);
	row.sharesNeededWhole = number(wholeShares(p.sharesNeeded), 0);
	row.progressPct = clampPct(p.progress * 100);
	row.progressLabel = percent(p.progress);
	row.stillNeeded = number(p.sharesStillNeeded, 2);
	row.stillNeededWhole = number(wholeShares(p.sharesStillNeeded), 0);
	row.gapValueAtTerminal = currency(p.gapValueAtTerminal, code);
	if (p.capitalAtTodayPrice != null)
		row.capitalAtTodayPrice = currency(p.capitalAtTodayPrice, code);
	return row;
}

/** terminalRowsVM formats the backend's rows, in the backend's order. */
export function terminalRowsVM(
	positions: TerminalPositionResponse[],
	code: string,
	isPro: boolean
): RowVM[] {
	return positions.map((p, i) => ({
		...terminalRowVM(p, code, isPro),
		isFirst: i === 0,
		isLast: i === positions.length - 1
	}));
}

/** terminalFooterVM formats the summary's three totals. */
export function terminalFooterVM(s: TerminalPositionsSummaryResponse): FooterVM {
	const footer: FooterVM = {
		visible: s.positionCount > 0,
		totalValueWanted: currency(s.totalValueWanted, s.currency),
		totalStillNeeded: currency(s.totalGapValueAtTerminal, s.currency),
		totalCapitalToday: DASH,
		pricedNote: 'Add a current price to a row to see this.'
	};
	if (s.totalCapitalAtTodayPrice != null) {
		footer.totalCapitalToday = currency(s.totalCapitalAtTodayPrice, s.currency);
		footer.pricedNote = `${s.pricedPositionCount} of ${s.positionCount} rows have a price`;
	}
	return footer;
}

/** The zero FooterVM Go renders when the summary failed (hidden). */
export const emptyFooter: FooterVM = {
	visible: false,
	totalValueWanted: '',
	totalStillNeeded: '',
	totalCapitalToday: '',
	pricedNote: ''
};

/** terminalSampleRow: the empty-state example, written out as copy. */
export function terminalSampleRow(code: string): RowVM {
	const symbol = currencySymbol(code);
	return {
		...emptyRow(),
		id: 'sample',
		ticker: SAMPLE_TICKER,
		currencySymbol: symbol,
		isSample: true,
		valid: true,
		sharesOutstandingCompact: DASH,
		terminalShareCountCompact: compact(SAMPLE_TERMINAL_SHARE_COUNT),
		terminalMarketCapCompact: compactCurrency(SAMPLE_TERMINAL_MARKET_CAP, code),
		valueWantedCompact: compactCurrency(SAMPLE_VALUE_WANTED, code),
		terminalSharePrice: symbol + '909.09',
		sharesNeeded: '1,100',
		sharesNeededWhole: '1,100',
		sharesOwned: '0',
		progressLabel: '0%',
		stillNeeded: '1,100',
		stillNeededWhole: '1,100',
		gapValueAtTerminal: compactCurrency(SAMPLE_VALUE_WANTED, code)
	};
}

export function newCreateForm(ticker: string, idempotencyKey: string): CreateFormVM {
	return {
		open: ticker !== '',
		ticker,
		terminalShareCount: '',
		terminalMarketCap: '',
		valueWanted: '',
		sharesOwned: '',
		idempotencyKey,
		error: ''
	};
}

// ---------------------------------------------------------------------------
// Autobuys

export function isKnownCadence(c: string): boolean {
	return (Object.values(Cadence) as string[]).includes(c);
}

export function cadenceLabel(cadence: string, pct: number | null | undefined): string {
	switch (cadence) {
		case Cadence.Weekly:
			return 'Weekly';
		case Cadence.Biweekly:
			return 'Every two weeks';
		case Cadence.Bimonthly:
			return 'Every two months';
		case Cadence.Monthly:
			return 'Monthly';
		case Cadence.Percent:
			if (pct == null) return 'Percent of monthly base';
			return number(pct * 100, 2) + '% of monthly base';
		default:
			return 'Other';
	}
}

/** percentInput renders a stored ratio (0.04) as the percent the form edits ("4"). */
export function percentInput(ratio: number): string {
	return inputNumber(Math.round(ratio * 1e6) / 1e4);
}

export function emptyAutobuyForm(): AutobuyFormVM {
	return {
		id: '',
		label: '',
		ticker: '',
		amount: '',
		cadence: '',
		percent: '',
		idempotencyKey: '',
		error: ''
	};
}

function terminalAutobuyVM(a: AutobuyResponse, code: string): AutobuyVM {
	const cadence = String(a.cadence);
	const item: AutobuyVM = {
		id: String(a.id).toLowerCase(),
		label: a.label,
		ticker: a.ticker ?? '',
		amount: inputNumber(a.amount),
		amountLabel: currency(a.amount, code),
		cadence,
		cadenceLabel: cadenceLabel(cadence, a.percent),
		percent: a.percent != null ? percentInput(a.percent) : '',
		monthlyEquivalent: DASH,
		active: a.active,
		needsBase: false
	};
	if (a.monthlyEquivalent != null) item.monthlyEquivalent = currency(a.monthlyEquivalent, code);
	else if (cadence === Cadence.Percent) item.needsBase = true;
	return item;
}

/** terminalAutobuysVM formats the panel; the monthly figures come from the backend. */
export function terminalAutobuysVM(l: AutobuysListResponse, idempotencyKey: string): AutobuysVM {
	return {
		items: (l.autobuys ?? []).map((a) => terminalAutobuyVM(a, l.currency)),
		monthlyTotal: currency(l.monthlyTotal, l.currency),
		currencySymbol: currencySymbol(l.currency),
		form: { ...emptyAutobuyForm(), cadence: Cadence.Monthly, idempotencyKey },
		editingID: '',
		editForm: null,
		notice: '',
		loadError: false
	};
}

export const autobuysUnavailable = (): AutobuysVM => ({
	items: [],
	monthlyTotal: '',
	currencySymbol: '',
	form: emptyAutobuyForm(),
	editingID: '',
	editForm: null,
	notice: '',
	loadError: true
});

/** AutobuysVM.FormFor: the rejected values when that item's save failed, else the item as stored. */
export function autobuyFormFor(vm: AutobuysVM, item: AutobuyVM): AutobuyFormVM {
	if (vm.editingID === item.id && vm.editForm) return vm.editForm;
	return {
		...emptyAutobuyForm(),
		id: item.id,
		label: item.label,
		ticker: item.ticker,
		amount: item.amount,
		cadence: item.cadence,
		percent: item.percent
	};
}

export interface AutobuyChip {
	label: string;
	name: string;
	amount: string;
	cadence: string;
	percent: string;
}

/** AutobuyChips: the spec's three examples, in the user's currency. */
export function autobuyChips(symbol: string): AutobuyChip[] {
	return [
		{ label: '401k 4%', name: '401k', amount: '', cadence: Cadence.Percent, percent: '4' },
		{
			label: symbol + '50 weekly',
			name: 'Weekly buy',
			amount: '50',
			cadence: Cadence.Weekly,
			percent: ''
		},
		{
			label: symbol + '275 every two months',
			name: 'Every two months',
			amount: '275',
			cadence: Cadence.Bimonthly,
			percent: ''
		}
	];
}

export const cadenceOptions = [
	{ value: Cadence.Weekly, label: 'Weekly' },
	{ value: Cadence.Biweekly, label: 'Every two weeks' },
	{ value: Cadence.Monthly, label: 'Monthly' },
	{ value: Cadence.Bimonthly, label: 'Every two months' },
	{ value: Cadence.Percent, label: 'Percent of a monthly base' }
];

export function autobuyFormID(id: string): string {
	return id === '' ? 'terminal-autobuy-add' : 'terminal-autobuy-form-' + id;
}

// ---------------------------------------------------------------------------
// AI suggestions (terminal_ai.go)

export function newSuggestion(rowID: string, kind: string, ticker: string): SuggestionVM {
	return {
		rowID,
		kind,
		ticker,
		state: '',
		heading: '',
		lines: [],
		rationale: '',
		asOf: '',
		sources: [],
		acceptVals: null,
		notes: [],
		message: ''
	};
}

export function setSuggestionUnavailable(vm: SuggestionVM) {
	vm.state = SuggestionState.Unavailable;
	vm.message = 'AI lookup unavailable. Enter the numbers yourself, or try again later.';
}

export function setSuggestionUnusable(vm: SuggestionVM) {
	vm.state = SuggestionState.Unusable;
	vm.message =
		'The AI lookup did not return usable numbers for ' + vm.ticker + '. Enter them yourself.';
}

/** currencyCode returns raw as an upper-case three-letter code, or "". */
export function currencyCode(raw: string | null | undefined): string {
	const code = (raw ?? '').trim().toUpperCase();
	return /^[A-Z]{3}$/.test(code) ? code : '';
}

function positiveFinite(v: number | null | undefined): v is number {
	return typeof v === 'number' && v > 0 && Number.isFinite(v);
}

/** httpsSources keeps only absolute https links: an AI answer is untrusted text. */
export function httpsSources(input: string[] | null | undefined): string[] {
	const out: string[] = [];
	for (const raw of input ?? []) {
		try {
			const u = new URL(raw.trim());
			if (u.protocol === 'https:' && u.host) out.push(u.toString());
		} catch {
			/* dropped */
		}
	}
	return out;
}

export function shareFactsSuggestionVM(
	vm: SuggestionVM,
	s: ShareFactsSuggestion,
	symbol: string,
	tableCurrency: string
) {
	let suggested = '';
	if (s.currency && s.currency.trim() !== '') {
		symbol = currencySymbol(s.currency);
		suggested = currencyCode(s.currency);
	}
	const foreignPrice = suggested !== '' && tableCurrency !== '' && suggested !== tableCurrency;
	const accept: Record<string, string> = {};
	if (positiveFinite(s.sharesOutstanding)) {
		vm.lines.push({
			label: 'Shares outstanding',
			value: compact(s.sharesOutstanding) + ' (' + number(s.sharesOutstanding, 0) + ')'
		});
		accept.sharesOutstanding = inputNumber(s.sharesOutstanding);
	}
	if (positiveFinite(s.currentSharePrice)) {
		vm.lines.push({
			label: 'Current share price',
			value: symbol + currency(s.currentSharePrice, '')
		});
		if (foreignPrice)
			vm.notes.push(
				'Price found in ' +
					suggested +
					'; your table uses ' +
					tableCurrency +
					'. Enter it converted.'
			);
		else accept.currentSharePrice = inputNumber(s.currentSharePrice);
	}
	if (vm.lines.length === 0) {
		setSuggestionUnusable(vm);
		return;
	}
	vm.state = SuggestionState.Ready;
	vm.heading = 'Suggested facts for ' + vm.ticker;
	if (s.asOf) vm.asOf = s.asOf.trim();
	vm.sources = httpsSources(s.sources);
	if (Object.keys(accept).length > 0) vm.acceptVals = accept;
}

export function scenarioSuggestionVM(
	vm: SuggestionVM,
	s: TerminalScenarioSuggestion,
	symbol: string
) {
	if (!positiveFinite(s.terminalShareCount) || !positiveFinite(s.terminalMarketCap)) {
		setSuggestionUnusable(vm);
		return;
	}
	vm.state = SuggestionState.Ready;
	vm.heading = `Suggested scenario for ${vm.ticker} over ${s.horizonYears} years`;
	vm.lines = [
		{ label: 'Terminal share count', value: compact(s.terminalShareCount) },
		{ label: 'Terminal market cap', value: symbol + compact(s.terminalMarketCap) }
	];
	vm.rationale = (s.rationale ?? '').trim();
	vm.sources = httpsSources(s.sources);
	vm.acceptVals = {
		terminalShareCount: inputNumber(s.terminalShareCount),
		terminalMarketCap: inputNumber(s.terminalMarketCap)
	};
}

// ---------------------------------------------------------------------------
// assets/terminal.js

const UNITS: [number, string][] = [
	[1e12, 'T'],
	[1e9, 'B'],
	[1e6, 'M'],
	[1e3, 'K']
];

/**
 * compactLabel approximates format.CompactCurrency for the moment between
 * blur and the server's answer, which replaces it (terminal.js).
 */
export function compactLabel(raw: unknown, symbol = ''): string {
	const text = String(raw ?? '').trim();
	if (text === '') return '';
	const n = Number(text.replace(/[\s,$€£¥]/g, ''));
	if (!Number.isFinite(n)) return text;
	const sign = n < 0 ? '-' : '';
	const abs = Math.abs(n);
	for (const [size, suffix] of UNITS) {
		if (abs >= size) return sign + symbol + String(Math.round((abs / size) * 100) / 100) + suffix;
	}
	return sign + symbol + String(Math.round(abs * 100) / 100);
}
