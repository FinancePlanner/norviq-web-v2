import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	guardInProgress,
	markOnboardingComplete,
	recordFunnelComplete,
	recordFunnelStep
} from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';
import {
	budgetPageVM,
	submitBudget
} from '#lib/features/auth-onboarding/onboarding/budget.server.js';

// GET /onboarding/budget (onboarding.go Budget)
export const load: PageServerLoad = async (event) => {
	if (event.request.method === 'GET') {
		await guardInProgress(event);
		await recordFunnelStep(event, 'budget');
	}
	return { step: 3, vm: budgetPageVM() };
};

export const actions: Actions = {
	// POST /onboarding/budget (BudgetSubmit). Go answered a failed native post
	// with the bare BudgetForm fragment; here the whole page re-renders with the
	// error banner.
	default: async (event) => {
		const form = await event.request.formData().catch(() => null);
		if (!form) return { vm: budgetPageVM('Invalid form submission.') };
		const error = await submitBudget(event, form);
		if (error) return { vm: budgetPageVM(error) };
		await recordFunnelComplete(event);
		await markOnboardingComplete(event);
		redirect(303, '/onboarding/done');
	}
};
