// Backend side of norviq-web internal/handlers/stock_chart_builder.go:
// loadStockChartBuilderTab, loadChartBuilderResult and StockChartBuilderCSV.
// Calls the backend by hand (apiFetch) because Go branched on the raw status /
// body (resp.JSON200 == nil → chartBuilderBackendError(resp.Body, …)).

import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';
import {
	chartBuilderBackendError,
	chartBuilderBackendQuery,
	mapChartBuilderResult,
	parseChartBuilderRequest,
	type ChartBuilderMetricCatalogResponse,
	type ChartBuilderRequest,
	type ChartBuilderResponse
} from './request.js';
import {
	emptyChartBuilderResult,
	type ChartBuilderMetricGroupVM,
	type ChartBuilderResultVM,
	type ChartBuilderTabVM
} from './types.js';

const CATALOG_ERROR = 'Could not load the metric catalog.';
const DEFAULT_METRICS = new Set(['revenue', 'freeCashFlow']);

/** oapi-codegen sets JSON200 only for a 200 whose Content-Type mentions json. */
function isJSON200(res: Response): boolean {
	return res.status === 200 && (res.headers.get('content-type') ?? '').includes('json');
}

/** Go upper-cases chi.URLParam(r, "symbol") after TrimSpace. */
export function chartBuilderSymbol(raw: string | undefined): string {
	return (raw ?? '').trim().toUpperCase();
}

/** loadStockChartBuilderTab: the metric catalog, revenue + free cash flow preselected. */
export async function loadChartBuilderTab(
	event: RequestEvent,
	symbol: string
): Promise<ChartBuilderTabVM> {
	const vm: ChartBuilderTabVM = { groups: [], error: '' };
	let res: Response;
	let body: string;
	try {
		res = await apiFetch(event, 'GET', '/v1/market/chart-builder/metrics');
		body = await res.text();
	} catch (err) {
		console.warn('chart builder catalog fetch failed', { symbol, error: String(err) });
		vm.error = CATALOG_ERROR;
		return vm;
	}
	let catalog: ChartBuilderMetricCatalogResponse | null = null;
	if (isJSON200(res)) {
		try {
			catalog = JSON.parse(body) as ChartBuilderMetricCatalogResponse;
		} catch (err) {
			// Go: ParseGetChartBuilderMetricsResponse returns err → same message.
			console.warn('chart builder catalog fetch failed', { symbol, error: String(err) });
			vm.error = CATALOG_ERROR;
			return vm;
		}
	}
	if (!catalog) {
		vm.error = chartBuilderBackendError(body, CATALOG_ERROR);
		return vm;
	}

	vm.groups = (catalog.groups ?? []).map((group): ChartBuilderMetricGroupVM => ({
		key: group.key,
		label: group.label,
		metrics: (group.metrics ?? []).map((metric) => ({
			key: metric.key,
			label: metric.label,
			format: metric.format,
			supportsTTM: metric.supportsTTM ?? false,
			selected: DEFAULT_METRICS.has(metric.key)
		}))
	}));
	return vm;
}

/** loadChartBuilderResult: GET /v1/market/chart-builder/{symbol} → result VM. */
export async function loadChartBuilderResult(
	event: RequestEvent,
	symbol: string,
	request: ChartBuilderRequest
): Promise<ChartBuilderResultVM> {
	let res: Response;
	let body: string;
	try {
		res = await apiFetch(
			event,
			'GET',
			'/v1/market/chart-builder/' + encodeURIComponent(symbol),
			null,
			{
				query: chartBuilderBackendQuery(request)
			}
		);
		body = await res.text();
	} catch (err) {
		console.warn('chart builder data fetch failed', { symbol, error: String(err) });
		return emptyChartBuilderResult('Could not build this chart. Try again shortly.');
	}
	if (!isJSON200(res)) {
		return emptyChartBuilderResult(chartBuilderBackendError(body, 'Could not build this chart.'));
	}
	let response: ChartBuilderResponse;
	try {
		response = JSON.parse(body) as ChartBuilderResponse;
	} catch (err) {
		console.warn('chart builder data fetch failed', { symbol, error: String(err) });
		return emptyChartBuilderResult('Could not build this chart. Try again shortly.');
	}
	return mapChartBuilderResult(symbol, request, response);
}

/** StockChartBuilderChart, minus the templ render: the result VM for a query string. */
export async function chartBuilderChartResult(
	event: RequestEvent,
	rawSymbol: string | undefined
): Promise<ChartBuilderResultVM> {
	const symbol = chartBuilderSymbol(rawSymbol);
	const parsed = parseChartBuilderRequest(event.url.searchParams);
	if (!parsed.ok) return emptyChartBuilderResult(parsed.error);
	if (symbol === '') return emptyChartBuilderResult('Chart data is unavailable right now.');
	return loadChartBuilderResult(event, symbol, parsed.request);
}

/** http.Error: plain text, nosniff, trailing newline. */
function httpError(message: string, status: number): Response {
	return new Response(message + '\n', {
		status,
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }
	});
}

/** StockChartBuilderCSV: proxies the backend CSV export with Go's headers and error statuses. */
export async function chartBuilderCSVResponse(
	event: RequestEvent,
	rawSymbol: string | undefined
): Promise<Response> {
	const symbol = chartBuilderSymbol(rawSymbol);
	const parsed = parseChartBuilderRequest(event.url.searchParams);
	if (!parsed.ok) return httpError(parsed.error, 400);
	if (symbol === '') return httpError('Chart export is unavailable right now.', 503);
	const request = parsed.request;

	let res: Response;
	let body: ArrayBuffer;
	try {
		// The generated Go client sent no Accept header; don't ask for JSON here.
		res = await apiFetch(
			event,
			'GET',
			'/v1/market/chart-builder/' + encodeURIComponent(symbol) + '/csv',
			null,
			{
				query: chartBuilderBackendQuery(request),
				headers: { Accept: '*/*' }
			}
		);
		body = await res.arrayBuffer();
	} catch (err) {
		console.warn('chart builder CSV fetch failed', { symbol, error: String(err) });
		return httpError('Could not download this chart export.', 502);
	}
	if (res.status !== 200) {
		const status = res.status >= 400 && res.status < 500 ? res.status : 502;
		const text = new TextDecoder().decode(body);
		return httpError(
			chartBuilderBackendError(text, 'Could not download this chart export.'),
			status
		);
	}

	const headers = new Headers();
	const disposition = res.headers.get('Content-Disposition');
	headers.set(
		'Content-Disposition',
		disposition || `attachment; filename="${symbol}-chart-builder-${request.period}.csv"`
	);
	headers.set('Content-Type', res.headers.get('Content-Type') || 'text/csv; charset=utf-8');
	return new Response(body, { status: 200, headers });
}
