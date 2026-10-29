import { json, type RequestHandler } from '@sveltejs/kit';
import type { PollResult, Step } from '#lib/features/auth-onboarding/guided-start/guide.js';
import { activeGuidedStep, clearGuidedStep } from '#lib/features/auth-onboarding/guided-start/guided.server.js';

// POST /guided-start/skip (guided_start.go GuidedStartSkip)
export const POST: RequestHandler = async (event) => {
	const active = activeGuidedStep(event);
	if (!active) return json({ state: 'none' } satisfies PollResult);
	await clearGuidedStep(event);
	return json({
		state: 'ended',
		event: 'guided_start_step_skipped',
		outcome: { step: active.step as Step, elapsedMs: Date.now() - active.startedAt, elsewhere: false }
	} satisfies PollResult);
};
