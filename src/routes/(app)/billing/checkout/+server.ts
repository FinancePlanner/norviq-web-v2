import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { config, DEFAULT_IOS_APP_STORE_URL } from '#lib/server/env.js';

// Port of norviq-web BillingCheckout (billing.go): with RevenueCat web billing
// configured, checkout happens on /settings/subscription; otherwise the
// reader is sent to the App Store.
export const GET: RequestHandler = () => {
	const cfg = config();
	if (cfg.revenueCatWebAPIKey.trim() !== '') redirect(303, '/settings/subscription');
	redirect(303, cfg.iosAppStoreURL || DEFAULT_IOS_APP_STORE_URL);
};
