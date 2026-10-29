import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';

// Port of norviq-web middleware/ai_consent.go (RequireAIConsent,
// AIConsentReturnPath, SafeLocalPath) and api.IsAIConsentRequired, scoped to
// the money routes. The backend is the real gate; this only turns the first
// contact with an AI feature into an explanation rather than an error.

export const AI_CONSENT_REQUIRED_REASON = 'AI_CONSENT_REQUIRED';

/**
 * true when consent is definitely missing. A failed lookup returns false and
 * defers to the backend, which refuses with AI_CONSENT_REQUIRED on its own.
 */
export async function aiConsentMissing(event: RequestEvent): Promise<boolean> {
	try {
		const consent = await apiJSON<{ consentedAt?: string | null }>(event, 'GET', '/v1/users/ai-consent');
		return !consent?.consentedAt;
	} catch (err) {
		console.warn('ai consent lookup failed; deferring to backend', event.url.pathname, err);
		return false;
	}
}

/** api.IsAIConsentRequired on a raw backend response body. */
export function isAIConsentRequired(status: number, body: string): boolean {
	if (status !== 403 || !body) return false;
	try {
		return (JSON.parse(body) as { reason?: string }).reason === AI_CONSENT_REQUIRED_REASON;
	} catch {
		return false;
	}
}

/** middleware.SafeLocalPath: a same-site path with its query, or null. */
export function safeLocalPath(raw: string | null | undefined, host: string): string | null {
	const value = (raw ?? '').trim();
	if (!value) return null;
	let parsed: URL;
	const absolute = /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//');
	try {
		parsed = new URL(value, 'http://placeholder.invalid');
	} catch {
		return null;
	}
	if (absolute) {
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		if (!host || parsed.host.toLowerCase() !== host.toLowerCase()) return null;
	}
	const path = parsed.pathname;
	if (path.startsWith('//') || decodeURIComponent(path).includes('\\') || value.includes('\\')) return null;
	if (!path.startsWith('/')) return null;
	return path + parsed.search;
}

/**
 * Where Allow should send the user back to. A full-page GET returns to itself;
 * an action or a client-side data request (the planner modal preloading this
 * route) returns to the page the reader was on (Referer), as htmx's
 * HX-Current-URL did.
 */
export function aiConsentReturnPath(event: RequestEvent): string {
	const candidates: string[] = [];
	if (event.request.method === 'GET' && !event.isDataRequest) candidates.push(event.url.pathname + event.url.search);
	candidates.push(event.request.headers.get('referer') ?? '');
	for (const c of candidates) {
		const path = safeLocalPath(c, event.url.host);
		if (path) return path;
	}
	return '/dashboard';
}
