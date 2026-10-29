import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { proxyWebAuthn } from '#lib/features/settings-admin/passkey.server.js';

// Go PasskeyRegisterFinish: the credential JSON goes to the backend as-is.
export const POST: RequestHandler = async (event) => {
	let payload: string;
	try {
		payload = await event.request.text();
	} catch {
		return json({ error: 'Invalid passkey response.' }, { status: 400 });
	}
	return proxyWebAuthn(
		event,
		'/v1/auth/webauthn/register/verify',
		payload,
		{ request: 'Could not verify passkey.', failure: 'Could not register passkey.' },
		true
	);
};
