// Mappers for the four market-signal feeds (norviq-web
// handlers/market_signals_data.go) and the earnings streak scan
// (handlers/earnings_streak.go). Pure: no I/O, same strings as Go.

import { changeClass, formatCompactNumber, formatCurrency, formatFloat } from '#lib/format.js';
import { clampPercent, goFormat } from '#lib/features/dashboard/shared.js';
import type { CongressVM, InsiderVM, InstitutionalVM, TechnicalsVM } from '#lib/components/norviq/market-signals.js';
import type {
	CongressTrade,
	EarningsVM,
	InsiderActivityResponse,
	InstitutionalOwnershipResponse,
	RecentEarningsQuarter,
	RecentEarningsResponse,
	TechnicalSignalsResponse
} from './types.js';

export const insiderWindowPublicDays = 90;
export const publicInsiderTrades = 5;
export const publicInstitutionalTop = 5;
export const publicCongressRows = 5;

/** Go `date.Format("Jan 2, 2006")` for a backend date / timestamp (UTC). */
export function goDate(raw: string, layout = 'Jan 2, 2006'): string {
	return goFormat(new Date(raw), layout);
}

/** handlers.formatSignedCompactNumber */
export function formatSignedCompactNumber(value: number): string {
	return value < 0 ? '-' + formatCompactNumber(-value) : '+' + formatCompactNumber(value);
}

function pluralize(count: number, singular: string, plural: string): string {
	return `${count} ${count === 1 ? singular : plural}`;
}

/** handlers.formatISODate: a YYYY-MM-DD the provider sends as text, or "—". */
export function formatISODate(value: string): string {
	const v = (value ?? '').trim();
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
	if (!m) return '—';
	const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
	if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return '—';
	return goFormat(d, 'Jan 2, 2006');
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

export function mapTechnicals(resp: TechnicalSignalsResponse | null | undefined): TechnicalsVM {
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
	// Both signs named explicitly; anything else claims no direction.
	if (resp.macd?.sign === 'positive') {
		vm.hasMACD = true;
		vm.macdLabel = 'Positive';
		vm.macdTone = 'positive';
	} else if (resp.macd?.sign === 'negative') {
		vm.hasMACD = true;
		vm.macdLabel = 'Negative';
		vm.macdTone = 'negative';
	}
	const fw = resp.fiftyTwoWeek;
	if (fw && fw.high > fw.low) {
		vm.has52Week = true;
		vm.low52 = formatCurrency(fw.low);
		vm.high52 = formatCurrency(fw.high);
		vm.position52Pct = clampPercent(fw.positionPct);
		vm.position52Label = `${formatFloat(vm.position52Pct, 0)}% of its 52-week range`;
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

const emptyInsider = (): InsiderVM => ({ present: false, windowLabel: '', buys: 0, sells: 0, netShares: '', trades: [] });

export function mapInsiderActivity(resp: InsiderActivityResponse | null | undefined, maxTrades: number): InsiderVM {
	if (!resp) return emptyInsider();
	const trades = resp.trades ?? [];
	if (trades.length === 0 && resp.summary.buys === 0 && resp.summary.sells === 0) return emptyInsider();

	const vm: InsiderVM = {
		present: true,
		windowLabel: `Last ${resp.windowDays} days`,
		buys: resp.summary.buys,
		sells: resp.summary.sells,
		netShares: formatSignedCompactNumber(resp.summary.netShares) + ' shares',
		netSharesTone: changeClass(resp.summary.netShares),
		trades: []
	};
	if (resp.clusterBuy) {
		vm.clusterBuy = `Cluster buy: ${pluralize(resp.clusterBuy.insiderCount, 'insider', 'insiders')} bought between ${goDate(resp.clusterBuy.windowStart)} and ${goDate(resp.clusterBuy.windowEnd)}`;
	}
	for (const trade of trades) {
		if (vm.trades.length === maxTrades) break;
		vm.trades.push({
			date: goDate(trade.date),
			name: trade.reporterName,
			title: (trade.reporterTitle ?? '').trim(),
			kind: insiderKindLabel(trade.kind),
			shares: formatCompactNumber(Math.abs(trade.shares)),
			value: trade.value != null ? formatCurrency(trade.value) : '—'
		});
	}
	return vm;
}

export function mapInstitutionalOwnership(
	resp: InstitutionalOwnershipResponse | null | undefined,
	maxHolders: number
): InstitutionalVM {
	if (!resp) return { present: false, holders: [] };
	const holders = resp.topHolders ?? [];
	// The quarter label alone is not a section.
	if (holders.length === 0 && resp.holdersCount == null && resp.institutionalOwnershipPct == null) {
		return { present: false, holders: [] };
	}
	const vm: InstitutionalVM = { present: true, asOfQuarter: (resp.asOfQuarter ?? '').trim(), holders: [] };
	if (resp.institutionalOwnershipPct != null) vm.ownershipPct = formatFloat(resp.institutionalOwnershipPct, 1) + '%';
	if (resp.holdersCount != null) vm.holdersCount = String(resp.holdersCount);
	for (const holder of holders) {
		if (vm.holders.length === maxHolders) break;
		const row: InstitutionalVM['holders'][number] = {
			name: holder.name,
			shares: formatCompactNumber(holder.shares),
			change: '—'
		};
		if (holder.changeInShares != null) {
			row.change = formatSignedCompactNumber(holder.changeInShares);
			row.changeTone = changeClass(holder.changeInShares);
		}
		vm.holders.push(row);
	}
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

export function mapCongressTrades(trades: CongressTrade[] | null | undefined, maxRows: number): CongressVM {
	const vm: CongressVM = { present: false, trades: [] };
	for (const trade of trades ?? []) {
		if (vm.trades.length === maxRows) break;
		const symbol = (trade.symbol ?? '').trim().toUpperCase();
		vm.trades.push({
			politician: trade.politician,
			chamber: trade.chamber === 'senate' ? 'Senate' : 'House',
			type: congressTypeLabel(trade.type),
			amountRange: (trade.amountRange ?? '').trim() || '—',
			transactionDate: goDate(trade.transactionDate),
			disclosureDate: formatISODate(trade.disclosureDate),
			symbol,
			symbolHref: symbol ? '/portfolio/' + symbol : undefined
		});
	}
	vm.present = vm.trades.length > 0;
	return vm;
}

// ---- earnings streak (handlers/earnings_streak.go) ----

export interface EarningsStreak {
	headline: string;
	tone: string;
}

function quartersRunning(count: number): string {
	return `${count}${count === 1 ? ' quarter running' : ' quarters running'}`;
}

const byDateDesc = <T extends { date: string }>(rows: readonly T[]) =>
	[...rows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

/** headlineRecentEarningsStreak: the first row, newest first, with a non-zero run. */
export function headlineRecentEarningsStreak(quarters: readonly RecentEarningsQuarter[]): EarningsStreak {
	for (const q of byDateDesc(quarters)) {
		if (q.beatStreak > 0) return { headline: 'Beat ' + quartersRunning(q.beatStreak), tone: 'positive' };
		if (q.missStreak > 0) return { headline: 'Missed ' + quartersRunning(q.missStreak), tone: 'negative' };
	}
	return { headline: '', tone: '' };
}

export function earningsRunVerdict(beat: number, miss: number): { verdict: string; tone: string } {
	if (beat > 0) return { verdict: 'Beat', tone: 'positive' };
	if (miss > 0) return { verdict: 'Missed', tone: 'negative' };
	return { verdict: '—', tone: '' };
}


const publicEarningsQuarters = 4;

/** formatPublicEPS: "$1.23", or "—" when the provider gave none. */
function formatPublicEPS(value: number | null | undefined): string {
	return value == null ? '—' : '$' + formatFloat(value, 2);
}

/** mapPublicRecentEarnings */
export function mapPublicRecentEarnings(resp: RecentEarningsResponse | null): EarningsVM {
	const vm: EarningsVM = { nextDate: '', streakHeadline: '', streakTone: '', quarters: [] };
	if (!resp) return vm;
	const quarters: RecentEarningsQuarter[] = resp.quarters ?? [];
	const streak = headlineRecentEarningsStreak(quarters);
	vm.streakHeadline = streak.headline;
	vm.streakTone = streak.tone;
	if (resp.nextScheduled) vm.nextDate = goDate(resp.nextScheduled.date);
	for (const quarter of byDateDesc(quarters)) {
		if (quarter.status !== 'reported') continue;
		const { verdict, tone } = earningsRunVerdict(quarter.beatStreak, quarter.missStreak);
		vm.quarters.push({
			date: goDate(quarter.date),
			estimate: formatPublicEPS(quarter.epsEstimated),
			actual: formatPublicEPS(quarter.epsActual),
			verdict,
			tone
		});
		if (vm.quarters.length === publicEarningsQuarters) break;
	}
	return vm;
}
