import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature, isPro } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { loadValuationForm } from '#lib/features/stock/fragments.server.js';
import type { ValuationResult } from '#lib/features/stock/detail.js';

// GET /portfolio/{symbol}/valuation/edit — StockValuationForm
// (r.With(requireValuationCases), then its own isPro check).
export const GET: RequestHandler = async (event) => {
	await requireFeature(event, Feature.ValuationCases, 'Valuation cases');
	if (!isPro(await loadBillingContext(event)))
		return text('Pro subscription required', { status: 402 });
	if (event.params.symbol.trim() === '') return text('Valuation unavailable', { status: 400 });
	const result: ValuationResult = {
		panel: 'form',
		vm: await loadValuationForm(event, event.params.symbol)
	};
	return json(result);
};
