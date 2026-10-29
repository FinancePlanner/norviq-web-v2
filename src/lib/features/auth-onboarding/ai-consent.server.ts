// internal/handlers/ai_consent.go + middleware.SafeLocalPath.
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';

/** middleware.SafeLocalPath: a same-site path (+query), or null. */
export function safeLocalPath(raw: string | null | undefined, host: string): string | null {
	const v = (raw ?? '').trim();
	if (!v) return null;
	let parsed: URL;
	let absolute = false;
	try {
		absolute = /^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith('//');
		parsed = new URL(v, 'http://placeholder.invalid');
	} catch {
		return null;
	}
	if (absolute) {
		const scheme = parsed.protocol.replace(/:$/, '');
		if (scheme !== 'http' && scheme !== 'https') return null;
		if (!host || parsed.host.toLowerCase() !== host.toLowerCase()) return null;
	}
	// Browsers treat a backslash like a slash, so "/\evil.example" would leave the site.
	const decoded = (() => {
		try {
			return decodeURIComponent(parsed.pathname);
		} catch {
			return parsed.pathname;
		}
	})();
	if (decoded.startsWith('//') || decoded.includes('\\') || v.includes('\\')) return null;
	const path = parsed.pathname;
	if (!path.startsWith('/') || path.startsWith('//')) return null;
	return path + parsed.search;
}

export interface AIConsent {
	consentedAt?: string | null;
}

/** AIConsentGrant: record consent, then return to the AI surface that asked. */
export async function grantAIConsent(event: RequestEvent) {
	const form = await event.request.formData().catch(() => null);
	if (!form) return fail(400, { next: '/dashboard', message: 'Invalid form submission.' });
	const next = safeLocalPath(String(form.get('next') ?? ''), event.url.host) ?? '/dashboard';
	let consent: AIConsent | null = null;
	try {
		consent = await apiJSON<AIConsent>(event, 'POST', '/v1/users/ai-consent');
	} catch (err) {
		console.warn('grant ai consent failed', err);
	}
	// RenderAIConsentPage(…, 502): the prompt again.
	if (!consent?.consentedAt) return fail(502, { next, message: '' });
	redirect(303, next);
}
