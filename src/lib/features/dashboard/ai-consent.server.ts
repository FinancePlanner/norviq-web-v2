import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';

// Port of norviq-web internal/middleware/ai_consent.go (RequireAIConsent,
// AIConsentReturnPath, SafeLocalPath) and internal/api/ai_consent.go.
//
// The backend is the real gate: every AI endpoint answers 403
// AI_CONSENT_REQUIRED without consent. This check exists so the first contact
// with an AI feature is an explanation rather than an error.

export const AI_CONSENT_REQUIRED = 'AI_CONSENT_REQUIRED';

interface AIConsent {
	consentedAt?: string | null;
}

/**
 * RequireAIConsent's lookup. A failed lookup returns true ("defer to the
 * backend"), exactly like the Go middleware, which let the request through.
 */
export async function hasAIConsent(event: RequestEvent): Promise<boolean> {
	try {
		const consent = await apiJSON<AIConsent>(event, 'GET', '/v1/users/ai-consent');
		return !!consent?.consentedAt;
	} catch (err) {
		console.warn('ai consent lookup failed; deferring to backend', event.url.pathname, err);
		return true;
	}
}

/** api.IsAIConsentRequired: the backend's 403 AI_CONSENT_REQUIRED refusal. */
export function isAIConsentRequired(err: unknown): boolean {
	return (
		isAPIError(err) &&
		err.status === 403 &&
		(err.reason === AI_CONSENT_REQUIRED || err.code === AI_CONSENT_REQUIRED)
	);
}

/** SafeLocalPath: reduce an absolute URL on this host, or a path, to a same-site path + query. */
export function safeLocalPath(raw: string | null | undefined, host: string): string | null {
	const value = (raw ?? '').trim();
	if (!value) return null;
	let parsed: URL;
	const absolute = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) || value.startsWith('//');
	try {
		parsed = new URL(value, 'http://placeholder.invalid');
	} catch {
		return null;
	}
	if (absolute) {
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		if (!host || parsed.host.toLowerCase() !== host.toLowerCase()) return null;
	}
	if (!absolute && !value.startsWith('/')) return null;
	const decoded = (() => {
		try {
			return decodeURIComponent(parsed.pathname);
		} catch {
			return parsed.pathname;
		}
	})();
	if (decoded.startsWith('//') || decoded.includes('\\') || value.includes('\\')) return null;
	const path = parsed.pathname;
	if (!path.startsWith('/') || path.startsWith('//')) return null;
	return path + parsed.search;
}

/**
 * AIConsentReturnPath: where Allow should send the user back to. A page GET
 * returns to itself; anything else (a fragment fetch, a form post) returns to
 * the Referer. Falls back to /dashboard.
 */
export function aiConsentReturnPath(event: RequestEvent, opts: { self?: boolean } = {}): string {
	const host = event.url.host;
	const candidates: (string | null)[] = [];
	if (opts.self ?? event.request.method === 'GET')
		candidates.push(event.url.pathname + event.url.search);
	candidates.push(event.request.headers.get('referer'));
	for (const c of candidates) {
		const path = safeLocalPath(c, host);
		if (path) return path;
	}
	return '/dashboard';
}

/** The JSON shape RenderAIConsentRequired gives script (non-HTML) callers. */
export function aiConsentRequiredJSON(next: string) {
	return {
		error: true,
		reason: AI_CONSENT_REQUIRED,
		consentUrl: '/ai-consent?next=' + encodeURIComponent(next)
	};
}
