import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature, isPro } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { loadStockEarningsTranscript } from '#lib/features/stock/fragments.server.js';

// GET /portfolio/{symbol}/earnings/transcript?date= — StockEarningsTranscript
// (r.With(requireEarningsText), then its own isPro check). Answers the panel
// data for the transcript dialog.
export const GET: RequestHandler = async (event) => {
	await requireFeature(event, Feature.EarningsText, 'Earnings');
	if (!isPro(await loadBillingContext(event))) return text('Pro required', { status: 403 });
	const vm = await loadStockEarningsTranscript(
		event,
		event.params.symbol,
		event.url.searchParams.get('date') ?? ''
	);
	return json(vm);
};
