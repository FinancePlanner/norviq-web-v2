// Backend shapes the Go crypto handlers read (internal/api client.gen.go and
// internal/api/cryptomarkets), and the view models of
// internal/pages/crypto/viewmodel.go. Charts are carried as plain data; the
// components build the ECharts specs.
import type {
	BubbleNode,
	HeatmapColorMode,
	BubbleSizeBy,
	HeatmapTile,
	GrowthSparklinePoint
} from '#lib/charts/index.js';

// ---------------------------------------------------------------------------
// Backend

export interface CryptoAssetResponse {
	symbol: string;
	name: string;
}

/** The short quote shape from /v1/crypto/batch-quotes: `change` is an absolute USD move. */
export interface CryptoShortQuote {
	symbol?: string | null;
	price?: number | null;
	change?: number | null;
	volume?: number | null;
}

export interface CryptoQuoteResponse {
	symbol: string;
	name: string;
	price: number;
	changePercentage: number;
	change: number;
	volume?: number | null;
	dayLow?: number | null;
	dayHigh?: number | null;
	yearHigh?: number | null;
	yearLow?: number | null;
	marketCap?: number | null;
	priceAvg50?: number | null;
	priceAvg200?: number | null;
}

export interface CryptoHistoricalPoint {
	date: string;
	close: number;
}

export interface NewsItemResponse {
	headline: string;
	summary?: string | null;
	url?: string | null;
	source?: string | null;
	publishedAt: string;
}

export interface CryptoPortfolioItemRequest {
	symbol: string;
	name: string;
	quantity: number;
	averageBuyPrice: number;
}

export interface CryptoPortfolioItemResponse extends CryptoPortfolioItemRequest {
	id: string;
}

export type CryptoMarketsTimeframe = '1d' | '1w' | '1m' | 'ytd' | '1y' | 'all';

export interface CryptoMarketCoin {
	id: string;
	symbol: string;
	fmpSymbol?: string | null;
	name: string;
	sector: string;
	price: number;
	marketCap?: number | null;
	changePct?: number | null;
	athChangePct?: number | null;
	athDate?: string | null;
	atlChangePct?: number | null;
	sparkline7d: number[] | null;
}

export interface CryptoMarketsResponse {
	timeframe: CryptoMarketsTimeframe;
	supportedTimeframes: CryptoMarketsTimeframe[] | null;
	source: string;
	asOf: string;
	isStale: boolean;
	colorMode: 'change' | 'athDistance' | string;
	colorScaleMaxPct: number;
	attribution?: string | null;
	summary: {
		totalMarketCap?: number | null;
		btcDominancePct?: number | null;
		advancers: number;
		decliners: number;
	};
	coins: CryptoMarketCoin[] | null;
	gainers: CryptoMarketCoin[] | null;
	losers: CryptoMarketCoin[] | null;
	athBoard: {
		recentAths: CryptoMarketCoin[] | null;
		nearAth: CryptoMarketCoin[] | null;
		deepestDrawdowns: CryptoMarketCoin[] | null;
	};
}

// ---------------------------------------------------------------------------
// View models

export interface AssetRow {
	symbol: string;
	name: string;
	price: string;
	changePct: string;
	changeClass: string;
}

export interface HoldingRow {
	id: string;
	symbol: string;
	name: string;
	quantity: string;
	avgCost: string;
}

export interface NewsRow {
	title: string;
	summary: string;
	url: string;
	source: string;
	date: string;
}

export interface PageViewModel {
	tab: string;
	/** Go's MarketsFragmentURL inputs: the markets query reads view/tf/size. */
	markets: { view: string; tf: string; size: string } | null;
	snapshotFromMarkets: boolean;
	activePath: string;
	hasLoadError: boolean;
	errorMessage: string;
	assets: AssetRow[];
	holdings: HoldingRow[];
	news: NewsRow[];
	portfolioValue: string;
	holdingCount: number;
}

export interface AssetOptionVM {
	symbol: string;
	name: string;
}

export interface HoldingFormVM {
	itemID: string;
	symbol: string;
	name: string;
	quantity: string;
	avgCost: string;
	assets: AssetOptionVM[];
	isEdit: boolean;
	error: string;
}

/** One button in a segmented toggle (Go: hx-get FragmentURL + hx-push-url PushURL). */
export interface ToggleOption {
	label: string;
	pushURL: string;
	active: boolean;
	disabled: boolean;
}

export interface CoinRowVM {
	symbol: string;
	name: string;
	href: string;
	price: string;
	change: string;
	changeClass: string;
	sparkline: { points: GrowthSparklinePoint[]; tone: string } | null;
}

export interface AthRowVM {
	symbol: string;
	name: string;
	href: string;
	fromATH: string;
	athDate: string;
	sinceATL: string;
}

export interface MarketsVM {
	view: string;
	timeframeLabel: string;
	timeframes: ToggleOption[];
	sizeOptions: ToggleOption[];
	asOf: string;
	isStale: boolean;
	attribution: string;
	totalMarketCap: string;
	btcDominance: string;
	advancers: number;
	decliners: number;
	heatmap: {
		id: string;
		tiles: HeatmapTile[];
		scaleMaxPct: number;
		periodLabel: string;
		colorMode: HeatmapColorMode;
	} | null;
	bubbles: {
		id: string;
		nodes: BubbleNode[];
		scaleMaxPct: number;
		periodLabel: string;
		colorMode: HeatmapColorMode;
		sizeBy: BubbleSizeBy;
	} | null;
	gainersTitle: string;
	losersTitle: string;
	gainers: CoinRowVM[];
	losers: CoinRowVM[];
	recentAths: AthRowVM[];
	nearAth: AthRowVM[];
	drawdowns: AthRowVM[];
	unavailable: boolean;
}

export interface CoinStat {
	label: string;
	value: string;
}

export interface RangeLink {
	label: string;
	href: string;
	active: boolean;
}

export interface CoinPageVM {
	symbol: string;
	name: string;
	price: string;
	change: string;
	changeClass: string;
	rangeLabel: string;
	ranges: RangeLink[];
	/** charts.PriceLine inputs; null when there is no history. */
	chart: { id: string; labels: string[]; closes: number[] } | null;
	stats: CoinStat[];
	errorMessage: string;
}
