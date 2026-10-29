// pages/stock/viewmodel.go — DetailViewModel and the tab view models this
// folder renders. analysis/ and builder/ carry their own.

import type { SentimentBadgeVM } from '#lib/components/norviq/sentiment.js';
import type { CongressVM, InsiderVM, InstitutionalVM, TechnicalsVM } from '#lib/components/norviq/market-signals.js';
import type { VisualizerVM } from '#lib/features/portfolio/earningsviz/index.js';
import type { AnalysisTabVM } from './analysis/types.js';
import type { ChartBuilderTabVM } from './builder/types.js';
import type { ConsensusVM, StatementRowVM } from './types.js';

export interface TargetRowVM {
	scenario: string;
	targetPrice: string;
	targetDate: string;
	rawPrice: number;
	delta: string;
	deltaClass: string;
}

export interface BasicFinancialsVM {
	hasData: boolean;
	error: string;
	metrics: StatementRowVM[];
}

/** ChartTabVM: Go held rendered chart HTML; v2 keeps the WealthLine inputs. */
export interface ChartTabVM {
	hasData: boolean;
	error: string;
	labels: string[];
	values: number[];
}

export interface StatementsTabVM {
	hasData: boolean;
	error: string;
	balanceSheet: StatementRowVM[];
	cashFlow: StatementRowVM[];
	ratioRows: StatementRowVM[];
	balancePeriod: string;
	cashFlowPeriod: string;
	ratiosPeriod: string;
}

export interface ForecastYearVM {
	year: string;
	revenue: string;
	revenueGrowth: string;
	eps: string;
	sharePriceLow: string;
	sharePriceHigh: string;
}

export interface ForecastScenarioVM {
	kind: string;
	years: ForecastYearVM[];
}

export interface ForecastTabVM {
	hasData: boolean;
	scenarios: ForecastScenarioVM[];
	/** WealthLine("stock-forecast-chart") inputs; null when Go had no chart. */
	chart: { labels: string[]; values: number[] } | null;
}

export interface ComparePeerVM {
	symbol: string;
	companyName: string;
	selected: boolean;
}

export interface CompareMetricVM {
	label: string;
	primary: string;
	peer: string;
}

export interface CompareTabVM {
	hasData: boolean;
	peers: ComparePeerVM[];
	selectedPeer: string;
	rows: CompareMetricVM[];
	/** WealthLine("stock-compare-chart") inputs; null when Go had no chart. */
	chart: { labels: string[]; values: number[] } | null;
}

export interface NewsArticleVM {
	headline: string;
	source: string;
	symbol: string;
	date: string;
	url: string;
}

export interface NewsTabVM {
	hasData: boolean;
	articles: NewsArticleVM[];
}

export interface SentimentThemeVM {
	label: string;
	stance: string;
	stanceCSS: string;
	evidence: string;
}

export interface SentimentPostVM {
	author: string;
	handle: string;
	text: string;
	url: string;
	sentimentLabel: string;
}

export interface SentimentTabVM {
	hasData: boolean;
	symbol: string;
	aggregateLabel: string;
	postCount: number;
	posts: SentimentPostVM[];
	badge: SentimentBadgeVM;
	hasDaily: boolean;
	asOf: string;
	sourceLabel: string;
	themes: SentimentThemeVM[];
	summary: string;
	/** SentimentHistoryLine("sentiment-history-chart") inputs; null when Go had no chart. */
	history: { labels: string[]; points: number[] } | null;
}

export interface EarningsEventVM {
	date: string;
	dateISO: string;
	epsActual: string;
	epsEstimated: string;
	revenueActual: string;
	revenueEstimated: string;
	surprise: string;
	verdict: string;
	verdictTone: string;
	hasTranscript: boolean;
}

export interface EarningsTabVM {
	hasData: boolean;
	error: string;
	streakHeadline: string;
	streakTone: string;
	events: EarningsEventVM[];
}

export interface OwnershipTabVM {
	hasData: boolean;
	insider: InsiderVM;
	institutional: InstitutionalVM;
	congress: CongressVM;
}

export interface DetailViewModel {
	symbol: string;
	activeTab: string;
	hasLoadError: boolean;
	errorMessage: string;

	positionID: string;
	hasPosition: boolean;
	isPro: boolean;

	companyName: string;
	companyMeta: string;
	positionLine: string;

	currentPrice: string;
	changePercent: string;
	changeClass: string;
	positionValue: string;
	costBasis: string;
	symbolInitial: string;

	return3M: string;
	return3MClass: string;
	return6M: string;
	return6MClass: string;
	returnYTD: string;
	returnYTDClass: string;

	shares: string;
	buyPrice: string;
	buyDate: string;
	category: string;
	notes: string;

	hasProfile: boolean;
	exchange: string;
	industry: string;
	country: string;
	ipo: string;
	currency: string;
	estimateCurrency: string;
	marketCap: string;
	sharesOutstanding: string;
	website: string;

	hasValuation: boolean;
	bearRange: string;
	baseRange: string;
	bullRange: string;
	valuationRationale: string;
	valuationTargetDate: string;

	targets: TargetRowVM[];
	consensus: ConsensusVM;
	basicFinancials: BasicFinancialsVM;
	chart: ChartTabVM;
	chartBuilder: ChartBuilderTabVM | null;
	statements: StatementsTabVM;
	analysis: AnalysisTabVM | null;
	forecast: ForecastTabVM;
	compare: CompareTabVM;
	news: NewsTabVM;
	sentiment: SentimentTabVM;
	earnings: EarningsTabVM;
	earningsVisualizer: VisualizerVM | null;
	ownership: OwnershipTabVM;
	technicals: TechnicalsVM;
}

export interface QuoteVM {
	symbol: string;
	hasPosition: boolean;
	currentPrice: string;
	changePercent: string;
	changeClass: string;
	positionValue: string;
	costBasis: string;
	updatedAt: string;
}

export interface PressureBarVM {
	date: string;
	relative: number;
	heightPct: number;
}

export interface PressureTradeVM {
	name: string;
	role: string;
	side: string;
	shares: string;
	date: string;
}

export interface PressureInsiderVM {
	windowDays: number;
	buys: number;
	sells: number;
	netShares: string;
	netSelling: boolean;
	notable: PressureTradeVM[];
}

export interface PressureVM {
	symbol: string;
	temperature: number;
	label: string;
	relative: number;
	todayVolume: string;
	avgVolume: string;
	changePct: number;
	history: PressureBarVM[];
	insider: PressureInsiderVM | null;
	asOf: string;
}

export interface TerminalCardVM {
	symbol: string;
	unavailable: boolean;
	hasScenario: boolean;
	terminalSharePrice: string;
	sharesNeeded: string;
	progressLabel: string;
	progressPct: number;
	scenarioError: string;
	addHref: string;
}

export interface TranscriptViewModel {
	symbol: string;
	date: string;
	quarter: string;
	content: string;
	error: string;
}

export interface ValuationFormVM {
	symbol: string;
	exists: boolean;
	bearLow: string;
	bearHigh: string;
	baseLow: string;
	baseHigh: string;
	bullLow: string;
	bullHigh: string;
	rationale: string;
	targetDate: string;
}

/** What GET valuation/edit, POST valuation answer (the htmx swap / HX-Redirect). */
export type ValuationResult = { panel: 'form'; vm: ValuationFormVM } | { panel: 'error'; message: string } | { redirect: string };
