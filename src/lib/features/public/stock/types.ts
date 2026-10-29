// View model for the public ticker page (norviq-web pages/public/viewmodel.go)
// and the backend shapes its loader reads (internal/api models + the separate
// recentearnings client). Client-safe: types only.

import type { CongressVM, InsiderVM, InstitutionalVM, TechnicalsVM } from '#lib/components/norviq/market-signals.js';
import type { GrowthSparklinePoint } from '#lib/charts/growth-sparkline.js';

export interface SentimentVM {
	present: boolean;
	label: string;
	score: string;
	postCount: number;
}

export interface EarningsQuarterVM {
	date: string;
	estimate: string;
	actual: string;
	verdict: string;
	tone: string;
}

export interface EarningsVM {
	nextDate: string;
	streakHeadline: string;
	streakTone: string;
	quarters: EarningsQuarterVM[];
}

export interface StockVM {
	symbol: string;
	companyName: string;
	price: string;
	changePct: string;
	/** "positive" | "negative" | "neutral", or "" when the day change is unknown. */
	changeTone: string;
	currency: string;
	exchange: string;
	/** Go rendered charts.GrowthSparklineSVG; v2 draws the same SVG from these points. */
	sparkline: { points: GrowthSparklinePoint[]; tone: string } | null;
	rangeLabel: string;
	sentiment: SentimentVM;
	earnings: EarningsVM;
	technicals: TechnicalsVM;
	insider: InsiderVM;
	institutional: InstitutionalVM;
	congress: CongressVM;
	gateHref: string;
	title: string;
	metaDescription: string;
	canonicalURL: string;
	ogImageURL: string;
}

// ---- backend shapes (follow the Go client, not schema.d.ts) ----

export interface StockDetailsResponse {
	changePercent: number;
	company: string;
	latestPrice: number;
	symbol: string;
}

export interface CompanyProfileResponse {
	currency?: string | null;
	exchange?: string | null;
	name?: string | null;
}

export interface PriceBarResponse {
	close: number;
	date: string;
}

export interface HistoryResponse {
	bars: PriceBarResponse[] | null;
}

export interface RecentEarningsQuarter {
	beatStreak: number;
	date: string;
	epsActual?: number | null;
	epsEstimated?: number | null;
	missStreak: number;
	status: string;
}

export interface RecentEarningsResponse {
	nextScheduled?: RecentEarningsQuarter | null;
	quarters: RecentEarningsQuarter[] | null;
}

export interface TickerSentimentResponse {
	aggregate: { label: string; postCount: number; score?: number | null };
}

export interface TechnicalSignalsResponse {
	asOf: string;
	cross: string;
	fiftyTwoWeek: { high: number; low: number; positionPct: number };
	macd?: { sign: string } | null;
	rsi14?: number | null;
	trend: string;
}

export interface InsiderActivityResponse {
	clusterBuy?: { insiderCount: number; windowEnd: string; windowStart: string } | null;
	summary: { buys: number; netShares: number; sells: number };
	trades: {
		date: string;
		kind: string;
		reporterName: string;
		reporterTitle?: string | null;
		shares: number;
		value?: number | null;
	}[] | null;
	windowDays: number;
}

export interface InstitutionalOwnershipResponse {
	asOfQuarter: string;
	holdersCount?: number | null;
	institutionalOwnershipPct?: number | null;
	topHolders: { changeInShares?: number | null; name: string; shares: number }[] | null;
}

export interface CongressTrade {
	amountRange: string;
	chamber: string;
	disclosureDate: string;
	politician: string;
	symbol: string;
	transactionDate: string;
	type: string;
}
