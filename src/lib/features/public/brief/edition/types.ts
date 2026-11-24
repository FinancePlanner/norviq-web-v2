// Wire types for the backend's MarketBriefEdition (GET /v1/market/brief
// ?include=edition) and the view models the editorial page renders.
//
// Local types rather than schema.d.ts: the edition is newer than the
// generated client, and these mirror the Go structs in
// norviq-backend-v2 internal/features/marketbrief/edition.go.

export interface EditionInstrumentDTO {
	symbol: string;
	name: string;
	/** index, future, rate or commodity; unknown classes are ignored. */
	assetClass: string;
	region: string;
	group?: string | null;
	/** points, percent (yields) or usd_bbl. */
	unit: string;
	currency?: string | null;
	precision: number;
	last: number;
	previousClose: number;
	change: number;
	changePct: number;
	/** Yields only. A yield's changePct is relative and is never its move. */
	changeBps?: number | null;
	asOf: string;
	source: string;
}

export interface EditionSeriesDTO {
	symbol: string;
	interval: string;
	timezone?: string;
	/** [unix seconds, value], oldest first. */
	points: [number, number][];
	asOf: string;
	source: string;
}

export interface EditionDTO {
	schemaVersion: number;
	id: string;
	/** open or close. */
	kind: string;
	revision: number;
	status: string;
	publishedAt: string;
	marketDataAsOf?: string | null;
	timezone: string;
	instruments: EditionInstrumentDTO[];
	series: EditionSeriesDTO[];
	quality: { degraded: boolean; model: string; missing: string[] };
}

export type Direction = 'up' | 'down' | 'flat';

/** One instrument as the page shows it; every string already localized. */
export interface ScorecardVM {
	symbol: string;
	name: string;
	/** "NDX · US"; empty for legacy rows that carry no region. */
	meta: string;
	level: string;
	/** Signed absolute move ("−1,490.32"); empty when unknown (legacy briefs). */
	change: string;
	/** Signed percent ("−5.61%"), or basis points for yields ("−13.9 bp"). */
	changePct: string;
	direction: Direction;
	/** Spoken summary for screen readers: "Nasdaq 100, 25,029.33, down 5.61%". */
	label: string;
	spark: SparkVM | null;
	asOf: string;
}

export interface SparkVM {
	/** SVG path in a 0..100 × 0..32 box. */
	path: string;
	/** Baseline (previous close) y, or null when off the chart. */
	baseline: number | null;
}

export interface ScoreGroupVM {
	id: string;
	title: string;
	cards: ScorecardVM[];
}

export interface CrossAssetRowVM {
	symbol: string;
	name: string;
	section: string;
	level: string;
	change: string;
	direction: Direction;
	label: string;
}

export interface ChartSeriesVM {
	symbol: string;
	name: string;
	/** Token name for the stroke colour. */
	tone: 'line' | 'alt' | 'info';
	path: string;
	last: string;
	direction: Direction;
}

export interface IntradayChartVM {
	title: string;
	/** Chart summary for screen readers. */
	description: string;
	series: ChartSeriesVM[];
	yTicks: { y: number; label: string }[];
	xTicks: { x: number; label: string }[];
	/** y of the 0% line, or null when the range does not cross it. */
	zero: number | null;
	/** Data-table alternative: one row per sampled time. */
	table: { columns: string[]; rows: string[][] };
	timezoneLabel: string;
}

export interface StoryVM {
	rank: number;
	kind: string;
	text: string;
	tickers: string[];
	sourceHost: string;
	sourceURL: string;
}

export interface SourceVM {
	host: string;
	url: string;
}
