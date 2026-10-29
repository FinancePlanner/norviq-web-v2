// Port of the passkey-registration half of norviq-web
// internal/server/assets/auth.js (registerPasskey + bindPasskeyRegisterButton).
// The auth-onboarding port carries its own copy of the WebAuthn helpers for
// passkey sign-in; dedupe the base64url/normalise helpers when both land.

function base64URLToBuffer(value: string): ArrayBuffer {
	const padding = '='.repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = window.atob(base64);
	const buffer = new ArrayBuffer(raw.length);
	const view = new Uint8Array(buffer);
	for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
	return buffer;
}

function bufferToBase64URL(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
	return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

type JSONCreationOptions = {
	publicKey: {
		challenge: string;
		user: { id: string; [k: string]: unknown };
		excludeCredentials?: { id: string; [k: string]: unknown }[];
		[k: string]: unknown;
	};
	[k: string]: unknown;
};

function normalizeCreationOptions(options: JSONCreationOptions): CredentialCreationOptions {
	const publicKey = { ...options.publicKey } as Record<string, unknown>;
	publicKey.challenge = base64URLToBuffer(options.publicKey.challenge);
	publicKey.user = { ...options.publicKey.user, id: base64URLToBuffer(options.publicKey.user.id) };
	if (options.publicKey.excludeCredentials) {
		publicKey.excludeCredentials = options.publicKey.excludeCredentials.map((item) => ({ ...item, id: base64URLToBuffer(item.id) }));
	}
	return { ...options, publicKey } as unknown as CredentialCreationOptions;
}

function serializeRegistrationCredential(credential: PublicKeyCredential) {
	const response = credential.response as AuthenticatorAttestationResponse;
	return {
		id: credential.id,
		rawId: bufferToBase64URL(credential.rawId),
		type: credential.type,
		response: {
			clientDataJSON: bufferToBase64URL(response.clientDataJSON),
			attestationObject: bufferToBase64URL(response.attestationObject)
		}
	};
}

type BeginPayload = Partial<JSONCreationOptions> & JSONCreationOptions['publicKey'] & { error?: string };
type FinishPayload = { error?: string; message?: string };

/** registerPasskey: resolves with the success message, throws with the error text. */
export async function registerPasskey(): Promise<string> {
	if (!window.PublicKeyCredential) throw new Error('Passkeys are not supported in this browser.');

	const beginResponse = await fetch('/settings/passkey/register/begin', {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: '{}'
	});
	const beginPayload = (await beginResponse.json()) as BeginPayload;
	if (!beginResponse.ok) throw new Error(beginPayload.error || 'Could not start passkey registration.');

	const requestOptions = beginPayload.publicKey
		? normalizeCreationOptions(beginPayload as JSONCreationOptions)
		: normalizeCreationOptions({ publicKey: beginPayload });
	const credential = (await navigator.credentials.create(requestOptions)) as PublicKeyCredential | null;
	if (!credential) throw new Error('Passkey registration was cancelled.');

	const finishResponse = await fetch('/settings/passkey/register/finish', {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify(serializeRegistrationCredential(credential))
	});
	const finishPayload = (await finishResponse.json()) as FinishPayload;
	if (!finishResponse.ok) throw new Error(finishPayload.error || 'Could not register passkey.');
	return finishPayload.message || 'Passkey registered.';
}
