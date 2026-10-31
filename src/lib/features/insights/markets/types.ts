// View models for the /markets pages. Ports of norviq-web
// internal/pages/markets/{page.templ,earnings_viewmodel.go,congress.templ,
// sentiment_viewmodel.go}. Pure: shared by the server loads and the pages.

import { formatFloat } from '#lib/format.js';
import type { HeatmapTile } from '#lib/charts/treemap.js';
import type { CongressTradeVM } from '#lib/components/norviq/market-signals.js';
import type { SentimentBadgeVM } from '#lib/components/norviq/sentiment.js';

/** fmt "%+.Nf". */
export function signedFixed(v: number, prec: number): string {
	const s = formatFloat(v, prec);
	return s.startsWith('-') ? s : '+' + s;
}

/** markets.FormatChangePct: "%+.2f%%". */
export const formatChangePct = (pct: number) => signedFixed(pct, 2) + '%';

// ---------------------------------------------------------------------------
// Overview (page.templ)

export interface IndexVM {
	label: string;
	price: string;
	changePct: number;
	change: string;
	isProxy: boolean;
	proxy: string;
}

export interface MoverVM {
	symbol: string;
	name: string;
	price: string;
	change: string;
	changePct: number;
}

/** OverviewVM. HeatmapHTML becomes the raw tiles; the page builds the chart. */
export interface OverviewVM {
	indices: IndexVM[];
	gainers: MoverVM[];
	losers: MoverVM[];
	heatmapTiles: HeatmapTile[];
	asOf: string;
}

// ---------------------------------------------------------------------------
// Earnings calendar (earnings_viewmodel.go)

export interface EarningsCalendarRowVM {
	symbol: string;
	company: string;
	detailURL: string;
	epsEstimate: string;
	revenueEstimate: string;
	isMine: boolean;
}

export interface EarningsDayVM {
	label: string;
	dateLabel: string;
	isoDate: string;
	isToday: boolean;
	rows: EarningsCalendarRowVM[];
}

export interface EarningsCalendarVM {
	weekStart: string;
	weekLabel: string;
	prevHref: string;
	nextHref: string;
	thisWeekHref: string;
	scope: 'all' | 'mine';
	allHref: string;
	mineHref: string;
	days: EarningsDayVM[];
	rowCount: number;
	loadError: boolean;
}

export const scopeIsMine = (vm: EarningsCalendarVM) => vm.scope === 'mine';

export function earningsEmptyMessage(vm: EarningsCalendarVM): string {
	return scopeIsMine(vm)
		? 'None of the symbols you hold or watch report this week.'
		: 'No companies are scheduled to report this week.';
}

// ---------------------------------------------------------------------------
// Congress feed (congress.templ)

export interface CongressFeedVM {
	trades: CongressTradeVM[];
	loadError: boolean;
	pilotsEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Sentiment board (sentiment_viewmodel.go)

export interface SentimentRowVM {
	symbol: string;
	detailURL: string;
	badge: SentimentBadgeVM;
	postCount: string;
	volumeLabel: string;
	deltaLabel: string;
	hasDelta: boolean;
	deltaUp: boolean;
}

export interface SentimentBoardVM {
	asOf: string;
	hasData: boolean;
	emptyReason: string;
	mostDiscussed: SentimentRowVM[];
	bullish: SentimentRowVM[];
	bearish: SentimentRowVM[];
	biggestSwings: SentimentRowVM[];
}

/** markets.FormatVolumeZ. */
export function formatVolumeZ(z: number | null | undefined): string {
	if (z === null || z === undefined) return 'Baseline forming';
	if (z >= 3) return 'Far above normal';
	if (z >= 1.5) return 'Well above normal';
	if (z >= 0.5) return 'Above normal';
	if (z <= -1.5) return 'Much quieter';
	if (z <= -0.5) return 'Quieter than usual';
	return 'Normal volume';
}

/** markets.FormatSentimentDelta. */
export function formatSentimentDelta(delta: number | null | undefined): {
	label: string;
	up: boolean;
	ok: boolean;
} {
	if (delta === null || delta === undefined) return { label: '', up: false, ok: false };
	const scaled = delta * 100;
	if (scaled > -1 && scaled < 1) return { label: '', up: false, ok: false };
	return { label: signedFixed(scaled, 0) + ' vs yesterday', up: scaled > 0, ok: true };
}
