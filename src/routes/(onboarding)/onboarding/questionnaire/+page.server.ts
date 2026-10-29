import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requiresQuestionnaire } from '#lib/server/onboarding.js';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';
import {
	markPaywallRequired,
	markQuestionnaireComplete,
	recordFunnelStep,
	saveQuestionnaireAnswers
} from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';

// GET /onboarding/questionnaire (onboarding.go Questionnaire)
export const load: PageServerLoad = async (event) => {
	if (event.request.method === 'GET') {
		if (!requiresQuestionnaire(event)) redirect(303, '/onboarding');
		await recordFunnelStep(event, 'questionnaire');
	}
	return { step: 1 };
};

export const actions: Actions = {
	// POST /onboarding/questionnaire (QuestionnaireSubmit)
	default: async (event) => {
		const form = await event.request.formData().catch(() => null);
		// Go re-rendered the questionnaire on a parse error.
		if (!form) return;
		const goal = String(form.get('goal') ?? '').trim();
		const list = (key: string) => form.getAll(key).map(String).join(',');
		const painPoints = list('pain_points');
		const holdingsPreference = list('holdings_preference');
		const spendingPreference = list('spending_preference');

		await saveQuestionnaireAnswers(event, goal, painPoints, holdingsPreference, spendingPreference);
		await markQuestionnaireComplete(event);
		await markPaywallRequired(event);
		await setPostHogCaptureOnce(event.locals, 'onboarding_questionnaire_completed', {
			goal,
			pain_points: painPoints,
			holdings_preference: holdingsPreference,
			spending_preference: spendingPreference
		});
		redirect(303, '/onboarding/paywall');
	}
};
