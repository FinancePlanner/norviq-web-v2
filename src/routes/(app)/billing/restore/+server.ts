import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { isPro, type BillingContext } from '#lib/billing.js';
import { errorMessage } from '#lib/features/settings-admin/api-errors.js';

// Port of norviq-web BillingRestore (billing.go). Only the JSON branch: the
// htmx branch rendered the #billing-status fragment, which v2 replaces with
// invalidateAll() (billing-client.ts) or the subscription page's onRestore.
export const POST: RequestHandler = async (event) => {
	let ctx: BillingContext | undefined;
	try {
		ctx = await apiJSON<BillingContext>(event, 'POST', '/v1/billing/restore');
	} catch (err) {
		return json({ error: errorMessage(err, 'Could not restore purchases.') }, { status: 502 });
	}
	if (!ctx) return json({ error: 'Could not restore purchases.' }, { status: 502 });
	return json({ isPremium: isPro(ctx), plan: ctx.plan });
};
