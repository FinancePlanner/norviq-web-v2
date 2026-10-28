import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import type { BankLinkSession } from '#lib/features/settings-admin/banks/load.server.js';

// SettingsBanksLinkSession: a Plaid link token for the browser SDK (bank-link).
export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.BankSync, 'Bank sync');
	let session: BankLinkSession;
	try {
		session = await apiJSON<BankLinkSession>(event, 'POST', '/v1/banks/link-session');
	} catch (err) {
		console.error('bank link session', err);
		return text('Could not start bank connection.', { status: 502 });
	}
	return json({ linkToken: session?.linkToken ?? null });
};
