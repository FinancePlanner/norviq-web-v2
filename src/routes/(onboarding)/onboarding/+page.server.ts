import type { PageServerLoad } from './$types';
import {
	funnelStepAfterWelcome,
	guardInProgress,
	recordFunnelStep
} from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';

// GET /onboarding (onboarding.go Welcome)
export const load: PageServerLoad = async (event) => {
	const stored = await guardInProgress(event);
	// /onboarding is also where a bare link lands; never rewind a user who is
	// further along.
	if (!funnelStepAfterWelcome(stored)) await recordFunnelStep(event, 'welcome');
	return { step: 1 };
};
