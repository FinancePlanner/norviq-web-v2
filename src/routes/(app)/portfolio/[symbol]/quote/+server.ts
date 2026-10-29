import { error, json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadStockDetailQuote } from '#lib/features/stock/fragments.server.js';

// GET /portfolio/{symbol}/quote — StockDetailQuote. Go answered the hero quote
// row and the "Updated" line as out-of-band fragments; this answers their data.
export const GET: RequestHandler = async (event) => {
	if (event.params.symbol.trim() === '') return text('Symbol is required', { status: 400 });
	const vm = await loadStockDetailQuote(event, event.params.symbol);
	if (!vm) error(404, 'Not Found');
	return json(vm, { headers: { 'cache-control': 'no-store' } });
};
