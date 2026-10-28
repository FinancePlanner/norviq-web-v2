import { redirect, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { config } from '#lib/server/env.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import {
	loadBanksVM,
	validatedBankHostedURL,
	type BankLinkSession
} from '#lib/features/settings-admin/banks/load.server.js';

// Port of SettingsBanks (settings_banks.go), also served by Settings case
// "banks". The page itself is not gated (non-Pro readers see the upsell); every
// mutation is requireBankSync. Go's hx-post buttons re-rendered the page body;
// here they are form actions and the page reloads its data.

export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	return { vm: await loadBanksVM(event, isPro) };
};

const gate = (event: RequestEvent) => requireFeature(event, Feature.BankSync, 'Bank sync');

async function formID(event: RequestEvent): Promise<{ id: string; form: FormData }> {
	const form = await event.request.formData();
	return { id: encodeURIComponent(String(form.get('id') ?? '')), form };
}

export const actions: Actions = {
	sync: async (event) => {
		await gate(event);
		const { id } = await formID(event);
		try {
			await apiJSON(event, 'POST', `/v1/banks/connections/${id}/sync`);
		} catch (err) {
			console.error('bank sync', err);
		}
	},

	disconnect: async (event) => {
		await gate(event);
		const { id } = await formID(event);
		try {
			await apiJSON(event, 'DELETE', `/v1/banks/connections/${id}`);
		} catch (err) {
			console.error('bank disconnect', err);
		}
	},

	import: async (event) => {
		await gate(event);
		const { id, form } = await formID(event);
		const pillar = String(form.get('pillar') ?? '');
		try {
			await apiJSON(event, 'POST', `/v1/banks/transactions/${id}/import`, { pillar });
		} catch (err) {
			console.error('bank import', err);
		}
	},

	dismiss: async (event) => {
		await gate(event);
		const { id } = await formID(event);
		try {
			await apiJSON(event, 'POST', `/v1/banks/transactions/${id}/dismiss`);
		} catch (err) {
			console.error('bank dismiss', err);
		}
	},

	// SettingsBanksConnectEU: start a hosted bank consent and send the reader
	// to the bank's consent page.
	connectEU: async (event) => {
		await gate(event);
		const form = await event.request.formData();
		const institutionId = String(form.get('institution_id') ?? '').trim();
		if (institutionId === '') redirect(303, '/settings/banks');
		const redirectURI = config().publicBaseURL + '/settings/banks';
		let session: BankLinkSession;
		try {
			session = await apiJSON<BankLinkSession>(event, 'POST', '/v1/banks/link-session', { institutionId, redirectURI });
		} catch (err) {
			console.error('bank hosted link', err);
			redirect(303, '/settings/banks?bank=error');
		}
		if (!session?.hostedURL) {
			console.error('bank hosted link: no hostedURL');
			redirect(303, '/settings/banks?bank=error');
		}
		const hostedURL = validatedBankHostedURL(session.hostedURL);
		if (!hostedURL) {
			console.error('invalid bank hosted link');
			redirect(303, '/settings/banks?bank=error');
		}
		redirect(303, hostedURL);
	}
};
