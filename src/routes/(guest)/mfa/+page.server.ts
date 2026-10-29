import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// GET /mfa (auth.go MFAPartial). The htmx fragment is now the MfaModal
// component on the login page; a direct visit opens it there.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session.data.mfa?.challengeId) error(400, 'No pending verification');
	redirect(303, '/login?mfa=1');
};
