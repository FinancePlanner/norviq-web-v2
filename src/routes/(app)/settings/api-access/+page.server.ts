import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { config } from '#lib/server/env.js';
import { requireFeature } from '#lib/server/guards.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { Feature, isPro } from '#lib/billing.js';
import {
	API_ACCESS_SCOPES,
	DEFAULT_MCP_ENDPOINT,
	buildConnectPanel,
	type APITokenRow
} from '#lib/features/settings-admin/api-access/connect.js';
import {
	createPersonalAccessToken,
	listPersonalAccessTokens,
	revokePersonalAccessToken
} from '#lib/features/settings-admin/api-access/tokens.server.js';
import {
	formatMonthDayYear,
	formatRelativeTime
} from '#lib/features/settings-admin/api-access/time.js';

// Port of norviq-web Settings case "api-access" (LoadAPIAccessVM +
// AttachConnectPanel) and SettingsAPIAccessCreate / SettingsAPIAccessRevoke.

// Same session keys as Go (scs one-shot flashes).
const FLASH_NEW_TOKEN = 'flashNewToken';
const FLASH_NEW_TOKEN_CLIENT = 'flashNewTokenClient';
const FLASH_NEW_TOKEN_ID = 'flashNewTokenID';

function mcpEndpoint(): string {
	const url = config().mcpPublicURL;
	return url ? url.replace(/\/+$/, '') + '/mcp' : DEFAULT_MCP_ENDPOINT;
}

async function popString(event: RequestEvent, key: string): Promise<string> {
	const value = event.locals.session.get<unknown>(key);
	if (value === undefined) return '';
	await event.locals.session.remove(key);
	return typeof value === 'string' ? value : '';
}

export const load: PageServerLoad = async (event) => {
	const { isPro: pro } = await event.parent();
	let errorMessage = '';
	let successMessage = '';
	const tokens: APITokenRow[] = [];

	if (pro) {
		try {
			const now = new Date();
			for (const t of await listPersonalAccessTokens(event)) {
				tokens.push({
					id: t.id,
					name: t.name,
					scopes: t.scopes ?? [],
					expires: formatMonthDayYear(new Date(t.expiresAt)),
					created: formatMonthDayYear(new Date(t.createdAt)),
					lastUsed: t.lastUsedAt ? formatRelativeTime(new Date(t.lastUsedAt), now) : ''
				});
			}
		} catch {
			errorMessage = 'Could not load your tokens.';
		}
	}

	let newToken = '';
	let activeClient = '';
	let verifyTokenID = '';
	const flash = await popString(event, FLASH_NEW_TOKEN);
	if (flash !== '') {
		newToken = flash;
		successMessage = "Token created. Copy it now — it won't be shown again.";
		activeClient = await popString(event, FLASH_NEW_TOKEN_CLIENT);
		verifyTokenID = await popString(event, FLASH_NEW_TOKEN_ID);
	}

	// Built after the flashes are popped: the snippets embed the plaintext
	// token, which only exists on this one render.
	const endpoint = mcpEndpoint();
	const panel = buildConnectPanel(endpoint, newToken, activeClient, verifyTokenID, Date.now());

	return {
		isPro: pro,
		tokens,
		newToken,
		mcpEndpoint: endpoint,
		availableScopes: API_ACCESS_SCOPES,
		successMessage,
		errorMessage,
		activeClient: panel.activeClient,
		clients: panel.clients,
		verifyTokenID,
		verify: panel.verify
	};
};

export const actions: Actions = {
	// POST /settings/api-access (Go: r.With(requireMCPAccess)).
	create: async (event) => {
		await requireFeature(event, Feature.MCPAccess, 'API access');
		if (!isPro(await loadBillingContext(event))) {
			return fail(403, { errorMessage: 'Norviq Pro is required to create tokens.' });
		}
		const form = await event.request.formData();
		const name = String(form.get('name') ?? '').trim();
		const scopes = form.getAll('scopes').map(String);
		if (name === '' || scopes.length === 0) {
			return fail(400, { errorMessage: 'Enter a name and select at least one permission.' });
		}
		// strconv.Atoi: anything but a plain integer is 0, which the backend defaults.
		const rawDays = String(form.get('expiresInDays') ?? '').trim();
		const expiresInDays = /^[+-]?\d+$/.test(rawDays) ? Number.parseInt(rawDays, 10) : 0;

		let created;
		try {
			created = await createPersonalAccessToken(event, name, scopes, expiresInDays);
		} catch {
			return fail(502, { errorMessage: 'Could not create the token.' });
		}
		// Go's htmx path: stash the token in one-shot flashes and refresh the
		// page so the new token, the connect tab and the verify wizard show once.
		await event.locals.session.set(FLASH_NEW_TOKEN, created.token);
		await event.locals.session.set(FLASH_NEW_TOKEN_CLIENT, String(form.get('client') ?? '').trim());
		await event.locals.session.set(FLASH_NEW_TOKEN_ID, created.id);
		redirect(303, '/settings/api-access');
	},

	// POST /settings/api-access/{id}/revoke
	revoke: async (event) => {
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (id === '') return fail(400, { errorMessage: 'Could not revoke the token.' });
		try {
			await revokePersonalAccessToken(event, id);
		} catch {
			return fail(502, { errorMessage: 'Could not revoke the token.' });
		}
		redirect(303, '/settings/api-access');
	}
};
