// Port of norviq-web internal/pages/simulator/viewmodel.go and the pure parts
// of internal/handlers/simulator.go (form parsing, request and result
// mapping). Client-safe: no server imports.
import { formatFloat, goRound } from '#lib/format.js';
import { goParseFloat } from '../planning/vm.js';
import {
	SimulationModeCloneCurrentPortfolio,
	SimulationModeFromScratch,
	type PortfolioSimulation,
	type PortfolioSimulationResult,
	type PortfolioSimulationUpsertRequest
} from './types.js';

/** maxSimulatorRows caps what one form can submit. */
export const maxSimulatorRows = 250;

export interface PortfolioOption {
	id: string;
	name: string;
}

export interface LegViewModel {
	symbol: string;
	targetBasisPoints: number;
}

export interface DraftViewModel {
	name: string;
	mode: string;
	sourcePortfolioId: string;
	baseCurrency: string;
	targetCapital: number;
	fractionalSharesEnabled: boolean;
	legs: LegViewModel[];
}

export interface TradeViewModel {
	symbol: string;
	side: string;
	quantity: number;
	price: number;
	notional: number;
	fee: number;
}

export interface DiffViewModel {
	symbol: string;
	currentBasisPoints: number;
	targetBasisPoints: number;
	currentValue: number;
	targetValue: number;
}

export interface ResultViewModel {
	currency: string;
	totalCashNeeded: number;
	leftoverCash: number;
	cashBasisPoints: number;
	trades: TradeViewModel[];
	diff: DiffViewModel[];
	warnings: string[];
	/** Whether whole-share rounding was in play (why leftover is usually non-zero). */
	wholeShares: boolean;
}

export interface PageViewModel {
	/** What the form renders, so a rejected submission keeps the user's input. */
	draft: DraftViewModel;
	saved: PortfolioSimulation[];
	result: ResultViewModel | null;
	error: string;
	notice: string;
	portfolios: PortfolioOption[];
	selectedID: string;
	hasPositions: boolean;
}

/**
 * What an action answers. `scope: 'result'` is Go's renderSimulatorResult
 * (HTMX swapped #simulator-result only); `'page'` is renderSimulator (the whole
 * page: add-row and save).
 */
export interface SimulatorActionData {
	vm: PageViewModel;
	scope: 'result' | 'page';
}

const emptyLeg = (): LegViewModel => ({ symbol: '', targetBasisPoints: 0 });

/** NewDraft: three empty rows. */
export function newDraft(currency: string): DraftViewModel {
	return {
		name: 'Untitled simulation',
		mode: SimulationModeFromScratch,
		sourcePortfolioId: '',
		baseCurrency: currency,
		targetCapital: 10000,
		fractionalSharesEnabled: false,
		legs: [emptyLeg(), emptyLeg(), emptyLeg()]
	};
}

export const addLeg = (draft: DraftViewModel) => draft.legs.push(emptyLeg());

/** ClaimedBasisPoints: what the legs add up to. */
export const claimedBasisPoints = (d: Pick<DraftViewModel, 'legs'>) =>
	d.legs.reduce((sum, leg) => sum + leg.targetBasisPoints, 0);

/** CashBasisPoints: the unclaimed remainder, held as cash; never negative. */
export function cashBasisPoints(d: Pick<DraftViewModel, 'legs'>): number {
	const claimed = claimedBasisPoints(d);
	return claimed >= 10000 ? 0 : 10000 - claimed;
}

/** IsOverAllocated: the one weight state that blocks a simulation. */
export const isOverAllocated = (d: Pick<DraftViewModel, 'legs'>) => claimedBasisPoints(d) > 10000;

export const isCloning = (d: Pick<DraftViewModel, 'mode'>) =>
	d.mode === SimulationModeCloneCurrentPortfolio;

export const isBuy = (t: Pick<TradeViewModel, 'side'>) => t.side === 'buy';

/** DeltaBasisPoints: positive when the simulation wants more of a position. */
export const deltaBasisPoints = (
	d: Pick<DiffViewModel, 'currentBasisPoints' | 'targetBasisPoints'>
) => d.targetBasisPoints - d.currentBasisPoints;

export function diffSentiment(
	d: Pick<DiffViewModel, 'currentBasisPoints' | 'targetBasisPoints'>
): 'positive' | 'negative' | '' {
	const delta = deltaBasisPoints(d);
	if (delta > 0) return 'positive';
	if (delta < 0) return 'negative';
	return '';
}

/** Percent: basis points as "%.2f%%". */
export const percent = (basisPoints: number) => formatFloat(basisPoints / 100, 2) + '%';

/** Money: "USD 12.50". */
export const money = (value: number, currency: string) =>
	`${currency.toUpperCase()} ${formatFloat(value, 2)}`;

/** Quantity: whole numbers bare, else four decimals. */
export const quantity = (value: number) =>
	Number.isInteger(value) ? formatFloat(value, 0) : formatFloat(value, 4);

/** weightValue: basis points as the percentage the form edits; blank for an unset row. */
export const weightValue = (basisPoints: number) =>
	basisPoints === 0 ? '' : formatFloat(basisPoints / 100, -1);

export const capitalValue = (capital: number) => formatFloat(capital, -1);

// ---------------------------------------------------------------------------
// handlers/simulator.go + simulator_errors.go

export const errBadSimulatorForm = 'Could not read the simulation form.';
export const errBadCapital = 'Enter the amount of capital you would deploy.';
export const errBadWeight = 'Weights must be positive percentages.';

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');

/**
 * parseSimulatorForm: the paired symbol/weight rows. Blank rows are kept as
 * empty legs rather than rejected. On error the partial draft comes back too
 * (Go returned it alongside the error), though the handler drops it.
 */
export function parseSimulatorForm(form: FormData): { draft: DraftViewModel; error: string } {
	const draft: DraftViewModel = {
		name: str(form.get('name')).trim(),
		mode: SimulationModeFromScratch,
		sourcePortfolioId: str(form.get('sourcePortfolioId')).trim(),
		baseCurrency: str(form.get('baseCurrency')).trim().toUpperCase(),
		targetCapital: 0,
		fractionalSharesEnabled: str(form.get('fractionalShares')) !== '',
		legs: []
	};
	if (draft.name === '') draft.name = 'Untitled simulation';
	if (draft.baseCurrency === '') draft.baseCurrency = 'USD';
	if (draft.sourcePortfolioId !== '') draft.mode = SimulationModeCloneCurrentPortfolio;

	const capital = goParseFloat(str(form.get('targetCapital')).trim());
	if (capital === null || capital < 0) return { draft, error: errBadCapital };
	draft.targetCapital = capital;

	const symbols = form.getAll('symbol').map(str).slice(0, maxSimulatorRows);
	const weights = form.getAll('weight').map(str);
	for (let index = 0; index < symbols.length; index++) {
		const symbol = symbols[index].trim().toUpperCase();
		const rawWeight = index < weights.length ? weights[index].trim() : '';
		if (symbol === '' && rawWeight === '') {
			draft.legs.push(emptyLeg());
			continue;
		}
		let basisPoints = 0;
		if (rawWeight !== '') {
			const pct = goParseFloat(rawWeight);
			if (pct === null || pct < 0) return { draft, error: errBadWeight };
			basisPoints = goRound(pct * 100);
		}
		draft.legs.push({ symbol, targetBasisPoints: basisPoints });
	}
	if (draft.legs.length === 0) draft.legs = [emptyLeg(), emptyLeg(), emptyLeg()];
	return { draft, error: '' };
}

/** simulatorUpsertRequest: only legs with a symbol and a positive weight go out. */
export function simulatorUpsertRequest(draft: DraftViewModel): PortfolioSimulationUpsertRequest {
	const legs = draft.legs
		.filter((leg) => leg.symbol !== '' && leg.targetBasisPoints > 0)
		.map((leg) => ({ symbol: leg.symbol, targetBasisPoints: leg.targetBasisPoints }));
	return {
		name: draft.name,
		mode: draft.mode,
		...(draft.sourcePortfolioId ? { sourcePortfolioId: draft.sourcePortfolioId } : {}),
		baseCurrency: draft.baseCurrency,
		targetCapital: draft.targetCapital,
		fractionalSharesEnabled: draft.fractionalSharesEnabled,
		legs: legs.length > 0 ? legs : null
	};
}

/** simulatorResultViewModel */
export function simulatorResultViewModel(
	result: PortfolioSimulationResult,
	draft: DraftViewModel
): ResultViewModel {
	return {
		currency: result.simulation?.baseCurrency || draft.baseCurrency,
		totalCashNeeded: result.totalCashNeeded,
		leftoverCash: result.leftoverCash,
		cashBasisPoints: result.cashBasisPoints,
		wholeShares: !draft.fractionalSharesEnabled,
		trades: (result.simulation?.trades ?? []).map((trade) => ({
			symbol: trade.symbol,
			side: trade.side,
			quantity: trade.quantity,
			price: trade.price,
			notional: trade.notional,
			fee: trade.estimatedFee
		})),
		// The diff only tells a story when there is a real portfolio behind it.
		diff: isCloning(draft)
			? (result.diff ?? []).map((row) => ({
					symbol: row.symbol,
					currentBasisPoints: row.currentBasisPoints,
					targetBasisPoints: row.targetBasisPoints,
					currentValue: row.currentValue,
					targetValue: row.targetValue
				}))
			: [],
		warnings: (result.warnings ?? []).map((w) => w.message)
	};
}
