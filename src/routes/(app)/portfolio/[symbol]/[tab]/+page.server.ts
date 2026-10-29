import type { PageServerLoad } from './$types';
import { loadStockPage } from '#lib/features/stock/page.server.js';

// GET /portfolio/{symbol}/{tab} and the gated literal tabs (builder,
// statements, ownership, analysis, forecast, compare, earnings) —
// handlers.StockDetail. The gate is applied in loadStockPage.
export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	return loadStockPage(event, event.params.tab, isPro);
};
