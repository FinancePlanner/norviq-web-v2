import { redirect, type RequestEvent } from '@sveltejs/kit';
import { config } from '#lib/server/env.js';
import { redirectWith } from '#lib/features/settings-admin/social/social.server.js';
import { socialDo, socialErrorMessage } from './friends.server.js';
import type { SocialXImportStartResponse } from './types.js';

// Shared X / Facebook discovery-import plumbing (handlers/social_x.go,
// social_facebook.go). The backend holds the PKCE verifier and state; the web
// app keeps only the flow id and redirect URI in the session (same keys as Go
// internal/session/social.go) to hand back on the callback.

export interface ImportProvider {
	/** backend path segment: /v1/social/discovery/{name}/… */
	name: 'x' | 'facebook';
	callbackPath: string;
	flowKey: string;
	redirectKey: string;
	failure: string;
}

export const XImport: ImportProvider = {
	name: 'x',
	callbackPath: '/friends/x/callback',
	flowKey: 'xImportFlowId',
	redirectKey: 'xImportRedirectURI',
	failure: 'Could not connect to X right now.'
};

export const FacebookImport: ImportProvider = {
	name: 'facebook',
	callbackPath: '/friends/facebook/callback',
	flowKey: 'facebookImportFlowId',
	redirectKey: 'facebookImportRedirectURI',
	failure: 'Could not connect to Facebook right now.'
};

/** FriendsXStart / FriendsFacebookStart: off to the provider's consent screen. */
export async function startImport(event: RequestEvent, p: ImportProvider): Promise<never> {
	const redirectURI = config().publicBaseURL + p.callbackPath;
	let start: SocialXImportStartResponse;
	try {
		start = await socialDo<SocialXImportStartResponse>(event, 'POST', `/v1/social/discovery/${p.name}/start`, { redirectURI });
	} catch (err) {
		console.warn(`${p.name} import start failed`, { redirectURI, err });
		redirectWith('/friends', '', socialErrorMessage(err, p.failure));
	}
	if (!start?.authorizationURL?.startsWith('https://') || !start.flowId) {
		console.error(`${p.name} import start returned an unusable authorization URL`);
		redirectWith('/friends', '', p.failure);
	}
	await event.locals.session.set(p.flowKey, start.flowId);
	await event.locals.session.set(p.redirectKey, redirectURI);
	redirect(303, start.authorizationURL, { external: true });
}

/** session.Pop*ImportFlow: read and clear, so a replayed callback finds nothing. */
export async function popImportFlow(event: RequestEvent, p: ImportProvider): Promise<{ flowID: string; redirectURI: string }> {
	const flowID = String(event.locals.session.get<string>(p.flowKey) ?? '');
	const redirectURI = String(event.locals.session.get<string>(p.redirectKey) ?? '');
	if (flowID || redirectURI) await event.locals.session.remove(p.flowKey, p.redirectKey);
	return { flowID, redirectURI };
}
