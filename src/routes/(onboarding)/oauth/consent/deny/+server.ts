import type { RequestHandler } from '@sveltejs/kit';
import { decideConsent } from '#lib/features/auth-onboarding/oauth-consent.server.js';

// POST /oauth/consent/deny (oauth_consent.go OAuthConsentDeny)
export const POST: RequestHandler = (event) => decideConsent(event, false);
