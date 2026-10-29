import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { chartBuilderCSVResponse } from '#lib/features/stock/builder/load.server.js';

// GET /portfolio/{symbol}/builder/csv (handlers.StockChartBuilderCSV): proxies
// the backend CSV export unchanged; errors are plain text with Go's statuses.
export const GET: RequestHandler = async (event) => {
	await requireFeature(event, Feature.MarketFundamentals, 'Stock fundamentals');
	return chartBuilderCSVResponse(event, event.params.symbol);
};
