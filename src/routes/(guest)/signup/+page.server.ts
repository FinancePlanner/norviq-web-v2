import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { OnboardingKey, safeNextPath } from '#lib/server/onboarding.js';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';
import {
	apiErrorMessage,
	loginRedirectAfterSignup,
	validateSignup
} from '#lib/features/auth-onboarding/auth.server.js';

// auth.go SignupPage
export const load: PageServerLoad = async ({ url }) => ({
	next: safeNextPath(url.searchParams.get('next'))
});

const authError = (message: string) => fail(422, { error: message });

export const actions: Actions = {
	// auth.go SignupSubmit
	default: async (event) => {
		const form = await event.request.formData().catch(() => null);
		if (!form) return authError('Invalid form submission.');
		const username = String(form.get('username') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const confirmPassword = String(form.get('confirmPassword') ?? '');
		const dateOfBirth = String(form.get('dateOfBirth') ?? '').trim();

		const msg = validateSignup(username, email, password, confirmPassword, dateOfBirth);
		if (msg) return authError(msg);
		if (
			!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
			Number.isNaN(Date.parse(dateOfBirth + 'T00:00:00Z'))
		) {
			return authError('Enter a valid date of birth.');
		}

		try {
			// Go sends time.Time, which marshals as RFC 3339.
			await apiJSON(
				event,
				'POST',
				'/v1/auth/register',
				{ username, email, password, confirmPassword, dateOfBirth: `${dateOfBirth}T00:00:00Z` },
				{ auth: 'none' }
			);
		} catch (err) {
			if (!isAPIError(err)) console.error('auth register', err);
			return authError(apiErrorMessage(err, 'Could not create account. Please try again.'));
		}

		const s = event.locals.session;
		await setPostHogCaptureOnce(event.locals, 'user_signed_up', { method: 'email' });
		// session.MarkOnboardingQuestionnaireRequired
		s.data.flags[OnboardingKey.QuestionnaireRequired] = true;
		// A new account walks the funnel from the start; nothing it records in
		// this session is a resume (session.SettleFunnelResumed).
		await s.set(OnboardingKey.FunnelResumedSent, true);

		redirect(303, loginRedirectAfterSignup(safeNextPath(String(form.get('next') ?? ''))));
	}
};
