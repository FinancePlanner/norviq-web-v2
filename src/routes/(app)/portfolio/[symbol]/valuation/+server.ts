import { json, redirect, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature, isPro } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { saveValuation } from '#lib/features/stock/fragments.server.js';

// POST /portfolio/{symbol}/valuation — StockValuationSave
// (r.With(requireValuationCases), then its own isPro check). A fetch from the
// dialog gets JSON (the htmx swap / HX-Redirect); a plain form post gets the
// 303 Go sent without HX-Request.
export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.ValuationCases, 'Valuation cases');
	if (!isPro(await loadBillingContext(event)))
		return text('Pro subscription required', { status: 402 });
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		return text('Invalid form', { status: 400 });
	}
	if (event.params.symbol.trim() === '') return text('Valuation unavailable', { status: 400 });
	const result = await saveValuation(event, event.params.symbol, form);
	const wantsJSON = (event.request.headers.get('accept') ?? '').includes('application/json');
	if (!wantsJSON && 'redirect' in result) redirect(303, result.redirect);
	return json(result);
};
