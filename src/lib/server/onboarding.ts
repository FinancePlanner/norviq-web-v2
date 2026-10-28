import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from './api.js';
import { setPostHogCaptureOnce } from '../analytics/runtime.server.js';

// Port of norviq-web internal/onboarding/gate.go + internal/session/onboarding.go.
// Flag names match the Go session keys.

export const OnboardingKey = {
	Complete: 'onboardingComplete',
	QuestionnaireRequired: 'onboardingQuestionnaireRequired',
	QuestionnaireComplete: 'onboardingQuestionnaireComplete',
	QuestionnaireGoal: 'onboardingQuestionnaireGoal',
	QuestionnairePainPoints: 'onboardingQuestionnairePainPoints',
	QuestionnaireHoldingsPref: 'onboardingQuestionnaireHoldingsPreference',
	QuestionnaireSpendingPref: 'onboardingQuestionnaireSpendingPreference',
	PaywallRequired: 'onboardingPaywallRequired',
	PaywallComplete: 'onboardingPaywallComplete',
	FunnelResumedSent: 'guidedFunnelResumedSent',
	PendingNext: 'onboardingPendingNext',
	PostHogCaptureEvent: 'posthogCaptureEvent'
} as const;

export interface OnboardingProgress {
	funnelStep?: string | null;
	funnelCompletedAt?: string | null;
	[k: string]: unknown;
}

export function funnelPath(step: string): string {
	switch (step) {
		case 'questionnaire':
			return '/onboarding/questionnaire';
		case 'paywall':
			return '/onboarding/paywall';
		case 'import':
			return '/onboarding/import';
		case 'budget':
			return '/onboarding/budget';
		default:
			return '/onboarding';
	}
}

/** Same-origin relative path from ?next= / form next, or ''. */
export function safeNextPath(next: string | null | undefined): string {
	const v = (next ?? '').trim();
	if (!v || !v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return '';
	return v;
}

export async function resumeStep(event: RequestEvent): Promise<{ step: string; needs: boolean }> {
	const s = event.locals.session;
	if (s.get<boolean>(OnboardingKey.Complete)) return { step: '', needs: false };
	let progress: OnboardingProgress;
	try {
		progress = await apiJSON<OnboardingProgress>(event, 'GET', '/v1/onboarding', undefined, {
			signal: AbortSignal.timeout(3000)
		});
	} catch (err) {
		if (isAPIError(err) && err.notFound) {
			console.warn('onboarding gate: onboarding endpoint missing, letting user through');
			return { step: '', needs: false };
		}
		console.warn('onboarding gate: could not read onboarding progress', err);
		return { step: '', needs: true };
	}
	if (progress.funnelCompletedAt) {
		await s.set(OnboardingKey.Complete, true);
		return { step: '', needs: false };
	}
	const step = progress.funnelStep ?? '';
	if (!s.get<boolean>(OnboardingKey.FunnelResumedSent)) {
		if (step && !s.get(OnboardingKey.PostHogCaptureEvent)) {
			await setPostHogCaptureOnce(event.locals, 'onboarding_funnel_resumed', { step });
		}
		await s.set(OnboardingKey.FunnelResumedSent, true);
	}
	if (step === 'questionnaire' && !s.get(OnboardingKey.QuestionnaireComplete)) {
		await s.set(OnboardingKey.QuestionnaireRequired, true);
	} else if (step === 'paywall' && !s.get(OnboardingKey.PaywallComplete)) {
		s.data.flags[OnboardingKey.PaywallComplete] = false;
		await s.set(OnboardingKey.PaywallRequired, true);
	}
	return { step, needs: true };
}

export async function resume(event: RequestEvent): Promise<string | null> {
	const { step, needs } = await resumeStep(event);
	return needs ? funnelPath(step) : null;
}

export function requiresQuestionnaire(event: RequestEvent): boolean {
	const s = event.locals.session;
	return !!s.get(OnboardingKey.QuestionnaireRequired) && !s.get(OnboardingKey.QuestionnaireComplete);
}

export function requiresPaywall(event: RequestEvent): boolean {
	const s = event.locals.session;
	return !!s.get(OnboardingKey.PaywallRequired) && !s.get(OnboardingKey.PaywallComplete);
}

/** Where to send a reader who just signed in (gate.go PostAuthRedirect). */
export async function postAuthRedirect(event: RequestEvent, nextRaw?: string | null): Promise<string> {
	const next = safeNextPath(nextRaw ?? event.url.searchParams.get('next'));
	const detour = async (path: string) => {
		if (next) await event.locals.session.set(OnboardingKey.PendingNext, next);
		return path;
	};
	if (requiresQuestionnaire(event)) return detour('/onboarding/questionnaire');
	if (requiresPaywall(event)) return detour('/onboarding/paywall');
	const path = await resume(event);
	if (path) return detour(path);
	return next || '/dashboard';
}
