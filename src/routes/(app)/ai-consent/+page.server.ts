import type { Actions, PageServerLoad } from './$types';
import { grantAIConsent, safeLocalPath } from '#lib/features/auth-onboarding/ai-consent.server.js';

// GET /ai-consent (ai_consent.go AIConsentPage): where AI surfaces send the
// reader after a 403 AI_CONSENT_REQUIRED.
export const load: PageServerLoad = async ({ url }) => ({
	next: safeLocalPath(url.searchParams.get('next'), url.host) ?? '/assistant'
});

// POST /ai-consent (AIConsentGrant)
export const actions: Actions = { default: grantAIConsent };
