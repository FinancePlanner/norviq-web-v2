import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { formatDayMonthYear } from '../api-access/time.js';
import type { AIConsentVM } from './providers.js';

// Port of norviq-web internal/api/ai_consent.go (hand-written there too) and
// loadAIConsentVM from settings_ai_providers.go.
// TODO(dedupe): the /ai-consent port needs the same GET/POST client.

export interface AIConsent {
	consentedAt?: string | null;
}

export const aiConsentGranted = (c: AIConsent | null | undefined) => !!c?.consentedAt;

export function getAIConsent(event: RequestEvent): Promise<AIConsent> {
	return apiJSON<AIConsent>(event, 'GET', '/v1/users/ai-consent');
}

export function revokeAIConsent(event: RequestEvent): Promise<AIConsent> {
	return apiJSON<AIConsent>(event, 'DELETE', '/v1/users/ai-consent');
}

/** loadAIConsentVM: the consent card, plus the one-shot outcome of a revoke (?consent=revoked|error). */
export async function loadAIConsentVM(event: RequestEvent): Promise<AIConsentVM> {
	const vm: AIConsentVM = { known: false, granted: false, since: '', message: '' };
	switch (event.url.searchParams.get('consent')) {
		case 'revoked':
			vm.message = 'AI data sharing is off. AI features will ask again before sending anything.';
			break;
		case 'error':
			vm.message = "Couldn't update your AI consent. Try again.";
			break;
	}
	try {
		const consent = await getAIConsent(event);
		vm.known = true;
		vm.granted = aiConsentGranted(consent);
		// Go: ConsentedAt.Local().Format("2 Jan 2006"); the server's zone, UTC here.
		if (consent?.consentedAt) vm.since = formatDayMonthYear(new Date(consent.consentedAt));
	} catch (err) {
		console.warn('load ai consent failed', err);
	}
	return vm;
}
