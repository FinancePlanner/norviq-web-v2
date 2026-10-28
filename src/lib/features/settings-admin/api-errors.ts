import { isAPIError } from '#lib/server/api.js';

// Port of norviq-web internal/handlers/auth.go apiErrorMessage and
// readableAPIReasons, shared by every settings/admin/pilots/billing handler.

export const OPERATOR_EMAIL = 'fernando@facorreia.com';

const oauthOnlyEmailChangeMessage =
	'Your account uses Apple or Google sign-in, so it has no password to confirm the change. Email ' +
	OPERATOR_EMAIL +
	' from your current address to change your email.';

export const readableAPIReasons: Record<string, string> = {
	INVALID_CURRENT_PASSWORD: 'Your current password is incorrect.',
	CURRENT_PASSWORD_REQUIRED: 'Enter your current password to make this change.',
	EMAIL_CHANGE_REQUIRES_REAUTH: 'Confirm your current password to change your email.',
	REAUTH_REQUIRED: oauthOnlyEmailChangeMessage
};

const rawErrorCode = /^[A-Z][A-Z0-9_]+$/;

/** Go apiErrorMessage(body, fallback): `body` is the raw response body (string) or the parsed JSON. */
export function apiErrorMessage(body: unknown, fallback: string): string {
	if (body === undefined || body === null || body === '') return fallback;
	let text: string;
	if (typeof body === 'string') {
		text = body.trim();
		if (text.startsWith('{')) {
			try {
				const parsed = JSON.parse(text) as { reason?: unknown };
				text = typeof parsed.reason === 'string' ? parsed.reason.trim() : '';
			} catch {
				return fallback;
			}
		}
	} else if (typeof body === 'object') {
		const reason = (body as { reason?: unknown }).reason;
		text = typeof reason === 'string' ? reason.trim() : '';
	} else {
		return fallback;
	}
	if (text in readableAPIReasons) return readableAPIReasons[text];
	if (text === '' || text.length > 180 || rawErrorCode.test(text)) return fallback;
	return text;
}

/** apiErrorMessage for a thrown error: an APIError carries the response body. */
export function errorMessage(err: unknown, fallback: string): string {
	if (isAPIError(err)) return apiErrorMessage(err.body, fallback);
	return fallback;
}

/** HTTP status of a thrown APIError, or 0 for a transport error (Go's err != nil). */
export function errorStatus(err: unknown): number {
	return isAPIError(err) ? err.status : 0;
}
