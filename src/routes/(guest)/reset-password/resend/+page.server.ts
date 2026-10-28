import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { resetPasswordResend } from '#lib/features/auth-onboarding/reset-password.server.js';

// POST /reset-password/resend only; a GET goes back to the form.
export const load: PageServerLoad = async ({ request }) => {
	if (request.method === 'GET') redirect(303, '/reset-password');
};

export const actions: Actions = { default: resetPasswordResend };
