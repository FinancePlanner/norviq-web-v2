// View models for the holdings page (pages/portfolio/viewmodel.go). Plain
// data only: the page builds chart specs from labels/values and closes, since
// ECharts options can carry functions that do not serialize.

import type { SentimentBadgeVM } from '#lib/components/norviq/sentiment.js';
import type { PilotFollowingVM } from '#lib/components/norviq/PilotFollowingBanner.svelte';
import type { SentimentRollupVM } from '../sentiment.js';

export interface PortfolioOptionVM {
	id: string;
	name: string;
	mode: string;
}

export interface AddPositionFormVM {
	portfolioID: string;
	symbol: string;
	category: string;
	shares: string;
	buyPrice: string;
	buyDate: string;
	notes: string;
	range: string;
	error: string;
	currentPortfolioValue: number;
}

export interface PositionRowVM {
	id: string;
	symbol: string;
	sentiment: SentimentBadgeVM;
	symbolInitial: string;
	subtitle: string;
	sharesLabel: string;
	sharesRaw: string;
	buyPriceRaw: string;
	buyDate: string;
	notes: string;
	costBasis: string;
	marketValue: string;
	lastPrice: string;
	netChg: string;
	chgPct: string;
	changePositive: boolean;
	todayGL: string;
	totalGL: string;
	totalGLPct: string;
	totalPositive: boolean;
	weightPct: string;
	rawGain: number;
	rawWeight: number;
	volume: string;
	/** Sparkline closes; the row renders sparkline(`holdings-spark-${symbol}-${index}`, closes). */
	sparkline: number[] | null;
	sparklineID: string;
	category: string;
	targetAlertPrice: string;
	targetAlertID: string;
	targetAlertDirection: string;
	detailURL: string;
}

/** The price fragment the quote poll refreshes (PositionQuote). */
export type PositionQuoteVM = Pick<
	PositionRowVM,
	'id' | 'marketValue' | 'changePositive' | 'todayGL' | 'chgPct' | 'totalPositive' | 'totalGL' | 'totalGLPct'
>;

export interface AssetFilterVM {
	id: string;
	label: string;
}

export interface HoldingsViewModel {
	sentiment: SentimentRollupVM;
	portfolios: PortfolioOptionVM[];
	selectedPortfolio: string;
	heroLabel: string;
	totalValue: string;
	heroSubtitle: string;
	trendLabel: string;
	chartLabels: string[];
	chartValues: number[];
	selectedTimeRange: string;
	timeRanges: string[];
	totalShares: string;
	avgPositionValue: string;
	cashBalance: string;
	positions: PositionRowVM[];
	assetFilters: AssetFilterVM[];
	loadErrors: Record<string, boolean>;
	hasLoadError: boolean;
	errorMessage: string;
	isPro: boolean;
	showAddPosition: boolean;
	addPosition: AddPositionFormVM;
	followingPilot: PilotFollowingVM | null;
}

export interface EditPositionFormVM {
	id: string;
	symbol: string;
	category: string;
	shares: string;
	buyPrice: string;
	buyDate: string;
	notes: string;
	range: string;
	error: string;
}

export interface SellPositionFormVM {
	id: string;
	symbol: string;
	maxShares: string;
	shares: string;
	sellPrice: string;
	sellDate: string;
	range: string;
	error: string;
}

export interface PriceAlertFormVM {
	stockID: string;
	symbol: string;
	targetID: string;
	targetPrice: string;
	direction: string;
	range: string;
	error: string;
	showProGate: boolean;
}

/**
 * What a position-action endpoint answers. Go swapped HTML into
 * #position-action-panel or sent HX-Redirect; v2 answers JSON the dialog
 * renders: a panel to show (with any error) or a redirect to follow.
 */
export type PositionActionResult =
	| { panel: 'edit'; form: EditPositionFormVM }
	| { panel: 'sell'; form: SellPositionFormVM }
	| { panel: 'alert'; form: PriceAlertFormVM }
	| { panel: 'add'; form: AddPositionFormVM }
	| { panel: 'pro-gate'; featureName: string }
	| { redirect: string };

export interface OnePageRowVM {
	symbol: string;
	weight: string;
	marketValue: string;
	totalGLPct: string;
	totalPositive: boolean;
	chgPct: string;
	changePositive: boolean;
}

export interface OtherShareLinkVM {
	scope: string;
	url: string;
	label: string;
}

export interface ShareLinkVM {
	scope: string;
	url: string;
	error: string;
	others: OtherShareLinkVM[];
}

export interface OnePageVM {
	portfolioID: string;
	totalValue: string;
	heroSubtitle: string;
	trendLabel: string;
	rows: OnePageRowVM[];
	other: string;
	share: ShareLinkVM;
	hasLoadError: boolean;
}
