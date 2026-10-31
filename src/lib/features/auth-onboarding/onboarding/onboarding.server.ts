// Port of norviq-web internal/handlers/onboarding.go (funnel guard, funnel
// recording, session marks) and internal/session/onboarding.go.
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import {
	OnboardingKey,
	requiresPaywall,
	requiresQuestionnaire,
	resumeStep
} from '#lib/server/onboarding.js';

// handlers onboardingCallTimeout: no funnel call is worth hanging a page for.
const CALL_TIMEOUT_MS = 3000;

export interface OnboardingProgress {
	funnelStep?: string | null;
	funnelCompletedAt?: string | null;
	addHoldingCompleted?: boolean;
	setBudgetCompleted?: boolean;
	setGoalCompleted?: boolean;
	guidedStartDismissedAt?: string | null;
}

export interface OnboardingProgressPatch {
	funnelStep?: string;
	funnelCompleted?: boolean;
	guidedStartDismissed?: boolean;
}

export async function getOnboardingProgress(
	event: RequestEvent
): Promise<OnboardingProgress | null> {
	try {
		return await apiJSON<OnboardingProgress>(event, 'GET', '/v1/onboarding', undefined, {
			signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
		});
	} catch (err) {
		console.warn('guided start: read progress', err);
		return null;
	}
}

/** api.PatchOnboardingProgress with the 3s budget; throws on failure. */
export function patchOnboardingProgress(event: RequestEvent, patch: OnboardingProgressPatch) {
	return apiJSON<OnboardingProgress>(event, 'PATCH', '/v1/onboarding', patch, {
		signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
	});
}

/** recordFunnelStep: best-effort; a failed write costs a resume, not the page. */
export async function recordFunnelStep(event: RequestEvent, step: string): Promise<void> {
	try {
		await patchOnboardingProgress(event, { funnelStep: step });
	} catch (err) {
		console.warn('onboarding: record funnel step', step, err);
	}
}

export async function recordFunnelComplete(event: RequestEvent): Promise<void> {
	try {
		await patchOnboardingProgress(event, { funnelCompleted: true });
	} catch (err) {
		console.warn('onboarding: record funnel completion', err);
	}
}

// --- session marks (internal/session/onboarding.go) -------------------------

const flags = (event: RequestEvent) => event.locals.session.data.flags;

export async function markOnboardingComplete(event: RequestEvent) {
	await event.locals.session.set(OnboardingKey.Complete, true);
}

export function isOnboardingComplete(event: RequestEvent): boolean {
	return !!event.locals.session.get<boolean>(OnboardingKey.Complete);
}

export async function markQuestionnaireComplete(event: RequestEvent) {
	flags(event)[OnboardingKey.QuestionnaireComplete] = true;
	flags(event)[OnboardingKey.QuestionnaireRequired] = false;
	await event.locals.session.save();
}

export async function markPaywallRequired(event: RequestEvent) {
	flags(event)[OnboardingKey.PaywallRequired] = true;
	flags(event)[OnboardingKey.PaywallComplete] = false;
	await event.locals.session.save();
}

export async function markPaywallComplete(event: RequestEvent) {
	flags(event)[OnboardingKey.PaywallComplete] = true;
	flags(event)[OnboardingKey.PaywallRequired] = false;
	await event.locals.session.save();
}

export async function saveQuestionnaireAnswers(
	event: RequestEvent,
	goal: string,
	painPoints: string,
	holdingsPreference: string,
	spendingPreference: string
) {
	const f = flags(event);
	f[OnboardingKey.QuestionnaireGoal] = goal;
	f[OnboardingKey.QuestionnairePainPoints] = painPoints;
	f[OnboardingKey.QuestionnaireHoldingsPref] = holdingsPreference;
	f[OnboardingKey.QuestionnaireSpendingPref] = spendingPreference;
	await event.locals.session.save();
}

// --- funnel guard ------------------------------------------------------------

export const isOnboardingPaywallPath = (path: string) =>
	path === '/onboarding/paywall' || path === '/onboarding/paywall/continue';

/** funnelStepAfterWelcome: is a stored step past welcome? */
export const funnelStepAfterWelcome = (step: string) =>
	step === 'import' || step === 'budget' || step === 'done';

/**
 * afterOnboardingPath: the next path sign-in set aside for onboarding
 * (popped once), or the dashboard.
 */
export async function afterOnboardingPath(event: RequestEvent): Promise<string> {
	const next = event.locals.session.get<string>(OnboardingKey.PendingNext) ?? '';
	if (next) await event.locals.session.remove(OnboardingKey.PendingNext);
	if (next.startsWith('/') && !next.startsWith('//')) return next;
	return '/dashboard';
}

/**
 * guardInProgress bounces requests that do not belong on this funnel page and
 * returns the stored funnel step it read ('' when none), so a page can decide
 * what to record without a second backend call.
 */
export async function guardInProgress(event: RequestEvent): Promise<string> {
	const path = event.url.pathname;
	if (requiresQuestionnaire(event) && path !== '/onboarding/questionnaire')
		redirect(303, '/onboarding/questionnaire');
	if (requiresPaywall(event) && !isOnboardingPaywallPath(path))
		redirect(303, '/onboarding/paywall');
	if (isOnboardingPaywallPath(path)) return '';
	if (path === '/onboarding/done') return '';
	const { step, needs } = await resumeStep(event);
	if (!needs) redirect(303, await afterOnboardingPath(event));
	// resumeStep may have re-armed the questionnaire or paywall for a new
	// session; send the user there rather than past it.
	if (requiresQuestionnaire(event)) redirect(303, '/onboarding/questionnaire');
	if (requiresPaywall(event)) redirect(303, '/onboarding/paywall');
	return step;
}

/** redirectAfterImport target: the budget step, or back to Settings → Integrations once onboarded. */
export function afterImportPath(event: RequestEvent, source: 'csv' | 'manual'): string {
	return isOnboardingComplete(event)
		? '/settings/integrations?import=' + source
		: '/onboarding/budget';
}
