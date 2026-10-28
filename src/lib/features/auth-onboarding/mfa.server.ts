// auth.go MFAVerify / MFAResend.
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { postAuthRedirect } from '#lib/server/onboarding.js';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';
import {
	apiErrorMessage,
	mfaCodePattern,
	mfaStateFromSession,
	saveMFAChallenge,
	type AuthResponse,
	type MFAChallengeResponse
} from './auth.server.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// renderMFAError: 422 + the modal re-rendered with the stored challenge.
const mfaError = (event: RequestEvent, message: string) =>
	fail(422, { mfa: mfaStateFromSession(event.locals, message) });

export async function mfaVerify(event: RequestEvent) {
	const form = await event.request.formData().catch(() => null);
	if (!form) return mfaError(event, 'Invalid form submission.');
	const challengeId = event.locals.session.data.mfa?.challengeId ?? '';
	if (!challengeId) return mfaError(event, 'Verification session expired. Please sign in again.');
	const code = String(form.get('code') ?? '').trim();
	if (!mfaCodePattern.test(code)) return mfaError(event, 'Enter the 6-digit verification code.');
	if (!uuidPattern.test(challengeId)) return mfaError(event, 'Verification session expired. Please sign in again.');

	let auth: AuthResponse;
	try {
		auth = await apiJSON<AuthResponse>(event, 'POST', '/v1/auth/mfa/verify', { challengeId, code }, { auth: 'none' });
	} catch (err) {
		if (!isAPIError(err)) console.error('mfa verify', err);
		return mfaError(event, apiErrorMessage(err, 'Could not verify code. Please try again.'));
	}
	if (!auth?.token) return mfaError(event, 'Could not verify code. Please try again.');

	await event.locals.session.saveAuth(auth);
	await setPostHogCaptureOnce(event.locals, 'user_logged_in', { method: 'mfa' });
	redirect(303, await postAuthRedirect(event, ''));
}

export async function mfaResend(event: RequestEvent) {
	const challengeId = event.locals.session.data.mfa?.challengeId ?? '';
	if (!challengeId || !uuidPattern.test(challengeId)) {
		return mfaError(event, 'Verification session expired. Please sign in again.');
	}
	let challenge: MFAChallengeResponse;
	try {
		challenge = await apiJSON<MFAChallengeResponse>(event, 'POST', '/v1/auth/mfa/resend', { challengeId }, { auth: 'none' });
	} catch (err) {
		if (!isAPIError(err)) console.error('mfa resend', err);
		return mfaError(event, apiErrorMessage(err, 'Could not resend code right now.'));
	}
	if (!challenge?.challengeId) return mfaError(event, 'Could not resend code right now.');
	await saveMFAChallenge(event.locals, challenge);
	return {
		mfa: {
			maskedDestination: challenge.maskedDestination,
			resendAvailableIn: Math.trunc(challenge.resendAvailableIn ?? 0),
			error: '',
			info: 'A new code has been sent.'
		}
	};
}
