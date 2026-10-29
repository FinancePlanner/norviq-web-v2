import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { chartBuilderChartResult } from '#lib/features/stock/builder/load.server.js';

// GET /portfolio/{symbol}/builder/chart (handlers.StockChartBuilderChart).
// Go answered the HTMX result fragment; v2 answers its view model as JSON and
// ChartBuilderResult.svelte renders it. Like Go, validation and backend
// errors are a 200 carrying `error`.
export const GET: RequestHandler = async (event) => {
	await requireFeature(event, Feature.MarketFundamentals, 'Stock fundamentals');
	const vm = await chartBuilderChartResult(event, event.params.symbol);
	return json(vm, { headers: { 'cache-control': 'private, no-store' } });
};
