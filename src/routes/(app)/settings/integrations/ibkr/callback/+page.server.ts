import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { integrationsErrorURL } from '#lib/features/settings-admin/integrations/load.server.js';

// Port of SettingsIBKRCallback (settings_ibkr.go), behind requireBrokerSync.
// A page load rather than +server.ts so the 402 Pro gate renders in the shell.
export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.BrokerSync, 'Broker sync');
	const status = (event.url.searchParams.get('status') ?? '').trim().toLowerCase();
	const errMsg = (event.url.searchParams.get('error') ?? '').trim();
	if (status === 'success') redirect(303, '/settings/integrations?ibkr=connected');
	redirect(303, integrationsErrorURL(errMsg || 'IBKR connection failed.'));
};
