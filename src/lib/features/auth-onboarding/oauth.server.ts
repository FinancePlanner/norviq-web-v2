// norviq-web internal/handlers/oauth.go + internal/session/oauth.go.
import type { RequestEvent } from '@sveltejs/kit';
import { config } from '#lib/server/env.js';

export const OAuthKey = {
	FlowID: 'oauthFlowId',
	Provider: 'oauthProvider',
	RedirectURI: 'oauthRedirectURI',
	Intent: 'oauthIntent'
} as const;

export type OAuthProvider = 'google' | 'apple' | 'x';
export type OAuthIntent = 'login' | 'link';

export function parseOAuthProvider(raw: string | undefined): OAuthProvider | null {
	const p = (raw ?? '').trim().toLowerCase();
	return p === 'google' || p === 'apple' || p === 'x' ? p : null;
}

export function oauthRedirectURI(provider: OAuthProvider): string {
	return `${config().publicBaseURL}/auth/oauth/${provider}/callback`;
}

/** session.SaveOAuthFlow */
export async function saveOAuthFlow(
	event: RequestEvent,
	provider: string,
	redirectURI: string,
	flowID: string,
	intent: OAuthIntent = 'login'
): Promise<void> {
	const f = event.locals.session.data.flags;
	f[OAuthKey.Provider] = provider;
	f[OAuthKey.RedirectURI] = redirectURI;
	f[OAuthKey.FlowID] = flowID;
	f[OAuthKey.Intent] = intent || 'login';
	await event.locals.session.save();
}

export async function clearOAuthFlow(event: RequestEvent): Promise<void> {
	await event.locals.session.remove(OAuthKey.Provider, OAuthKey.RedirectURI, OAuthKey.FlowID, OAuthKey.Intent);
}

export function oauthIntent(event: RequestEvent): OAuthIntent {
	return event.locals.session.get<string>(OAuthKey.Intent) === 'link' ? 'link' : 'login';
}

export interface OAuthStartResponse {
	flowId: string;
	authorizationURL: string;
	expiresIn?: number;
}
