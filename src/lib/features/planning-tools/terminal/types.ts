// Backend shapes (norviq-web internal/api/terminalapi, generated from the
// terminal spec) and the view models of internal/pages/terminal. Client-safe.

export interface TerminalPositionResponse {
	id: string;
	ticker: string;
	sortOrder: number;
	terminalShareCount: number;
	terminalMarketCap: number;
	valueWanted: number;
	sharesOwned: number;
	sharesOutstanding?: number | null;
	currentSharePrice?: number | null;
	notes?: string | null;
	terminalSharePrice?: number | null;
	sharesNeeded?: number | null;
	progress?: number | null;
	sharesStillNeeded?: number | null;
	gapValueAtTerminal?: number | null;
	capitalAtTodayPrice?: number | null;
	scenarioError?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface TerminalPositionsListResponse {
	currency: string;
	positions: TerminalPositionResponse[];
}

export interface TerminalPositionsSummaryResponse {
	currency: string;
	monthlyAutobuyTotal: number;
	positionCount: number;
	pricedPositionCount: number;
	topPositions: TerminalPositionResponse[];
	totalCapitalAtTodayPrice?: number | null;
	totalGapValueAtTerminal: number;
	totalValueWanted: number;
}

export interface AutobuyResponse {
	id: string;
	label: string;
	amount: number;
	cadence: string;
	active: boolean;
	monthlyEquivalent?: number | null;
	percent?: number | null;
	ticker?: string | null;
}

export interface AutobuysListResponse {
	autobuys: AutobuyResponse[];
	currency: string;
	monthlyTotal: number;
}

export interface ShareFactsSuggestion {
	ticker: string;
	asOf?: string | null;
	currency?: string | null;
	currentSharePrice?: number | null;
	sharesOutstanding?: number | null;
	sources: string[] | null;
}

export interface TerminalScenarioSuggestion {
	ticker: string;
	horizonYears: number;
	rationale: string;
	sources: string[] | null;
	terminalMarketCap: number;
	terminalShareCount: number;
}

// ---------------------------------------------------------------------------
// View models (internal/pages/terminal/vm.go, ai_vm.go, autobuys.go)

export interface TerminalCopy {
	title: string;
	subtitle: string;
	disclaimer: string;
}

export interface RowVM {
	id: string;
	ticker: string;
	currency: string;
	currencySymbol: string;
	isFirst: boolean;
	isLast: boolean;
	isSample: boolean;
	isPro: boolean;

	sharesOutstanding: string;
	terminalShareCount: string;
	terminalMarketCap: string;
	valueWanted: string;
	sharesOwned: string;
	currentSharePrice: string;

	sharesOutstandingCompact: string;
	terminalShareCountCompact: string;
	terminalMarketCapCompact: string;
	valueWantedCompact: string;

	valid: boolean;
	terminalSharePrice: string;
	sharesNeeded: string;
	sharesNeededWhole: string;
	progressPct: number;
	progressLabel: string;
	stillNeeded: string;
	stillNeededWhole: string;
	gapValueAtTerminal: string;
	capitalAtTodayPrice: string;

	scenarioError: string;
	fieldError: string;
}

export interface FooterVM {
	visible: boolean;
	totalValueWanted: string;
	totalStillNeeded: string;
	totalCapitalToday: string;
	pricedNote: string;
}

export interface CreateFormVM {
	open: boolean;
	ticker: string;
	terminalShareCount: string;
	terminalMarketCap: string;
	valueWanted: string;
	sharesOwned: string;
	idempotencyKey: string;
	error: string;
}

/** The region row actions re-render (Workspace): create form, table, footer. */
export interface WorkspaceVM {
	loadError: boolean;
	currency: string;
	currencySymbol: string;
	rows: RowVM[];
	footer: FooterVM;
	showSample: boolean;
	sample: RowVM | null;
	create: CreateFormVM;
	notice: string;
	isPro: boolean;
}

/** One cell edit (or AI Accept): RowEditVM, as data instead of oob slots. */
export type RowEditResult =
	| {
			kind: 'edit';
			row: RowVM;
			fields: string[];
			clearSuggestion: boolean;
			footer: FooterVM | null;
	  }
	// Confirmed absent (deleted elsewhere): the row is removed.
	| { kind: 'gone' }
	// The re-read failed: nothing changes (HX-Reswap: none, empty body).
	| { kind: 'unknown' };

export const SuggestionState = {
	Ready: 'ready',
	Upgrade: 'upgrade',
	Unavailable: 'unavailable',
	Unusable: 'unusable',
	Invalid: 'invalid'
} as const;

export interface SuggestionLine {
	label: string;
	value: string;
}

export interface SuggestionVM {
	rowID: string;
	kind: string;
	ticker: string;
	state: string;
	heading: string;
	lines: SuggestionLine[];
	rationale: string;
	asOf: string;
	sources: string[];
	/** The PATCH form values Accept sends; null when nothing can be applied. */
	acceptVals: Record<string, string> | null;
	notes: string[];
	message: string;
}

/** An AI lookup answer: a suggestion, or the in-place AI consent card. */
export type SuggestionResult =
	{ kind: 'suggestion'; vm: SuggestionVM } | { kind: 'consent'; next: string };

export const Cadence = {
	Weekly: 'weekly',
	Biweekly: 'biweekly',
	Bimonthly: 'bimonthly',
	Monthly: 'monthly',
	Percent: 'percentOfContribution'
} as const;

export interface AutobuyVM {
	id: string;
	label: string;
	ticker: string;
	amount: string;
	amountLabel: string;
	cadence: string;
	cadenceLabel: string;
	percent: string;
	monthlyEquivalent: string;
	active: boolean;
	needsBase: boolean;
}

export interface AutobuyFormVM {
	id: string;
	label: string;
	ticker: string;
	amount: string;
	cadence: string;
	percent: string;
	idempotencyKey: string;
	error: string;
}

export interface AutobuysVM {
	items: AutobuyVM[];
	monthlyTotal: string;
	currencySymbol: string;
	form: AutobuyFormVM;
	editingID: string;
	editForm: AutobuyFormVM | null;
	notice: string;
	loadError: boolean;
}

export interface TerminalPageVM extends WorkspaceVM {
	copy: TerminalCopy;
	autobuys: AutobuysVM;
}
