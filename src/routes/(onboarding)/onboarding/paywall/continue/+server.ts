import { redirect, type RequestHandler } from '@sveltejs/kit';
import { markPaywallComplete } from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';

// POST /onboarding/paywall/continue (onboarding.go PaywallContinue). Posted by
// the "Continue with limited Norviq" form and by billingPage() after a
// purchase (data-continue-url).
export const POST: RequestHandler = async (event) => {
	await markPaywallComplete(event);
	redirect(303, '/onboarding');
};
