import { json, type RequestEvent } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';
import { config } from '#lib/server/env.js';
import { apiErrorMessage } from './api-errors.js';

// Go settings_passkey.go: proxies the backend's WebAuthn registration and
// forwards the browser's Origin (setWebAuthnOriginHeaders), which the backend
// checks against its relying-party origins.

function originFromReferer(referer: string): string {
	try {
		const u = new URL(referer);
		return u.protocol && u.host ? `${u.protocol}//${u.host}` : referer;
	} catch {
		return referer;
	}
}

function webAuthnOrigin(event: RequestEvent): string {
	const origin = event.request.headers.get('Origin');
	if (origin) return origin;
	const referer = event.request.headers.get('Referer');
	if (referer) return originFromReferer(referer);
	return config().publicBaseURL;
}

export async function proxyWebAuthn(
	event: RequestEvent,
	path: string,
	body: string,
	fallbacks: { request: string; failure: string },
	finish: boolean
): Promise<Response> {
	let resp: Response;
	try {
		resp = await apiFetch(event, 'POST', path, body, {
			headers: { 'Content-Type': 'application/json', Origin: webAuthnOrigin(event) }
		});
	} catch (err) {
		console.error('passkey register', path, err);
		return json({ error: 'Could not reach the authentication service.' }, { status: 502 });
	}
	const text = await resp.text().catch(() => '');
	const ok = resp.status === 200 || (finish && resp.status === 204);
	if (!ok)
		return json({ error: apiErrorMessage(text, fallbacks.failure) }, { status: resp.status });
	if (finish) return json({ message: 'Passkey registered.' });
	return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
}
