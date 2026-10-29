import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import {
	oauthRedirectURI,
	parseOAuthProvider,
	saveOAuthFlow,
	type OAuthStartResponse
} from '#lib/features/auth-onboarding/oauth.server.js';

// GET /auth/oauth/{provider}/start (oauth.go OAuthStart)
export const GET: RequestHandler = async (event) => {
	const provider = parseOAuthProvider(event.params.provider);
	if (!provider) error(400, 'Unsupported provider');

	const redirectURI = oauthRedirectURI(provider);
	let resp: OAuthStartResponse;
	try {
		resp = await apiJSON<OAuthStartResponse>(
			event,
			'POST',
			`/v1/auth/oauth/${provider}/start`,
			{ redirectURI },
			{ auth: 'none' }
		);
	} catch (err) {
		if (isAPIError(err)) {
			console.error('oauth start rejected', { provider, redirectURI, status: err.status, body: err.body });
		} else {
			console.error('oauth start', { provider, redirectURI, err });
		}
		redirect(303, '/login?error=oauth');
	}
	if (!resp?.authorizationURL || !resp.flowId) redirect(303, '/login?error=oauth');

	await saveOAuthFlow(event, provider, redirectURI, resp.flowId, 'login');
	redirect(303, resp.authorizationURL, { external: true });
};
