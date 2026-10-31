import { redirect, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { apiErrorMessage, errorMessage } from '#lib/features/settings-admin/api-errors.js';
import {
	formatCodeLifetime,
	integrationsErrorURL,
	loadIntegrationsVM,
	loadMCPStatusVM,
	loadTelegramVM,
	telegramStatusURL,
	type TelegramCode
} from '#lib/features/settings-admin/integrations/load.server.js';
import { telegramAlertLabel } from '#lib/features/settings-admin/integrations/types.js';

// Port of norviq-web Settings case "integrations" (settings.go) plus the
// Telegram (settings_telegram.go) and IBKR (settings_ibkr.go) handlers. The Go
// POST routes become form actions on this page; the IBKR callback keeps its
// URL (ibkr/callback/+page.server.ts).

async function loadVM(event: RequestEvent, query: URLSearchParams | null, isPro: boolean) {
	const [vm, mcp, telegram] = await Promise.all([
		loadIntegrationsVM(event, query),
		loadMCPStatusVM(event, isPro),
		loadTelegramVM(event)
	]);
	vm.mcp = mcp;
	vm.telegram = telegram;
	return vm;
}

export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	return { vm: await loadVM(event, event.url.searchParams, isPro) };
};

export const actions: Actions = {
	// SettingsTelegramConnect mints a pairing code and renders the page with it.
	// It returns data instead of redirecting on purpose: the plaintext code
	// exists on exactly this one response.
	telegramConnect: async (event) => {
		const form = await event.request.formData();
		// The card requires ticking the "not end-to-end encrypted" disclosure;
		// enforce it here too so no code is minted without that acknowledgement.
		if (form.get('acknowledge_unencrypted') !== '1') {
			redirect(
				303,
				telegramStatusURL(
					'error',
					'Confirm that you understand Telegram is not end-to-end encrypted before connecting.'
				)
			);
		}
		let code: TelegramCode;
		try {
			code = await apiJSON<TelegramCode>(event, 'POST', '/v1/integrations/telegram/code');
		} catch (err) {
			console.warn('telegram code failed', err);
			redirect(303, telegramStatusURL('error', 'Could not generate a Telegram code.'));
		}
		return {
			telegramCode: {
				code: code.code,
				deepLink: code.deepLink,
				codeExpiresIn: formatCodeLifetime(code.expiresAt)
			}
		};
	},

	telegramDisconnect: async (event) => {
		try {
			await apiJSON(event, 'DELETE', '/v1/integrations/telegram');
		} catch (err) {
			console.warn('telegram disconnect failed', err);
			redirect(303, telegramStatusURL('error', 'Could not disconnect Telegram.'));
		}
		redirect(303, telegramStatusURL('disconnected'));
	},

	telegramAlerts: async (event) => {
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			redirect(303, telegramStatusURL('error', 'Invalid form submission.'));
		}
		const kind = String(form.get('kind') ?? '').trim();
		if (kind === '') redirect(303, telegramStatusURL('error', 'Invalid form submission.'));
		const enabled = form.get('enabled') === 'true';
		try {
			await apiJSON(event, 'PUT', '/v1/integrations/telegram/preferences', {
				kind,
				enabled,
				quietHoursStart: null,
				quietHoursEnd: null,
				timezone: ''
			});
		} catch (err) {
			console.warn('telegram preference update failed', err);
			redirect(303, telegramStatusURL('error', 'Could not update that alert.'));
		}
		redirect(303, telegramStatusURL(enabled ? 'alert-on' : 'alert-off', telegramAlertLabel(kind)));
	},

	ibkrConnect: async (event) => {
		await requireFeature(event, Feature.BrokerSync, 'Broker sync');
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			redirect(303, integrationsErrorURL('Invalid form submission.'));
		}
		const token = String(form.get('token') ?? '').trim();
		const queryId = String(form.get('queryId') ?? '').trim();
		if (token === '' || queryId === '')
			redirect(303, integrationsErrorURL('Token and query ID are required.'));
		try {
			await apiJSON(event, 'POST', '/v1/brokers/ibkr/connect/credentials', { token, queryId });
		} catch (err) {
			if (!isAPIError(err)) {
				console.warn('ibkr credentials connect failed', err);
				redirect(303, integrationsErrorURL('Could not reach broker service.'));
			}
			console.warn('ibkr credentials connect rejected', err.status);
			redirect(
				303,
				integrationsErrorURL(apiErrorMessage(err.body, 'Could not save IBKR credentials.'))
			);
		}
		redirect(303, '/settings/integrations?ibkr=connected');
	},

	ibkrSync: async (event) => {
		await requireFeature(event, Feature.BrokerSync, 'Broker sync');
		let sync: { inserted?: number | null; updated?: number | null; removed?: number | null };
		try {
			sync = await apiJSON(event, 'POST', '/v1/brokers/ibkr/sync');
		} catch (err) {
			console.warn('ibkr sync failed', err);
			redirect(303, integrationsErrorURL(errorMessage(err, 'Could not sync IBKR holdings.')));
		}
		redirect(
			303,
			`/settings/integrations?ibkr=synced&inserted=${sync?.inserted ?? 0}&updated=${sync?.updated ?? 0}&removed=${sync?.removed ?? 0}`
		);
	},

	ibkrDisconnect: async (event) => {
		await requireFeature(event, Feature.BrokerSync, 'Broker sync');
		try {
			await apiJSON(event, 'DELETE', '/v1/brokers/ibkr/connection');
		} catch (err) {
			console.warn('ibkr disconnect failed', err);
			redirect(303, integrationsErrorURL(errorMessage(err, 'Could not disconnect IBKR.')));
		}
		redirect(303, '/settings/integrations?ibkr=disconnected');
	}
};
