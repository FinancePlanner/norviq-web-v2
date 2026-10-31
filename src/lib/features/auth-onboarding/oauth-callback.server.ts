// oauth.go OAuthCallback / OAuthCallbackPost / completeOAuthCallback.
//
// Errors on a login flow render the sign-in page with the message (Go's
// renderOAuthPageError, status 200); errors on a link flow go back to
// /settings/profile?connected_error=…
import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { postAuthRedirect, safeNextPath } from '#lib/server/onboarding.js';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';
import {
	apiErrorMessage,
	parseLoginOutcome,
	saveMFAChallenge,
	type LoginOutcomeBody
} from './auth.server.js';
import { OAuthKey, clearOAuthFlow, oauthIntent, parseOAuthProvider } from './oauth.server.js';

export type CallbackResult = { error: string; next: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pageError(event: RequestEvent, message: string): CallbackResult {
	return { error: message, next: safeNextPath(event.url.searchParams.get('next')) };
}

function redirectProfileOAuthError(message: string): never {
	redirect(303, '/settings/profile?connected_error=' + encodeURIComponent(message));
}

async function handleCallbackError(event: RequestEvent, message: string): Promise<CallbackResult> {
	if (oauthIntent(event) === 'link') {
		await clearOAuthFlow(event);
		redirectProfileOAuthError(message);
	}
	return pageError(event, message);
}

export async function oauthCallbackGET(event: RequestEvent): Promise<CallbackResult> {
	const code = (event.url.searchParams.get('code') ?? '').trim();
	const state = (event.url.searchParams.get('state') ?? '').trim();
	if (!code || !state) {
		return handleCallbackError(
			event,
			'Sign in was canceled or the provider response was incomplete.'
		);
	}
	return completeOAuthCallback(event, code, state);
}

export async function oauthCallbackPOST(event: RequestEvent): Promise<CallbackResult> {
	if ((event.params.provider ?? '').trim().toLowerCase() !== 'apple')
		error(405, 'Method not allowed');
	const form = await event.request.formData().catch(() => null);
	if (!form) return handleCallbackError(event, 'Could not read Apple sign-in response.');
	const code = String(form.get('code') ?? '').trim();
	const state = String(form.get('state') ?? '').trim();
	if (!code || !state) {
		if (String(form.get('error') ?? '').trim()) {
			return handleCallbackError(event, 'Sign in was canceled or denied by Apple.');
		}
		return handleCallbackError(
			event,
			'Sign in was canceled or the provider response was incomplete.'
		);
	}
	return completeOAuthCallback(event, code, state);
}

async function completeOAuthCallback(
	event: RequestEvent,
	code: string,
	state: string
): Promise<CallbackResult> {
	const provider = parseOAuthProvider(event.params.provider);
	if (!provider) error(400, 'Unsupported provider');

	const s = event.locals.session;
	const flowId = s.get<string>(OAuthKey.FlowID) ?? '';
	const storedProvider = s.get<string>(OAuthKey.Provider) ?? '';
	const redirectURI = s.get<string>(OAuthKey.RedirectURI) ?? '';
	if (!flowId || storedProvider !== provider || !redirectURI || !uuidPattern.test(flowId)) {
		return handleCallbackError(event, 'Your sign-in session expired. Please try again.');
	}

	if (oauthIntent(event) === 'link') {
		return completeOAuthLinkCallback(event, provider, flowId, code, state, redirectURI);
	}

	let body: LoginOutcomeBody;
	try {
		body = await apiJSON<LoginOutcomeBody>(
			event,
			'POST',
			`/v1/auth/oauth/${provider}/exchange`,
			{ flowId, code, state, redirectURI },
			{ auth: 'none' }
		);
	} catch (err) {
		if (!isAPIError(err)) console.error('oauth exchange', provider, err);
		return pageError(event, apiErrorMessage(err, 'Could not complete sign in. Please try again.'));
	}

	await clearOAuthFlow(event);

	const outcome = parseLoginOutcome(body);
	if (outcome.kind === 'invalid')
		return pageError(event, 'Could not complete sign in. Please try again.');
	if (outcome.kind === 'mfa') {
		if (!outcome.mfa) return pageError(event, 'Could not start verification. Please try again.');
		await saveMFAChallenge(event.locals, outcome.mfa);
		redirect(303, '/login?mfa=1');
	}

	await s.saveAuth(outcome.auth);
	await setPostHogCaptureOnce(event.locals, 'user_logged_in', { method: provider });
	redirect(303, await postAuthRedirect(event, ''));
}

async function completeOAuthLinkCallback(
	event: RequestEvent,
	provider: string,
	flowId: string,
	code: string,
	state: string,
	redirectURI: string
): Promise<CallbackResult> {
	let failed: unknown = null;
	try {
		await apiJSON(event, 'POST', `/v1/auth/oauth/${provider}/link/exchange`, {
			flowId,
			code,
			state,
			redirectURI
		});
	} catch (err) {
		failed = err ?? new Error('link exchange failed');
	}
	await clearOAuthFlow(event);
	if (failed) {
		if (!isAPIError(failed)) console.error('oauth link exchange', provider, failed);
		redirectProfileOAuthError(
			apiErrorMessage(failed, 'Could not connect sign-in account. Please try again.')
		);
	}
	redirect(303, '/settings/profile?connected=' + encodeURIComponent(provider));
}
