// Port of norviq-web internal/server/assets/auth.js: passkey (WebAuthn) sign-in
// and registration. Browser-only.
//
// Sign-in talks to /auth/passkey/{begin,finish} (this domain). Registration
// talks to /settings/passkey/register/{begin,finish}, which settings owns; it
// is exported here so the settings page can reuse it (`registerPasskey()` +
// the `passkeyRegisterButton()` attachment) instead of re-porting it.
//
// Differences from Go: no X-CSRF-Token header (SvelteKit checks the origin);
// errors go through a callback instead of innerHTML into #auth-errors, so the
// page renders them with FormErrorBanner.
import type { Attachment } from 'svelte/attachments';

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

// The WebAuthn options as the server sends them: JSON, so every binary field
// is a base64url string.
type Descriptor = Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string };
export type CreationOptionsJSON = Omit<
	PublicKeyCredentialCreationOptions,
	'challenge' | 'user' | 'excludeCredentials'
> & {
	challenge: string;
	user: Omit<PublicKeyCredentialUserEntity, 'id'> & { id: string };
	excludeCredentials?: Descriptor[];
};
export type RequestOptionsJSON = Omit<
	PublicKeyCredentialRequestOptions,
	'challenge' | 'allowCredentials'
> & {
	challenge: string;
	allowCredentials?: Descriptor[];
};

const decodeIDs = (items: Descriptor[] | undefined) =>
	items?.map((item) => ({ ...item, id: base64URLToBuffer(item.id) }));

export function normalizeCreationOptions(options: {
	publicKey: CreationOptionsJSON;
}): CredentialCreationOptions {
	const json = options.publicKey;
	return {
		...options,
		publicKey: {
			...json,
			challenge: base64URLToBuffer(json.challenge),
			user: { ...json.user, id: base64URLToBuffer(json.user.id) },
			excludeCredentials: decodeIDs(json.excludeCredentials)
		}
	};
}

export function normalizeRequestOptions(options: {
	publicKey: RequestOptionsJSON;
}): CredentialRequestOptions {
	const json = options.publicKey;
	return {
		...options,
		publicKey: {
			...json,
			challenge: base64URLToBuffer(json.challenge),
			allowCredentials: decodeIDs(json.allowCredentials)
		}
	};
}

export function serializeCredential(credential: PublicKeyCredential) {
	const response = credential.response as AuthenticatorAssertionResponse;
	return {
		id: credential.id,
		rawId: bufferToBase64URL(credential.rawId),
		type: credential.type,
		response: {
			clientDataJSON: bufferToBase64URL(response.clientDataJSON),
			authenticatorData: bufferToBase64URL(response.authenticatorData),
			signature: bufferToBase64URL(response.signature),
			userHandle: response.userHandle ? bufferToBase64URL(response.userHandle) : null
		}
	};
}

export function serializeRegistrationCredential(credential: PublicKeyCredential) {
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

const jsonHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' };

/**
 * What the passkey endpoints answer with. `begin` sends the options either
 * wrapped in `publicKey` or bare, so the payload itself may be the options.
 */
type Payload<Options> = Partial<Options> & {
	publicKey?: Options;
	error?: string;
	message?: string;
	redirect?: string;
};

async function readJSON<Options = object>(res: Response): Promise<Payload<Options>> {
	try {
		return await res.json<Payload<Options>>();
	} catch {
		return {};
	}
}

/** auth.js registerPasskey: resolves to the success message, throws with a readable one. */
export async function registerPasskey(): Promise<string> {
	if (!window.PublicKeyCredential) throw new Error('Passkeys are not supported in this browser.');

	const beginResponse = await fetch('/settings/passkey/register/begin', {
		method: 'POST',
		headers: jsonHeaders,
		body: '{}'
	});
	const beginPayload = await readJSON<CreationOptionsJSON>(beginResponse);
	if (!beginResponse.ok)
		throw new Error(beginPayload.error || 'Could not start passkey registration.');

	const requestOptions = beginPayload.publicKey
		? normalizeCreationOptions(beginPayload as { publicKey: CreationOptionsJSON })
		: normalizeCreationOptions({ publicKey: beginPayload as CreationOptionsJSON });

	const credential = (await navigator.credentials.create(
		requestOptions
	)) as PublicKeyCredential | null;
	if (!credential) throw new Error('Passkey registration was cancelled.');

	const finishResponse = await fetch('/settings/passkey/register/finish', {
		method: 'POST',
		headers: jsonHeaders,
		body: JSON.stringify(serializeRegistrationCredential(credential))
	});
	const finishPayload = await readJSON(finishResponse);
	if (!finishResponse.ok) throw new Error(finishPayload.error || 'Could not register passkey.');
	return finishPayload.message || 'Passkey registered.';
}

/**
 * auth.js signInWithPasskey. Reports failures through showError and, on
 * success, does a full navigation to the post-auth redirect (as Go did).
 */
export async function signInWithPasskey(showError: (message: string) => void): Promise<void> {
	if (!window.PublicKeyCredential) {
		showError('Passkeys are not supported in this browser.');
		return;
	}

	const beginResponse = await fetch('/auth/passkey/begin', {
		method: 'POST',
		headers: jsonHeaders,
		body: '{}'
	});
	const beginPayload = await readJSON<RequestOptionsJSON>(beginResponse);
	if (!beginResponse.ok) {
		showError(beginPayload.error || 'Could not start passkey sign in.');
		return;
	}

	const requestOptions = beginPayload.publicKey
		? normalizeRequestOptions(beginPayload as { publicKey: RequestOptionsJSON })
		: normalizeRequestOptions({ publicKey: beginPayload as RequestOptionsJSON });

	const credential = (await navigator.credentials.get(
		requestOptions
	)) as PublicKeyCredential | null;
	if (!credential) {
		showError('Passkey sign in was cancelled.');
		return;
	}

	const finishResponse = await fetch('/auth/passkey/finish', {
		method: 'POST',
		headers: jsonHeaders,
		body: JSON.stringify(serializeCredential(credential))
	});
	const finishPayload = await readJSON(finishResponse);
	if (!finishResponse.ok) {
		showError(finishPayload.error || 'Could not verify passkey.');
		return;
	}
	window.location.href = finishPayload.redirect || '/dashboard';
}

/** auth.js bindPasskeyButton, as an attachment for #passkey-sign-in. */
export function passkeyButton(showError: (message: string) => void): Attachment<HTMLButtonElement> {
	return (button) => {
		const onClick = () => {
			button.disabled = true;
			signInWithPasskey(showError)
				.catch((error: unknown) => {
					console.error(error);
					showError('Could not complete passkey sign in.');
				})
				.finally(() => {
					button.disabled = false;
				});
		};
		button.addEventListener('click', onClick);
		return () => button.removeEventListener('click', onClick);
	};
}

export type PasskeyFeedback = { kind: 'success' | 'error'; message: string } | null;

/**
 * auth.js bindPasskeyRegisterButton, as an attachment for #passkey-register.
 * onFeedback receives null when a registration starts, then the outcome, so
 * the page renders .success-banner / .error-banner in #passkey-register-feedback.
 */
export function passkeyRegisterButton(
	onFeedback: (f: PasskeyFeedback) => void
): Attachment<HTMLButtonElement> {
	return (button) => {
		const onClick = () => {
			button.disabled = true;
			onFeedback(null);
			registerPasskey()
				.then((message) => onFeedback({ kind: 'success', message }))
				.catch((error: unknown) => {
					console.error(error);
					onFeedback({
						kind: 'error',
						message: error instanceof Error ? error.message : 'Could not register passkey.'
					});
				})
				.finally(() => {
					button.disabled = false;
				});
		};
		button.addEventListener('click', onClick);
		return () => button.removeEventListener('click', onClick);
	};
}
