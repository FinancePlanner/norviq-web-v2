import type { PageServerLoad } from './$types';

// GET /onboarding/done (onboarding.go Done): no funnel guard.
export const load: PageServerLoad = () => ({ step: 4 });
