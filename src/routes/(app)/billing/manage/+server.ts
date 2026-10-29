import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { safeBillingRedirect } from '#lib/features/settings-admin/subscription.js';

type BillingManagementURLResponse = components['schemas']['BillingManagementURLResponse'];

const MANAGE_ERROR = '/settings/subscription?manage_error=1';

// Port of norviq-web BillingManage (billing.go): ask the backend for the
// store's management URL and send the reader there, but only to an HTTPS
// billing-portal host (safeBillingRedirect). Anything else lands back on the
// subscription page with ?manage_error=1.
export const GET: RequestHandler = async (event) => {
	let resp: BillingManagementURLResponse | undefined;
	try {
		resp = await apiJSON<BillingManagementURLResponse>(event, 'POST', '/v1/billing/management-url');
	} catch (err) {
		console.warn('billing management url', err);
		redirect(303, MANAGE_ERROR);
	}
	const target = safeBillingRedirect(resp?.managementUrl);
	redirect(303, target ?? MANAGE_ERROR);
};
