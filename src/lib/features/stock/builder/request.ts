// Pure parts of norviq-web internal/handlers/stock_chart_builder.go:
// parseChartBuilderRequest, mapChartBuilderResult, mapChartBuilderGrowth,
// chartBuilderCSVURL, the growth-cell formatters and chartBuilderBackendError.
// No server imports, so /chart-builder can reuse them.

import type { components } from '#lib/api/schema.js';
import type { MultiSeriesData } from '#lib/charts/index.js';
import { formatFloat } from '#lib/format.js';
import {
	chartBuilderPeriodLabel,
	emptyChartBuilderResult,
	type ChartBuilderGrowthRowVM,
	type ChartBuilderGrowthTableVM,
	type ChartBuilderResultVM
} from './types.js';

export type ChartBuilderResponse = components['schemas']['ChartBuilderResponse'];
export type ChartBuilderMetricCatalogResponse = components['schemas']['ChartBuilderMetricCatalogResponse'];
type SeriesFormat = components['schemas']['ChartBuilderSeries']['format'];

export const chartBuilderMaxMetrics = 20;
export const chartBuilderMaxPeers = 3;
export const chartBuilderMaxLimit = 40;

export interface ChartBuilderRequest {
	metrics: string[];
	period: string;
	limit: number;
	compare: string[];
	chartType: string;
	showGrowth: boolean;
}

export type ChartBuilderParseResult = { ok: true; request: ChartBuilderRequest } | { ok: false; error: string };

const fail = (error: string): ChartBuilderParseResult => ({ ok: false, error });

/** parseChartBuilderRequest: same defaults, limits and error strings as Go. */
export function parseChartBuilderRequest(values: URLSearchParams): ChartBuilderParseResult {
	const first = (key: string) => values.get(key) ?? '';
	const request: ChartBuilderRequest = {
		metrics: splitChartBuilderValues(values.getAll('metrics'), false),
		period: first('period').trim().toLowerCase(),
		limit: 0,
		compare: [],
		chartType: first('chartType').trim().toLowerCase(),
		showGrowth: true
	};
	if (request.metrics.length === 0) return fail('select at least one metric');
	if (request.metrics.length > chartBuilderMaxMetrics) {
		return fail(`select no more than ${chartBuilderMaxMetrics} metrics`);
	}

	if (request.period === '') request.period = 'annual';
	if (request.period !== 'annual' && request.period !== 'quarter' && request.period !== 'ttm') {
		return fail('choose annual, quarterly, or ttm');
	}

	request.limit = request.period !== 'annual' ? 20 : 10;
	const rawLimit = first('limit').trim();
	if (rawLimit !== '') {
		// strconv.ParseInt(rawLimit, 10, 32): optional sign, decimal digits only.
		const limit = /^[+-]?\d+$/.test(rawLimit) ? Number(rawLimit) : NaN;
		if (!Number.isFinite(limit) || limit < 1 || limit > chartBuilderMaxLimit) {
			return fail(`period count must be between 1 and ${chartBuilderMaxLimit}`);
		}
		request.limit = limit;
	}

	request.compare = splitChartBuilderValues(values.getAll('compare'), true);
	if (request.compare.length > chartBuilderMaxPeers) {
		return fail(`compare with no more than ${chartBuilderMaxPeers} symbols`);
	}

	if (request.chartType === '') request.chartType = 'bar';
	if (request.chartType !== 'bar' && request.chartType !== 'line') {
		return fail('choose a bar or line chart');
	}

	if (values.has('growth')) {
		request.showGrowth = values.getAll('growth').some((v) => {
			const value = v.trim().toLowerCase();
			return value === 'true' || value === '1' || value === 'on';
		});
	}

	return { ok: true, request };
}

/** splitChartBuilderValues: comma-split, trimmed, optionally upper-cased, deduped in order. */
export function splitChartBuilderValues(raw: readonly string[], uppercase: boolean): string[] {
	const seen = new Set<string>();
	const values: string[] = [];
	for (const group of raw) {
		for (let value of group.split(',')) {
			value = value.trim();
			if (uppercase) value = value.toUpperCase();
			if (value === '' || seen.has(value)) continue;
			seen.add(value);
			values.push(value);
		}
	}
	return values;
}

/** Backend query parameters (GetChartBuilderParams / GetChartBuilderCSVParams). */
export function chartBuilderBackendQuery(request: ChartBuilderRequest): Record<string, string | number> {
	const query: Record<string, string | number> = {
		metrics: request.metrics.join(','),
		period: request.period,
		limit: request.limit
	};
	const compare = request.compare.join(',');
	if (compare !== '') query.compare = compare;
	return query;
}

/** mapChartBuilderResult. Go rendered the chart HTML here; v2 hands over the builder inputs. */
export function mapChartBuilderResult(
	symbol: string,
	request: ChartBuilderRequest,
	response: ChartBuilderResponse
): ChartBuilderResultVM {
	const periods = response.periods ?? [];
	const responseSeries = response.series ?? [];
	const companies = response.companies ?? [];
	const labels = periods.map((p) => p.label);

	const comparison = companies.length > 1;
	const series: MultiSeriesData[] = [];
	const formats = new Set<string>();
	const metricLabels: string[] = [];
	const seenLabels = new Set<string>();
	let hasValue = false;
	for (const item of responseSeries) {
		const name = comparison ? item.symbol + ' · ' + item.label : item.label;
		const values = (item.values ?? []).map((v) => v ?? null);
		series.push({ name, format: item.format, values });
		formats.add(item.format);
		if (!seenLabels.has(item.label)) {
			seenLabels.add(item.label);
			metricLabels.push(item.label);
		}
		if (values.some((v) => v !== null)) hasValue = true;
	}

	if (labels.length === 0 || series.length === 0 || !hasValue) {
		return emptyChartBuilderResult('No chart data is available for this selection.');
	}

	let subject = symbol;
	for (const company of companies) {
		const name = (company.name ?? '').trim();
		if (company.symbol.toUpperCase() === symbol.toUpperCase() && name !== '') {
			subject = name;
			break;
		}
	}
	const title = `${subject} — ${metricLabels.join(', ')} (${chartBuilderPeriodLabel(request.period)})`;

	return {
		hasData: true,
		error: '',
		title,
		chartType: request.chartType,
		period: request.period,
		mixedUnits: formats.size > 1,
		showGrowth: request.showGrowth,
		csvURL: chartBuilderCSVURL(symbol, request),
		growth: mapChartBuilderGrowth(response),
		seriesCount: series.length,
		chartID: 'chart_builder_' + symbol.toLowerCase(),
		labels,
		series
	};
}

/** mapChartBuilderGrowth: one row per series that carries growth stats. */
export function mapChartBuilderGrowth(response: ChartBuilderResponse): ChartBuilderGrowthTableVM {
	const responseSeries = response.series ?? [];
	const periodSet = new Set<string>();
	for (const series of responseSeries) {
		if (!series.growth) continue;
		for (const point of series.growth.yoy ?? []) periodSet.add(point.periodLabel);
	}

	const periods: string[] = [];
	for (const period of response.periods ?? []) {
		if (periodSet.has(period.label)) periods.push(period.label);
	}

	const comparison = (response.companies ?? []).length > 1;
	const rows: ChartBuilderGrowthRowVM[] = [];
	for (const series of responseSeries) {
		const growth = series.growth;
		if (!growth) continue;
		const label = comparison ? series.symbol + ' · ' + series.label : series.label;
		const byPeriod = new Map((growth.yoy ?? []).map((point) => [point.periodLabel, point]));
		const yoy = periods.map((period) => {
			const point = byPeriod.get(period);
			if (!point) return '—';
			return formatChartBuilderChange(point.absolute, point.percent, series.format, series.currency);
		});
		rows.push({
			label,
			yoy,
			totalChange: formatChartBuilderChange(growth.totalChange, growth.totalChangePercent, series.format, series.currency),
			cagr: formatChartBuilderPercent(growth.cagr)
		});
	}

	return { periods, rows };
}

/** chartBuilderCSVURL: url.Values.Encode() (keys sorted, QueryEscape). */
export function chartBuilderCSVURL(symbol: string, request: ChartBuilderRequest): string {
	const values: [string, string][] = [
		['metrics', request.metrics.join(',')],
		['period', request.period],
		['limit', String(request.limit)]
	];
	if (request.compare.length > 0) values.push(['compare', request.compare.join(',')]);
	values.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
	const encoded = values.map(([k, v]) => goQueryEscape(k) + '=' + goQueryEscape(v)).join('&');
	return '/portfolio/' + symbol.toLowerCase() + '/builder/csv?' + encoded;
}

/** url.QueryEscape: everything but A-Za-z0-9-_.~ escaped, space as "+". */
function goQueryEscape(s: string): string {
	return encodeURIComponent(s)
		.replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
		.replace(/%20/g, '+');
}

/** fmt "%+.Nf". */
function signedFixed(value: number, prec: number): string {
	const s = formatFloat(value, prec);
	return s.startsWith('-') ? s : '+' + s;
}

type Num = number | null | undefined;

/** formatChartBuilderChange: "+12.3% (+$1.20B)", "—" when both are missing. */
export function formatChartBuilderChange(absolute: Num, percent: Num, format: SeriesFormat | string, currency: string | null | undefined): string {
	if (absolute == null && percent == null) return '—';
	const parts: string[] = [];
	if (percent != null) parts.push(formatChartBuilderPercent(percent));
	if (absolute != null) parts.push('(' + formatChartBuilderAbsolute(absolute, format, currency) + ')');
	return parts.join(' ');
}

/** formatChartBuilderPercent: "%+.1f%%" of a fraction; "—" for nil/NaN/Inf. */
export function formatChartBuilderPercent(value: Num): string {
	if (value == null || !Number.isFinite(value)) return '—';
	return signedFixed(value * 100, 1) + '%';
}

/**
 * formatChartBuilderAbsolute. Go oddity kept: the currency, per-share and
 * default branches print a "+" for gains but no "-" for losses (they format
 * the absolute value), so a decline shows as e.g. "$1.20B".
 */
export function formatChartBuilderAbsolute(value: number, format: SeriesFormat | string, currency: string | null | undefined): string {
	const sign = value > 0 ? '+' : '';
	const abs = Math.abs(value);
	let suffix = '';
	let scale = 1;
	if (abs >= 1_000_000_000_000) [scale, suffix] = [1_000_000_000_000, 'T'];
	else if (abs >= 1_000_000_000) [scale, suffix] = [1_000_000_000, 'B'];
	else if (abs >= 1_000_000) [scale, suffix] = [1_000_000, 'M'];
	else if (abs >= 1_000) [scale, suffix] = [1_000, 'K'];

	switch (format) {
		case 'percent':
			return signedFixed(value * 100, 1) + ' pp';
		case 'ratio':
			return signedFixed(value, 2) + 'x';
		case 'perShare':
			return sign + chartBuilderCurrencyPrefix(currency) + formatFloat(abs, 2);
		case 'currency':
			return sign + chartBuilderCurrencyPrefix(currency) + formatFloat(abs / scale, 2) + suffix;
		default:
			return sign + formatFloat(abs / scale, 2) + suffix;
	}
}

/** chartBuilderCurrencyPrefix. */
export function chartBuilderCurrencyPrefix(currency: string | null | undefined): string {
	if (currency == null) return '$';
	const code = currency.trim().toUpperCase();
	switch (code) {
		case 'EUR':
			return '€';
		case 'GBP':
			return '£';
		case 'JPY':
			return '¥';
		case 'USD':
		case '':
			return '$';
		default:
			return code + ' ';
	}
}

/**
 * chartBuilderBackendError: the backend body's "reason", else "message", else
 * the fallback. Like json.Unmarshal into {Reason, Message string}, a body whose
 * reason/message is not a string counts as unparseable.
 */
export function chartBuilderBackendError(body: string, fallback: string): string {
	if (body.length === 0) return fallback;
	let payload: unknown;
	try {
		payload = JSON.parse(body);
	} catch {
		return fallback;
	}
	if (payload === null) return fallback;
	if (typeof payload !== 'object' || Array.isArray(payload)) return fallback;
	const { reason, message } = payload as { reason?: unknown; message?: unknown };
	if ((reason != null && typeof reason !== 'string') || (message != null && typeof message !== 'string')) return fallback;
	const r = (reason ?? '').trim();
	if (r !== '') return r;
	const m = (message ?? '').trim();
	if (m !== '') return m;
	return fallback;
}
