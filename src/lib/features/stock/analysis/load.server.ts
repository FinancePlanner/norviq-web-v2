// Port of loadStockAnalysisTab (norviq-web internal/handlers/stock_detail_analysis_data.go).
//
// Six backend legs run in parallel (Go: errgroup whose goroutines all return
// nil). Every leg is best-effort: a transport error, a non-200 status, a body
// that fails to decode, or an empty array leaves that leg missing, exactly as
// `err == nil && resp.JSON200 != nil [&& len > 0]` did. The loader never sets
// an error string.
import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import {
	buildAnalysisTabVM,
	type AnalystEstimatesResponse,
	type BasicFinancialsResponse,
	type FinancialGrowthResponse,
	type GradesConsensusResponse,
	type RatiosTTMResponse,
	type StockAnalysisMetricsResponse
} from './mappers.js';
import { emptyAnalysisTab, type AnalysisTabVM } from './types.js';

/**
 * The generated client's JSON200: any failure (APIError on non-2xx, network,
 * bad JSON) drops the leg. A literal `null` body decodes to the zero value in
 * Go (JSON200 is non-nil), hence `zero`; an empty body leaves JSON200 nil.
 */
async function getJSON200<T>(
	event: RequestEvent,
	path: string,
	zero: T,
	query?: Record<string, string | number>
): Promise<T | null> {
	try {
		const parsed = await apiJSON<T | null | undefined>(event, 'GET', path, undefined, { query });
		if (parsed === undefined) return null;
		return parsed ?? zero;
	} catch {
		return null;
	}
}

/** openapi_types.Date.UnmarshalJSON: time.Parse("2006-01-02"). */
function isGoDate(s: unknown): boolean {
	if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const [y, m, d] = s.split('-').map(Number);
	const t = new Date(Date.UTC(y, m - 1, d));
	return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** A row whose `date` would not decode fails the whole response in Go. */
const datesDecode = (rows: { date: string }[]) => rows.every((r) => isGoDate(r.date));

const nonEmpty = <T>(rows: T[] | null): T[] | null =>
	rows && Array.isArray(rows) && rows.length > 0 ? rows : null;

export async function loadAnalysisTab(event: RequestEvent, symbol: string): Promise<AnalysisTabVM> {
	if (!symbol) return emptyAnalysisTab();
	const sym = encodeURIComponent(symbol);

	const [analysis, ratios, growth, estimates, financials, consensus] = await Promise.all([
		getJSON200<StockAnalysisMetricsResponse>(
			event,
			`/v1/market/analysis/${sym}`,
			{} as StockAnalysisMetricsResponse
		),
		getJSON200<RatiosTTMResponse[]>(event, `/v1/market/ratios-ttm/${sym}`, []),
		getJSON200<FinancialGrowthResponse[]>(event, `/v1/market/financial-growth/${sym}`, [], {
			limit: 8,
			period: 'annual'
		}),
		getJSON200<AnalystEstimatesResponse[]>(event, `/v1/market/analyst-estimates/${sym}`, [], {
			limit: 6,
			period: 'annual'
		}),
		getJSON200<BasicFinancialsResponse>(
			event,
			`/v1/market/basic-financials/${sym}`,
			{} as BasicFinancialsResponse
		),
		getJSON200<GradesConsensusResponse[]>(event, `/v1/market/grades-consensus/${sym}`, [])
	]);

	const ratiosRows = nonEmpty(ratios);
	let growthRows = nonEmpty(growth);
	if (growthRows && !datesDecode(growthRows)) growthRows = null;
	let estimateRows = nonEmpty(estimates);
	if (estimateRows && !datesDecode(estimateRows)) estimateRows = null;

	return buildAnalysisTabVM(
		analysis,
		ratiosRows ? ratiosRows[0] : null,
		growthRows,
		estimateRows,
		financials,
		nonEmpty(consensus)
	);
}
