import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';

// SettingsBanksExchange: completes Plaid Link by exchanging the public token.
export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.BankSync, 'Bank sync');
	let body: { publicToken?: unknown; institutionId?: unknown; institutionName?: unknown };
	try {
		const raw = await event.request.text();
		if (raw.length > 16 * 1024) throw new Error('too large');
		body = JSON.parse(raw);
	} catch {
		return text('invalid request', { status: 400 });
	}
	const publicToken = typeof body?.publicToken === 'string' ? body.publicToken : '';
	if (publicToken === '') return text('invalid request', { status: 400 });
	const institutionId = typeof body.institutionId === 'string' ? body.institutionId : '';
	const institutionName = typeof body.institutionName === 'string' ? body.institutionName : '';
	// bankExchangeRequest: institutionId/institutionName are omitempty.
	const payload: Record<string, string> = { publicToken };
	if (institutionId) payload.institutionId = institutionId;
	if (institutionName) payload.institutionName = institutionName;
	try {
		await apiJSON(event, 'POST', '/v1/banks/connections', payload);
	} catch (err) {
		console.error('bank exchange', err);
		return text('Could not connect your bank.', { status: 502 });
	}
	return new Response(null, { status: 204 });
};
