import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { config } from '#lib/server/env.js';
import { errorMessage } from '#lib/features/settings-admin/api-errors.js';
import { subscriptionVM } from '#lib/features/settings-admin/subscription.js';

type CouponRedemptionResponse = components['schemas']['CouponRedemptionResponse'];

// Go Settings case "subscription": LoadSubscriptionVM. The htmx
// /settings/subscription/status fragment is gone: billing-client.ts calls
// invalidateAll(), which reruns this load.
export const load: PageServerLoad = async (event) => {
	const billing = await loadBillingContext(event);
	return {
		vm: subscriptionVM(config(), event.locals.session.auth?.userId, billing, event.url.searchParams)
	};
};

export const actions: Actions = {
	// Go BillingCouponRedeem (POST /billing/coupons/redeem), htmx branch: a
	// success redirects to ?upgraded=1, a failure fills #coupon-result.
	redeem: async (event) => {
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			return { couponError: 'Invalid coupon submission.' };
		}
		const code = String(form.get('code') ?? '').trim();
		if (code === '') return { couponError: 'Enter a coupon code.' };
		try {
			await apiJSON<CouponRedemptionResponse>(event, 'POST', '/v1/billing/coupon/redeem', { code });
		} catch (err) {
			return { couponError: errorMessage(err, 'Could not redeem coupon.') };
		}
		redirect(303, '/settings/subscription?upgraded=1');
	}
};
