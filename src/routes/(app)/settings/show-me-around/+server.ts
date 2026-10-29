import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';

// Go AppHandler.ShowMeAround (guided_start.go): reopen the guided-start card
// for this session and send the reader to the dashboard. Session keys are the
// Go names from internal/session/guided_start.go.
const KEY_GUIDED_PENDING_SOURCE = 'guidedStartPendingSource';
const KEY_GUIDED_SHOW_COMPLETED = 'guidedStartShowCompleted';

interface OnboardingProgress {
	addHoldingCompleted?: boolean;
	setBudgetCompleted?: boolean;
	setGoalCompleted?: boolean;
}

export const POST: RequestHandler = async (event) => {
	let progress: OnboardingProgress | null = null;
	try {
		progress = await apiJSON<OnboardingProgress>(event, 'PATCH', '/v1/onboarding', { guidedStartDismissed: false }, { signal: AbortSignal.timeout(3000) });
	} catch (err) {
		console.warn('guided start: show me around', err);
	}
	const session = event.locals.session;
	// guide.ProgressOf(progress).AllDone(): every step done.
	if (progress && progress.addHoldingCompleted && progress.setBudgetCompleted && progress.setGoalCompleted) {
		await session.set(KEY_GUIDED_SHOW_COMPLETED, true);
	}
	await session.set(KEY_GUIDED_PENDING_SOURCE, 'settings');
	await setPostHogCaptureOnce(event.locals, 'guided_start_reopened', null);
	redirect(303, '/dashboard');
};
