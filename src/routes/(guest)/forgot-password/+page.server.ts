import type { Actions } from './$types';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { emailPattern } from '#lib/features/auth-onboarding/auth.server.js';

// auth.go ForgotPasswordSubmit → renderForgotResult(success, error): the form
// re-renders with one banner. Go answered 200 either way.
export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData().catch(() => null);
		if (!form) return { success: '', error: 'Invalid form submission.' };
		const email = String(form.get('email') ?? '').trim();
		if (!emailPattern.test(email)) return { success: '', error: 'Enter a valid email address.' };
		let message = 'If an account exists for that email, we sent reset instructions.';
		try {
			const res = await apiJSON<{ message?: string } | undefined>(
				event,
				'POST',
				'/v1/auth/forgot-password',
				{ email },
				{ auth: 'none' }
			);
			if (res?.message) message = res.message;
		} catch (err) {
			// Go only failed on a transport error; any HTTP answer showed the
			// generic success (resp.JSON200 nil on non-200).
			if (!isAPIError(err)) {
				console.error('forgot password', err);
				return { success: '', error: 'Could not send reset email. Please try again.' };
			}
		}
		return { success: message, error: '' };
	}
};
