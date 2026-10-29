// oauth.go PasskeyBegin / PasskeyFinish: proxy the WebAuthn login ceremony to
// the backend, forwarding the browser's Origin (the backend checks it against
// the relying party).
import { json, type RequestEvent } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';
import { config } from '#lib/server/env.js';
import { postAuthRedirect } from '#lib/server/onboarding.js';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';
import { apiErrorMessage, type AuthResponse } from './auth.server.js';

function originFromReferer(referer: string): string {
	try {
		const u = new URL(referer);
		return u.protocol && u.host ? `${u.protocol}//${u.host}` : referer;
	} catch {
		return referer;
	}
}

function browserOrigin(event: RequestEvent): string {
	const origin = event.request.headers.get('origin');
	if (origin) return origin;
	const referer = event.request.headers.get('referer');
	if (referer) return originFromReferer(referer);
	return config().publicBaseURL;
}

async function proxy(event: RequestEvent, path: string, body: string): Promise<Response | { status: number; text: string }> {
	try {
		const res = await apiFetch(event, 'POST', path, body, {
			auth: 'none',
			headers: { 'Content-Type': 'application/json', Origin: browserOrigin(event) }
		});
		return { status: res.status, text: await res.text() };
	} catch (err) {
		console.error('passkey', path, err);
		return json({ error: 'Could not reach the authentication service.' }, { status: 502 });
	}
}

export async function passkeyBegin(event: RequestEvent): Promise<Response> {
	const r = await proxy(event, '/v1/auth/webauthn/login/options', '{}');
	if (r instanceof Response) return r;
	if (r.status === 404 || r.status === 501) {
		return json({ error: 'Passkey sign-in is not enabled on the server yet.' }, { status: 501 });
	}
	if (r.status !== 200) {
		return json({ error: apiErrorMessage(r.text, 'Could not start passkey sign in.') }, { status: r.status });
	}
	return new Response(r.text, { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export async function passkeyFinish(event: RequestEvent): Promise<Response> {
	let payload: string;
	try {
		payload = await event.request.text();
	} catch {
		return json({ error: 'Invalid passkey response.' }, { status: 400 });
	}
	const r = await proxy(event, '/v1/auth/webauthn/login/verify', payload);
	if (r instanceof Response) return r;
	if (r.status === 404 || r.status === 501) {
		return json({ error: 'Passkey sign-in is not enabled on the server yet.' }, { status: 501 });
	}
	if (r.status !== 200) {
		return json({ error: apiErrorMessage(r.text, 'Could not verify passkey.') }, { status: r.status });
	}
	let auth: AuthResponse | null = null;
	try {
		auth = JSON.parse(r.text) as AuthResponse;
	} catch {
		auth = null;
	}
	if (!auth?.token) return json({ error: 'Unexpected passkey response from server.' }, { status: 502 });

	await event.locals.session.saveAuth(auth);
	await setPostHogCaptureOnce(event.locals, 'user_logged_in', { method: 'passkey' });
	return json({ redirect: await postAuthRedirect(event, '') });
}
