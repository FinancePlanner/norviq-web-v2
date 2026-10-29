import type { RequestHandler } from '@sveltejs/kit';
import { decideConsent } from '#lib/features/auth-onboarding/oauth-consent.server.js';

// POST /oauth/consent/approve (oauth_consent.go OAuthConsentApprove)
export const POST: RequestHandler = (event) => decideConsent(event, true);
