import { json, type RequestHandler } from '@sveltejs/kit';
import { getOnboardingProgress } from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';
import {
	STEP_TIMEOUT_MS,
	allDone,
	progressOf,
	stepDone,
	type PollResult,
	type Step
} from '#lib/features/auth-onboarding/guided-start/guide.js';
import {
	activeGuidedStep,
	clearGuidedStep,
	setGuidedShowCompleted
} from '#lib/features/auth-onboarding/guided-start/guided.server.js';

// GET /guided-start/poll (guided_start.go GuidedStartPoll). Go answered with
// htmx fragments (Poller / StepDone / StepEnded / empty); this answers with
// the same decision as JSON for GuidedStepLayer.
export const GET: RequestHandler = async (event) => {
	const active = activeGuidedStep(event);
	if (!active) return json({ state: 'none' } satisfies PollResult);
	const step = active.step as Step;
	const elapsed = Date.now() - active.startedAt;
	const outcome = { step, elapsedMs: elapsed, elsewhere: !active.acted };

	const p = await getOnboardingProgress(event);
	if (p && stepDone(step, p)) {
		await clearGuidedStep(event);
		if (allDone(progressOf(p))) await setGuidedShowCompleted(event);
		return json({ state: 'done', outcome } satisfies PollResult);
	}
	if (elapsed >= STEP_TIMEOUT_MS) {
		await clearGuidedStep(event);
		return json({ state: 'ended', event: 'guided_start_step_timed_out', outcome } satisfies PollResult);
	}
	return json({ state: 'pending' } satisfies PollResult);
};
