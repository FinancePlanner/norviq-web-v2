import { redirect, type RequestHandler } from '@sveltejs/kit';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';
import {
	markOnboardingComplete,
	markPaywallComplete,
	recordFunnelComplete
} from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';

// POST /onboarding/skip (onboarding.go Skip)
export const POST: RequestHandler = async (event) => {
	const form = await event.request.formData().catch(() => null);
	const step = String(form?.get('step') ?? '').trim();
	// redirect() throws, so each branch ends there.
	if (step === 'import') redirect(303, '/onboarding/budget');
	if (step === 'paywall') {
		await markPaywallComplete(event);
		redirect(303, '/onboarding');
	}
	if (step === 'budget' || step === 'all') {
		await markPaywallComplete(event);
		await recordFunnelComplete(event);
		await markOnboardingComplete(event);
		await setPostHogCaptureOnce(event.locals, 'onboarding_completed', { via: 'skip_' + step });
		redirect(303, '/onboarding/done');
	}
	redirect(303, '/onboarding/import');
};
