import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { postAuthRedirect, safeNextPath } from '#lib/server/onboarding.js';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';
import {
	apiErrorMessage,
	emailPattern,
	parseLoginOutcome,
	saveMFAChallenge,
	type LoginOutcomeBody
} from '#lib/features/auth-onboarding/auth.server.js';

// auth.go LoginPage
export const load: PageServerLoad = async ({ url, locals }) => {
	let info = '';
	let error = '';
	if (url.searchParams.get('registered') === '1') info = 'Account created. Please sign in.';
	if (url.searchParams.get('error') === 'oauth') {
		error = 'Could not start social sign in. Check provider configuration and try again.';
	}
	const mfaOpen = url.searchParams.get('mfa') === '1' || !!locals.session.data.mfa?.challengeId;
	return { info, error, mfaOpen, next: safeNextPath(url.searchParams.get('next')) };
};

// auth.go renderAuthError: 422 + the error banner in #auth-errors.
const authError = (message: string) => fail(422, { error: message });

export const actions: Actions = {
	// auth.go LoginSubmit
	default: async (event) => {
		const form = await event.request.formData().catch(() => null);
		if (!form) return authError('Invalid form submission.');
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		if (email === '' || password === '') return authError('Email and password are required.');
		if (!emailPattern.test(email)) return authError('Enter a valid email address.');

		let body: LoginOutcomeBody;
		try {
			body = await apiJSON<LoginOutcomeBody>(event, 'POST', '/v1/auth/login', { email, password }, { auth: 'none' });
		} catch (err) {
			if (!isAPIError(err)) console.error('auth login', err);
			return authError(apiErrorMessage(err, 'Could not log in. Please try again.'));
		}

		const outcome = parseLoginOutcome(body);
		if (outcome.kind === 'invalid') return authError('Could not complete sign in. Please try again.');
		if (outcome.kind === 'mfa') {
			if (!outcome.mfa) return authError('Could not start verification. Please try again.');
			await saveMFAChallenge(event.locals, outcome.mfa);
			// htmx: showMfaModal + MFAModal(masked, resendIn, "", "") into #mfa-modal-content.
			return {
				mfa: {
					maskedDestination: outcome.mfa.maskedDestination,
					resendAvailableIn: Math.trunc(outcome.mfa.resendAvailableIn ?? 0),
					error: '',
					info: ''
				}
			};
		}

		await event.locals.session.saveAuth(outcome.auth);
		await setPostHogCaptureOnce(event.locals, 'user_logged_in', { method: 'email' });
		redirect(303, await postAuthRedirect(event, String(form.get('next') ?? '')));
	}
};
