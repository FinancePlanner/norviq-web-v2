import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api } from '#lib/server/api.js';
import type { components } from '#lib/api/schema.js';
import { apiErrorMessage } from '#lib/features/settings-admin/api-errors.js';
import { loadAIConsentVM } from '#lib/features/settings-admin/ai-providers/ai-consent.server.js';
import {
	buildAIProviderRows,
	parseCredentialID,
	truncateMessage,
	type UserAIProviderKind
} from '#lib/features/settings-admin/ai-providers/providers.js';

// Port of norviq-web Settings case "ai-providers" (LoadAIProvidersVM) and
// SettingsAIProvidersConnect / Verify / Disconnect. The submitted key goes
// straight to the backend and is never echoed back, logged or stored.

type CreateAICredentialBody = components['schemas']['CreateUserAIProviderCredentialRequest'];

export const load: PageServerLoad = async (event) => {
	const consent = await loadAIConsentVM(event);
	let errorMessage = '';
	let providers = buildAIProviderRows([], new Date());
	try {
		const res = await api(event).GET('/v1/ai/credentials');
		if (res.response.ok && res.data) providers = buildAIProviderRows(res.data.items ?? [], new Date());
		else errorMessage = 'Could not load your provider keys.';
	} catch (err) {
		console.warn('list ai credentials failed', err);
		errorMessage = 'Could not load your provider keys.';
	}
	return { consent, providers, errorMessage };
};

// refreshAIProviders: re-render the whole panel so every row reflects the change.
const refresh = () => redirect(303, '/settings/ai-providers');

export const actions: Actions = {
	// POST /settings/ai-providers
	connect: async (event) => {
		const form = await event.request.formData();
		const provider = String(form.get('provider') ?? '').trim();
		const apiKey = String(form.get('apiKey') ?? '').trim();
		let label = String(form.get('label') ?? '').trim();
		if (label === '') label = provider;
		if (provider === '' || apiKey === '') return fail(400, { errorMessage: 'Choose a provider and paste a key.' });

		const body: {
			provider: UserAIProviderKind;
			label: string;
			apiKey: string;
			baseURL?: string;
			defaultModel?: string;
		} = { provider: provider as UserAIProviderKind, label, apiKey };
		const baseURL = String(form.get('baseURL') ?? '').trim();
		if (baseURL !== '') body.baseURL = baseURL;
		const defaultModel = String(form.get('defaultModel') ?? '').trim();
		if (defaultModel !== '') body.defaultModel = defaultModel;

		let res;
		try {
			// The spec marks `verify` required; Go's client omits it (omitempty), so does this.
			res = await api(event).POST('/v1/ai/credentials', { body: body as CreateAICredentialBody });
		} catch (err) {
			console.warn('create ai credential failed', err);
			return fail(502, { errorMessage: 'Could not reach the provider service.' });
		}
		if (res.response.status !== 200 && res.response.status !== 201) {
			// Truncated: a provider error can echo part of the submitted key.
			return fail(res.response.status >= 400 ? res.response.status : 502, {
				errorMessage: truncateMessage(apiErrorMessage(res.error, 'Could not save this key.'), 200)
			});
		}
		refresh();
	},

	// POST /settings/ai-providers/{id}/verify
	verify: async (event) => {
		const id = parseCredentialID(String((await event.request.formData()).get('id') ?? ''));
		if (!id) return fail(400, { errorMessage: 'Could not test this key.' });
		try {
			// Go ignores the status: only a transport failure is an error.
			await api(event).POST('/v1/ai/credentials/{credentialId}/verify', { params: { path: { credentialId: id } } });
		} catch (err) {
			console.warn('verify ai credential failed', err);
			return fail(502, { errorMessage: 'Could not reach the provider service.' });
		}
		refresh();
	},

	// POST /settings/ai-providers/{id}/disconnect
	disconnect: async (event) => {
		const id = parseCredentialID(String((await event.request.formData()).get('id') ?? ''));
		if (!id) return fail(400, { errorMessage: 'Could not disconnect this key.' });
		try {
			await api(event).DELETE('/v1/ai/credentials/{credentialId}', { params: { path: { credentialId: id } } });
		} catch (err) {
			console.warn('delete ai credential failed', err);
			return fail(502, { errorMessage: 'Could not reach the provider service.' });
		}
		refresh();
	}
};
