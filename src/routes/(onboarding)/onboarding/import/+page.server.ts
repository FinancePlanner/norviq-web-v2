import type { PageServerLoad } from './$types';
import { guardInProgress, recordFunnelStep } from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';

// GET /onboarding/import (onboarding.go ImportMenu)
export const load: PageServerLoad = async (event) => {
	await guardInProgress(event);
	await recordFunnelStep(event, 'import');
	return { step: 2 };
};
