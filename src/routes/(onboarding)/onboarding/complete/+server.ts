import { redirect, type RequestHandler } from '@sveltejs/kit';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';
import {
	afterOnboardingPath,
	markOnboardingComplete,
	recordFunnelComplete
} from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';

// POST /onboarding/complete (onboarding.go Complete)
export const POST: RequestHandler = async (event) => {
	await recordFunnelComplete(event);
	await markOnboardingComplete(event);
	await setPostHogCaptureOnce(event.locals, 'onboarding_completed', { via: 'complete' });
	redirect(303, await afterOnboardingPath(event));
};
