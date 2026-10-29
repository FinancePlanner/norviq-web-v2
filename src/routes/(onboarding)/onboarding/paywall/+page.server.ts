import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requiresPaywall, requiresQuestionnaire } from '#lib/server/onboarding.js';
import { recordFunnelStep } from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';
import { loadPaywallVM } from '#lib/features/auth-onboarding/onboarding/subscription.server.js';

// GET /onboarding/paywall (onboarding.go Paywall)
export const load: PageServerLoad = async (event) => {
	if (requiresQuestionnaire(event)) redirect(303, '/onboarding/questionnaire');
	if (!requiresPaywall(event)) redirect(303, '/onboarding');
	await recordFunnelStep(event, 'paywall');
	return { step: 0, vm: await loadPaywallVM(event) };
};
