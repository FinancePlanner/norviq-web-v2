import { redirect, type RequestHandler } from '@sveltejs/kit';
import { getOnboardingProgress } from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';
import { isStep, resolveStep, stepPath } from '#lib/features/auth-onboarding/guided-start/guide.js';
import {
	clearGuidedStep,
	setGuidedShowCompleted,
	startGuidedStep,
	takeGuidedPendingSource
} from '#lib/features/auth-onboarding/guided-start/guided.server.js';

// GET /guided-start/start?step=… (guided_start.go GuidedStartStep): open the
// step in the session and go to the page its target lives on.
export const GET: RequestHandler = async (event) => {
	const requested = event.url.searchParams.get('step');
	if (!isStep(requested)) redirect(303, '/dashboard');
	const step = resolveStep(requested, await getOnboardingProgress(event));
	if (!step) {
		await clearGuidedStep(event);
		await setGuidedShowCompleted(event);
		redirect(303, '/dashboard');
	}
	const source = (await takeGuidedPendingSource(event)) || 'auto';
	await startGuidedStep(event, step, source, Date.now());
	redirect(303, stepPath(step));
};
