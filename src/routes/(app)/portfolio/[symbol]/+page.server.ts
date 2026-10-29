import type { PageServerLoad } from './$types';
import { loadStockPage } from '#lib/features/stock/page.server.js';

// GET /portfolio/{symbol} — handlers.StockDetail (overview tab).
export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	return loadStockPage(event, '', isPro);
};
