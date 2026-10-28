// Port of the form rules and error helpers in norviq-web
// internal/handlers/auth.go and internal/pages/auth/next_path.go.
import { isAPIError } from '#lib/server/api.js';
import type { MFAModalState } from './types.js';

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;
export const mfaCodePattern = /^\d{6}$/;

// Go validates the signup email with net/mail.ParseAddress, which accepts a
// bare local@domain (no dot required) and rejects whitespace and a missing @.
// This is the closest single-address equivalent; the backend validates again.
const mailAddressPattern = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+$/;

export function validateSignup(
	username: string,
	email: string,
	password: string,
	confirmPassword: string,
	dateOfBirth: string
): string {
	if (!usernamePattern.test(username)) {
		return 'Username must be 3-30 characters and use letters, numbers, or underscores.';
	}
	if (!mailAddressPattern.test(email)) return 'Enter a valid email address.';
	// Go's len() counts bytes; a multi-byte password is longer there than in
	// UTF-16, so count UTF-8 bytes to match.
	if (new TextEncoder().encode(password).length < 8) return 'Password must be at least 8 characters.';
	const strength = passwordStrengthError(password);
	if (strength) return strength;
	if (password !== confirmPassword) return 'Passwords do not match.';
	if (dateOfBirth === '') return 'Date of birth is required.';
	return '';
}

/** Mirrors the backend's password rules in the same order (auth.go passwordStrengthError). */
export function passwordStrengthError(password: string): string {
	let upper = false;
	let lower = false;
	let digit = false;
	let special = false;
	for (const ch of password) {
		if (/\p{Lu}/u.test(ch)) upper = true;
		else if (/\p{Ll}/u.test(ch)) lower = true;
		else if (/\p{Nd}/u.test(ch)) digit = true;
		else if (/[\p{P}\p{S}]/u.test(ch)) special = true;
	}
	if (!upper) return 'Password must contain at least one uppercase letter.';
	if (!lower) return 'Password must contain at least one lowercase letter.';
	if (!digit) return 'Password must contain at least one number.';
	if (!special) return 'Password must contain at least one special character, such as ! or ?.';
	return '';
}

export const OPERATOR_EMAIL = 'fernando@facorreia.com';

const oauthOnlyEmailChangeMessage =
	'Your account uses Apple or Google sign-in, so it has no password to confirm the change. Email ' +
	OPERATOR_EMAIL +
	' from your current address to change your email.';

const readableAPIReasons: Record<string, string> = {
	INVALID_CURRENT_PASSWORD: 'Your current password is incorrect.',
	CURRENT_PASSWORD_REQUIRED: 'Enter your current password to make this change.',
	EMAIL_CHANGE_REQUIRES_REAUTH: 'Confirm your current password to change your email.',
	REAUTH_REQUIRED: oauthOnlyEmailChangeMessage
};

const rawErrorCode = /^[A-Z][A-Z0-9_]+$/;

/**
 * auth.go apiErrorMessage: the backend's readable `reason`, never a raw body
 * or a bare machine code. Takes the raw response text (or an APIError).
 */
export function apiErrorMessage(source: unknown, fallback: string): string {
	let text = '';
	if (isAPIError(source)) {
		const body = source.body;
		if (typeof body === 'string') text = body.trim();
		else if (body && typeof body === 'object') {
			const reason = (body as { reason?: unknown }).reason;
			text = typeof reason === 'string' ? reason.trim() : '';
		}
	} else if (typeof source === 'string') {
		text = source.trim();
		if (text.startsWith('{')) {
			try {
				const reason = (JSON.parse(text) as { reason?: unknown }).reason;
				text = typeof reason === 'string' ? reason.trim() : '';
			} catch {
				return fallback;
			}
		}
	} else {
		return fallback;
	}
	if (text in readableAPIReasons) return readableAPIReasons[text];
	if (text === '' || text.length > 180 || rawErrorCode.test(text)) return fallback;
	return text;
}

/** next_path.go AuthSwitchHref: the "create one" / "log in instead" link keeps ?next=. */
export function authSwitchHref(base: string, nextPath: string): string {
	return nextPath ? `${base}?next=${encodeURIComponent(nextPath)}` : base;
}

/** next_path.go LoginRedirectAfterSignup. url.Values.Encode sorts keys: next before registered. */
export function loginRedirectAfterSignup(nextPath: string): string {
	const q = new URLSearchParams();
	if (nextPath) q.set('next', nextPath);
	q.set('registered', '1');
	return '/login?' + q.toString();
}

// ---------------------------------------------------------------------------
// Backend auth shapes (internal/api models) and session helpers.

export interface AuthResponse {
	token: string;
	refreshToken: string;
	expiresIn: number;
	refreshExpiresIn: number;
	userId: string;
	username: string;
	email: string;
}

export interface MFAChallengeResponse {
	challengeId: string;
	maskedDestination: string;
	resendAvailableIn: number;
}

/** AuthLoginOutcome: {status:"authenticated",auth} | {status:"mfaRequired",mfa} | a bare AuthResponse. */
export interface LoginOutcomeBody {
	status?: string;
	auth?: AuthResponse;
	mfa?: MFAChallengeResponse;
	token?: string;
}

export type ParsedOutcome =
	| { kind: 'authenticated'; auth: AuthResponse }
	| { kind: 'mfa'; mfa: MFAChallengeResponse | null }
	| { kind: 'invalid' };

/** api.ParseLoginResponse / ParseOAuthExchangeResponse. */
export function parseLoginOutcome(body: LoginOutcomeBody | null | undefined): ParsedOutcome {
	if (!body || typeof body !== 'object') return { kind: 'invalid' };
	if (body.status === 'authenticated' && body.auth) return { kind: 'authenticated', auth: body.auth };
	if (body.status === 'mfaRequired') return { kind: 'mfa', mfa: body.mfa ?? null };
	if (typeof body.token === 'string') return { kind: 'authenticated', auth: body as unknown as AuthResponse };
	return { kind: 'invalid' };
}

/** session.SaveMFAChallenge */
export async function saveMFAChallenge(locals: App.Locals, c: MFAChallengeResponse): Promise<void> {
	await locals.session.saveMFA({
		challengeId: c.challengeId,
		maskedDestination: c.maskedDestination,
		resendAvailableIn: Math.trunc(c.resendAvailableIn ?? 0)
	});
}

export function mfaStateFromSession(locals: App.Locals, error = '', info = ''): MFAModalState {
	const mfa = locals.session.data.mfa;
	return {
		maskedDestination: mfa?.maskedDestination ?? '',
		resendAvailableIn: mfa?.resendAvailableIn ?? 0,
		error,
		info
	};
}
