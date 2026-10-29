import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { config } from '#lib/server/env.js';
import { apiErrorMessage } from '#lib/features/settings-admin/api-errors.js';

type OAuthStartResponse = components['schemas']['OAuthStartResponse'];

// Go AuthHandler.OAuthLinkStart. The session keys are Go's
// internal/session/oauth.go names, so the auth port's
// /auth/oauth/{provider}/callback can finish the link (intent "link").
const KEY_OAUTH_PROVIDER = 'oauthProvider';
const KEY_OAUTH_REDIRECT_URI = 'oauthRedirectURI';
const KEY_OAUTH_FLOW_ID = 'oauthFlowId';
const KEY_OAUTH_INTENT = 'oauthIntent';

const PROVIDERS = new Set(['google', 'apple', 'x']);
const FALLBACK = 'Could not start account linking. Please try again.';

export const GET: RequestHandler = async (event) => {
	const provider = event.params.provider.trim().toLowerCase();
	if (!PROVIDERS.has(provider)) return new Response('Unsupported provider\n', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
	if (!event.locals.session.isAuthenticated) redirect(303, '/login');

	const redirectURI = `${config().publicBaseURL}/auth/oauth/${provider}/callback`;
	let resp: OAuthStartResponse;
	try {
		resp = await apiJSON<OAuthStartResponse>(event, 'POST', `/v1/auth/oauth/${provider}/link/start`, { redirectURI });
	} catch (err) {
		if (!isAPIError(err)) console.error('oauth link start', provider, err);
		const message = isAPIError(err) ? apiErrorMessage(err.body, FALLBACK) : FALLBACK;
		redirect(303, '/settings/profile?connected_error=' + encodeURIComponent(message));
	}

	const session = event.locals.session;
	await session.set(KEY_OAUTH_PROVIDER, provider);
	await session.set(KEY_OAUTH_REDIRECT_URI, redirectURI);
	await session.set(KEY_OAUTH_FLOW_ID, resp.flowId);
	await session.set(KEY_OAUTH_INTENT, 'link');
	redirect(303, resp.authorizationURL);
};
