// The two lazy cards on the stock overview. Go fetched each as an hx-get
// fragment (StockPressure, StockTerminal) backed by one backend call; v2 reads
// that call through the /api/v1 proxy and maps it here (client-safe).

import type { components } from '#lib/api/schema.js';
import { formatFloat, number as formatNumber, currency as formatMoneyIn, percent as formatPercentRatio } from '#lib/format.js';
import type { PressureVM, TerminalCardVM } from './detail.js';

type S = components['schemas'];

/** compactVolume (stock_pressure.go). */
export function compactVolume(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1e9) return formatFloat(value / 1e9, 1) + 'B';
	if (abs >= 1e6) return formatFloat(value / 1e6, 1) + 'M';
	if (abs >= 1e3) return formatFloat(value / 1e3, 1) + 'K';
	return formatFloat(value, 0);
}

/** mapPressure (stock_pressure.go). */
export function mapPressure(data: S['MarketPressureResponse']): PressureVM {
	const volume = data.volume as { relative: number; today: number; average30d: number; changePct: number };
	const vm: PressureVM = {
		symbol: data.symbol,
		temperature: data.temperature,
		label: data.label,
		relative: volume.relative,
		todayVolume: compactVolume(volume.today),
		avgVolume: compactVolume(volume.average30d),
		changePct: volume.changePct,
		asOf: data.asOf,
		history: [],
		insider: null
	};
	for (const point of data.history as { date: string; relativeVolume: number }[]) {
		let height = Math.round((Math.min(point.relativeVolume, 3) / 3) * 100);
		if (height < 4) height = 4;
		vm.history.push({ date: point.date, relative: point.relativeVolume, heightPct: height });
	}
	const insider = data.insider as
		| {
				windowDays: number;
				buyCount: number;
				sellCount: number;
				netShares: number;
				notable: { name: string; role?: string | null; side: string; shares: number; date: string }[];
		  }
		| null
		| undefined;
	if (insider) {
		vm.insider = {
			windowDays: insider.windowDays,
			buys: insider.buyCount,
			sells: insider.sellCount,
			netShares: compactVolume(Math.abs(insider.netShares)),
			netSelling: insider.netShares < 0,
			notable: (insider.notable ?? []).map((t) => ({
				name: t.name,
				role: t.role ?? '',
				side: String(t.side),
				shares: compactVolume(t.shares),
				date: t.date
			}))
		};
	}
	return vm;
}

export function pressureChipClass(temperature: number): string {
	if (temperature < 40) return 'pressure-chip-cold';
	if (temperature < 60) return 'pressure-chip-neutral';
	return 'pressure-chip-hot';
}

export function pressureBarClass(relative: number): string {
	if (relative >= 1.5) return 'pressure-bar-hot';
	if (relative <= 0.7) return 'pressure-bar-low';
	return 'pressure-bar-mid';
}

/** fmt "%+.2f%%". */
export function signedPct2(v: number): string {
	const s = formatFloat(v, 2);
	return (s.startsWith('-') ? s : '+' + s) + '%';
}

// --- terminal (stock_terminal.go + terminal_map.go terminalRowVM) ---------

const terminalTickerPattern = /^[A-Z0-9.-]{1,12}$/;

/** normalizeTerminalTicker. */
export function normalizeTerminalTicker(raw: string): [string, boolean] {
	const ticker = raw.trim().toUpperCase();
	return [ticker, terminalTickerPattern.test(ticker)];
}

export function terminalCardBase(rawSymbol: string): TerminalCardVM {
	const [symbol, ok] = normalizeTerminalTicker(rawSymbol);
	return {
		symbol,
		unavailable: !ok,
		hasScenario: false,
		terminalSharePrice: '',
		sharesNeeded: '',
		progressLabel: '',
		progressPct: 0,
		scenarioError: '',
		addHref: '/terminal?ticker=' + encodeURIComponent(symbol).replace(/%20/g, '+')
	};
}

function scenarioErrorCopy(code: string): string {
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

function clampPct(v: number): number {
	if (Number.isNaN(v) || v < 0) return 0;
	return Math.min(v, 100);
}

type TerminalPosition = {
	scenarioError?: string | null;
	terminalSharePrice?: number | null;
	sharesNeeded?: number | null;
	progress?: number | null;
	sharesStillNeeded?: number | null;
	gapValueAtTerminal?: number | null;
};

/** loadStockTerminalCard: the first scenario for the ticker, or the invitation to add one. */
export function mapTerminalCard(base: TerminalCardVM, resp: { positions: TerminalPosition[]; currency: string } | null): TerminalCardVM {
	if (base.unavailable) return base;
	if (!resp) return { ...base, unavailable: true };
	if (resp.positions.length === 0) return base;
	const p = resp.positions[0];
	const vm: TerminalCardVM = { ...base, hasScenario: true };
	const dash = '—';
	if (p.scenarioError) {
		return { ...vm, scenarioError: scenarioErrorCopy(p.scenarioError), terminalSharePrice: dash, sharesNeeded: dash, progressLabel: dash };
	}
	if (p.terminalSharePrice == null || p.sharesNeeded == null || p.progress == null || p.sharesStillNeeded == null || p.gapValueAtTerminal == null) {
		return { ...vm, scenarioError: scenarioErrorCopy(''), terminalSharePrice: dash, sharesNeeded: dash, progressLabel: dash };
	}
	vm.terminalSharePrice = formatMoneyIn(p.terminalSharePrice, resp.currency);
	vm.sharesNeeded = formatNumber(p.sharesNeeded, 2);
	vm.progressPct = clampPct(p.progress * 100);
	vm.progressLabel = formatPercentRatio(p.progress);
	return vm;
}
