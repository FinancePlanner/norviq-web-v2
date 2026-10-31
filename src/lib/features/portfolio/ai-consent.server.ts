import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';

// Port of middleware.RequireAIConsent / api.AIConsent. Candidate for
// #lib/server once another domain needs it.
//
// The lookup is GET /v1/users/ai-consent; `consentedAt` null means not given
// (or withdrawn). A failed lookup defers to the backend (which refuses AI
// calls with 403 AI_CONSENT_REQUIRED anyway), exactly as Go did.

export const AI_CONSENT_REQUIRED_REASON = 'AI_CONSENT_REQUIRED';

/** true when consent is granted, or when the lookup failed (defer to backend). */
export async function aiConsentGranted(event: RequestEvent): Promise<boolean> {
	try {
		const consent = await apiJSON<{ consentedAt?: string | null }>(
			event,
			'GET',
			'/v1/users/ai-consent'
		);
		return !!consent?.consentedAt;
	} catch (err) {
		console.warn('ai consent lookup failed; deferring to backend', event.url.pathname, err);
		return true;
	}
}

/** api.IsAIConsentRequired for an apiJSON/apiFetch failure. */
export function isAIConsentRequired(err: unknown): boolean {
	return isAPIError(err) && err.status === 403 && err.reason === AI_CONSENT_REQUIRED_REASON;
}

/** middleware.SafeLocalPath: a same-site path with its query, or null. */
function safeLocalPath(raw: string | null, origin: string): string | null {
	const v = (raw ?? '').trim();
	if (!v) return null;
	try {
		const u = new URL(v, origin);
		if (u.origin !== origin) return null;
		if (!u.pathname.startsWith('/') || u.pathname.startsWith('//')) return null;
		return u.pathname + u.search;
	} catch {
		return null;
	}
}

/**
 * AIConsentReturnPath: where Allow sends the reader back to — the page for a
 * GET navigation, else the Referer, else /dashboard.
 */
export function aiConsentReturnPath(event: RequestEvent): string {
	const candidates: (string | null)[] = [];
	if (event.request.method === 'GET') candidates.push(event.url.pathname + event.url.search);
	candidates.push(event.request.headers.get('referer'));
	for (const c of candidates) {
		const p = safeLocalPath(c, event.url.origin);
		if (p) return p;
	}
	return '/dashboard';
}
