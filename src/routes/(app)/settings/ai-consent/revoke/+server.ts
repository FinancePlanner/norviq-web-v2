import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { revokeAIConsent } from '#lib/features/settings-admin/ai-providers/ai-consent.server.js';

// Port of norviq-web SettingsAIConsentRevoke (ai_consent.go). A plain form
// post from the AI providers page; AI features stop on the backend at once.
export const POST: RequestHandler = async (event) => {
	try {
		await revokeAIConsent(event);
	} catch (err) {
		console.warn('revoke ai consent failed', err);
		redirect(303, '/settings/ai-providers?consent=error');
	}
	redirect(303, '/settings/ai-providers?consent=revoked');
};
