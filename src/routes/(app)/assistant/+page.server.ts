import type { PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { aiConsentReturnPath, hasAIConsent } from '#lib/features/dashboard/ai-consent.server.js';
import { loadAssistantPage } from '#lib/features/dashboard/assistant/assistant.server.js';

// GET /assistant (handlers.Assistant), behind RequireFeature(AIInsights) and
// RequireAIConsent.
export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	if (!(await hasAIConsent(event))) {
		return { aiConsentRequired: true as const, next: aiConsentReturnPath(event) };
	}
	return { aiConsentRequired: false as const, vm: await loadAssistantPage(event) };
};
