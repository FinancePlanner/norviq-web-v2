import type { RequestHandler } from './$types';
import { proxyWebAuthn } from '#lib/features/settings-admin/passkey.server.js';

// Go PasskeyRegisterBegin.
export const POST: RequestHandler = (event) =>
	proxyWebAuthn(
		event,
		'/v1/auth/webauthn/register/options',
		'{}',
		{ request: 'Could not start passkey registration.', failure: 'Could not start passkey registration.' },
		false
	);
