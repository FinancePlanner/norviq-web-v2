import type { Actions, PageServerLoad } from './$types';
import {
	oauthCallbackGET,
	oauthCallbackPOST,
	type CallbackResult
} from '#lib/features/auth-onboarding/oauth-callback.server.js';

// Registered outside every chi group in Go (no auth guard), and CSRF-exempt:
// Apple's form_post arrives cross-site (see csrf.trustedOrigins).

// GET /auth/oauth/{provider}/callback
export const load: PageServerLoad = async (event): Promise<CallbackResult | null> => {
	// After the POST action below, load runs again for the same request: the
	// action's result is what the page shows.
	if (event.request.method !== 'GET') return null;
	return oauthCallbackGET(event);
};

// POST /auth/oauth/{provider}/callback (Apple form_post)
export const actions: Actions = {
	default: (event) => oauthCallbackPOST(event)
};
