// handlers/market_signals_data.go — loaders and mappers for technicals,
// insider filings, 13F ownership and congressional disclosures. Each loader
// throws on failure; the caller decides whether to swallow it.

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { changeClass, formatCompactNumber, formatCurrency, formatFloat } from '#lib/format.js';
import type {
	CongressTradeVM,
	CongressVM,
	InsiderTradeVM,
	InsiderVM,
	InstitutionalVM,
	TechnicalsVM
} from '#lib/components/norviq/market-signals.js';
import { derefString, goDate } from './format.js';

type S = components['schemas'];

export const insiderWindowTabDays = 365;
export const ownershipTabInsiderRows = 10;
export const ownershipTabHolders = 10;
export const ownershipTabCongressRows = 10;

const enc = encodeURIComponent;

export const emptyInsider = (): InsiderVM => ({
	present: false,
	windowLabel: '',
	buys: 0,
	sells: 0,
	netShares: '',
	trades: []
});
export const emptyInstitutional = (): InstitutionalVM => ({ present: false, holders: [] });
export const emptyCongress = (): CongressVM => ({ present: false, trades: [] });

export async function loadTechnicals(event: RequestEvent, symbol: string): Promise<TechnicalsVM> {
	return mapTechnicals(
		await apiJSON<S['TechnicalSignalsResponse']>(
			event,
			'GET',
			`/v1/market/technicals/${enc(symbol)}`
		)
	);
}

export async function loadInsiderActivity(
	event: RequestEvent,
	symbol: string,
	days: number,
	maxTrades: number
): Promise<InsiderVM> {
	const resp = await apiJSON<S['InsiderActivityResponse']>(
		event,
		'GET',
		`/v1/market/insider/${enc(symbol)}`,
		undefined,
		{ query: { days } }
	);
	return mapInsiderActivity(resp, maxTrades);
}

export async function loadInstitutionalOwnership(
	event: RequestEvent,
	symbol: string,
	maxHolders: number
): Promise<InstitutionalVM> {
	const resp = await apiJSON<S['InstitutionalOwnershipResponse']>(
		event,
		'GET',
		`/v1/market/institutional/${enc(symbol)}`
	);
	return mapInstitutionalOwnership(resp, maxHolders);
}

export async function loadCongressTrades(
	event: RequestEvent,
	symbol: string,
	maxRows: number
): Promise<CongressVM> {
	const resp = await apiJSON<S['CongressTradesResponse']>(
		event,
		'GET',
		`/v1/market/congress/${enc(symbol)}`
	);
	return mapCongressTrades(resp?.trades ?? [], maxRows);
}

function clampPercent(v: number): number {
	if (v < 0) return 0;
	if (v > 100) return 100;
	return v;
}

export function mapTechnicals(
	resp: S['TechnicalSignalsResponse'] | null | undefined
): TechnicalsVM {
	if (!resp) return { present: false };
	const vm: TechnicalsVM = {
		present: true,
		asOf: goDate(resp.asOf),
		trendLabel: technicalTrendLabel(resp.trend)
	};
	if (resp.cross === 'goldenCross') {
		vm.crossLabel = 'Golden cross';
		vm.crossTone = 'positive';
	} else if (resp.cross === 'deathCross') {
		vm.crossLabel = 'Death cross';
		vm.crossTone = 'negative';
	}
	if (resp.rsi14 != null) {
		vm.hasRSI = true;
		vm.rsi = formatFloat(resp.rsi14, 1);
		if (resp.rsi14 >= 70) {
			vm.rsiHint = 'Overbought';
			vm.rsiTone = 'negative';
		} else if (resp.rsi14 <= 30) {
			vm.rsiHint = 'Oversold';
			vm.rsiTone = 'positive';
		}
	}
	if (resp.macd) {
		const sign = (resp.macd as { sign?: string }).sign;
		if (sign === 'positive') {
			vm.hasMACD = true;
			vm.macdLabel = 'Positive';
			vm.macdTone = 'positive';
		} else if (sign === 'negative') {
			vm.hasMACD = true;
			vm.macdLabel = 'Negative';
			vm.macdTone = 'negative';
		}
	}
	const ftw = resp.fiftyTwoWeek as { high: number; low: number; positionPct: number };
	if (ftw && ftw.high > ftw.low) {
		vm.has52Week = true;
		vm.low52 = formatCurrency(ftw.low);
		vm.high52 = formatCurrency(ftw.high);
		vm.position52Pct = clampPercent(ftw.positionPct);
		vm.position52Label = `${formatFloat(vm.position52Pct, 0)}% of its 52-week range`;
	}
	return vm;
}

function technicalTrendLabel(trend: string): string {
	switch (trend) {
		case 'aboveBoth':
			return 'Above its 50- and 200-day averages';
		case 'belowBoth':
			return 'Below its 50- and 200-day averages';
		case 'mixed':
			return 'Between its 50- and 200-day averages';
		default:
			return '';
	}
}

/** formatSignedCompactNumber keeps the sign that formatCompactNumber drops. */
export function formatSignedCompactNumber(value: number): string {
	if (value < 0) return '-' + formatCompactNumber(-value);
	return '+' + formatCompactNumber(value);
}

function pluralize(count: number, singular: string, plural: string): string {
	return `${count} ${count === 1 ? singular : plural}`;
}

export function mapInsiderActivity(
	resp: S['InsiderActivityResponse'] | null | undefined,
	maxTrades: number
): InsiderVM {
	if (!resp) return emptyInsider();
	const summary = resp.summary as { buys: number; sells: number; netShares: number };
	if (resp.trades.length === 0 && summary.buys === 0 && summary.sells === 0) return emptyInsider();
	const vm: InsiderVM = {
		present: true,
		windowLabel: `Last ${resp.windowDays} days`,
		buys: summary.buys,
		sells: summary.sells,
		netShares: formatSignedCompactNumber(summary.netShares) + ' shares',
		netSharesTone: changeClass(summary.netShares),
		trades: []
	};
	const cluster = resp.clusterBuy as
		{ insiderCount: number; windowStart: string; windowEnd: string } | null | undefined;
	if (cluster) {
		vm.clusterBuy = `Cluster buy: ${pluralize(cluster.insiderCount, 'insider', 'insiders')} bought between ${goDate(cluster.windowStart)} and ${goDate(cluster.windowEnd)}`;
	}
	for (const trade of resp.trades) {
		if (vm.trades.length === maxTrades) break;
		const row: InsiderTradeVM = {
			date: goDate(trade.date),
			name: trade.reporterName,
			title: derefString(trade.reporterTitle),
			kind: insiderKindLabel(trade.kind),
			shares: formatCompactNumber(Math.abs(trade.shares)),
			value: '—'
		};
		if (trade.value != null) row.value = formatCurrency(trade.value);
		vm.trades.push(row);
	}
	return vm;
}

function insiderKindLabel(kind: string): string {
	switch (kind) {
		case 'buy':
			return 'Buy';
		case 'sell':
			return 'Sell';
		case 'award':
			return 'Award';
		default:
			return 'Other';
	}
}

export function mapInstitutionalOwnership(
	resp: S['InstitutionalOwnershipResponse'] | null | undefined,
	maxHolders: number
): InstitutionalVM {
	if (!resp) return emptyInstitutional();
	if (
		resp.topHolders.length === 0 &&
		resp.holdersCount == null &&
		resp.institutionalOwnershipPct == null
	)
		return emptyInstitutional();
	const vm: InstitutionalVM = {
		present: true,
		asOfQuarter: (resp.asOfQuarter ?? '').trim(),
		holders: []
	};
	if (resp.institutionalOwnershipPct != null)
		vm.ownershipPct = formatFloat(resp.institutionalOwnershipPct, 1) + '%';
	if (resp.holdersCount != null) vm.holdersCount = String(resp.holdersCount);
	for (const holder of resp.topHolders) {
		if (vm.holders.length === maxHolders) break;
		const row = {
			name: holder.name,
			shares: formatCompactNumber(holder.shares),
			change: '—',
			changeTone: undefined as string | undefined
		};
		if (holder.changeInShares != null) {
			row.change = formatSignedCompactNumber(holder.changeInShares);
			row.changeTone = changeClass(holder.changeInShares);
		}
		vm.holders.push(row);
	}
	return vm;
}

/** formatISODate: "2006-01-02" → "Jan 2, 2006", anything unparsable → "—". */
function formatISODate(value: string): string {
	const v = (value ?? '').trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '—';
	return goDate(v) || '—';
}

export function mapCongressTrades(trades: S['CongressTrade'][], maxRows: number): CongressVM {
	const vm = emptyCongress();
	for (const trade of trades) {
		if (vm.trades.length === maxRows) break;
		const symbol = (trade.symbol ?? '').trim().toUpperCase();
		const row: CongressTradeVM = {
			politician: trade.politician,
			chamber: trade.chamber === 'senate' ? 'Senate' : 'House',
			type: congressTypeLabel(trade.type),
			amountRange: '—',
			transactionDate: goDate(trade.transactionDate),
			disclosureDate: formatISODate(trade.disclosureDate),
			symbol
		};
		if ((trade.amountRange ?? '').trim() !== '') row.amountRange = trade.amountRange.trim();
		if (symbol !== '') row.symbolHref = '/portfolio/' + symbol;
		vm.trades.push(row);
	}
	vm.present = vm.trades.length > 0;
	return vm;
}

function congressTypeLabel(kind: string): string {
	switch (kind) {
		case 'purchase':
			return 'Purchase';
		case 'sale':
			return 'Sale';
		case 'exchange':
			return 'Exchange';
		default:
			return 'Other';
	}
}
