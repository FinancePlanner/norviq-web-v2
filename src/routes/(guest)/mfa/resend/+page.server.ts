import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { mfaResend } from '#lib/features/auth-onboarding/mfa.server.js';

// POST /mfa/resend only; a GET goes back to sign in.
export const load: PageServerLoad = async ({ request }) => {
	if (request.method === 'GET') redirect(303, '/login');
};

export const actions: Actions = { default: mfaResend };
