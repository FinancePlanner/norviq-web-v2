import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { loadSocialConfig } from '#lib/server/app-context.js';
import type { SocialConfig } from '#lib/nav.js';

// Ports of norviq-web internal/handlers/social.go helpers used by the
// /settings/friends-privacy and /settings/blocked pages. Dedupe with the
// friends domain port when both land.

/** middleware.RequireSocial: every social route 404s while the backend flag is off. */
export async function requireSocial(event: RequestEvent): Promise<SocialConfig> {
	const cfg = await loadSocialConfig(event);
	if (!cfg.enabled) error(404, 'Not Found');
	return cfg;
}

const TIMEZONE_COOKIE = 'tz';
const TIMEZONE_HEADER = 'X-Timezone';

/** social.Timezone: the browser's IANA zone from the tz cookie, or "UTC". */
export function socialTimezone(event: RequestEvent): string {
	const name = (event.cookies.get(TIMEZONE_COOKIE) ?? '').trim();
	if (!name || name.length > 64 || name === 'Local') return 'UTC';
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: name });
		return name;
	} catch {
		return 'UTC';
	}
}

/** socialDo: a backend call as the signed-in user, carrying X-Timezone. */
export function socialDo<T = unknown>(event: RequestEvent, method: string, path: string, body?: unknown): Promise<T> {
	return apiJSON<T>(event, method, path, body, { headers: { [TIMEZONE_HEADER]: socialTimezone(event) } });
}

/** socialErrorMessage: the backend's own reason for a 4xx, else the fallback. */
export function socialErrorMessage(err: unknown, fallback: string): string {
	if (isAPIError(err)) {
		if (err.status === 403) return 'Your access to friends features has been suspended.';
		if (err.status === 429) return 'Too many requests. Try again in a minute.';
		if (err.status >= 400 && err.status < 500 && err.reason) return err.reason;
	}
	return fallback;
}

/** redirectWith: send the browser to path with a ?notice= or ?error= flash. */
export function redirectWith(path: string, notice: string, errorMessage: string): never {
	const query = new URLSearchParams();
	// url.Values.Encode sorts keys: error before notice.
	if (errorMessage) query.set('error', errorMessage);
	if (notice) query.set('notice', notice);
	const encoded = query.toString();
	redirect(303, encoded ? `${path}?${encoded}` : path);
}

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/** uuidParam: the canonical lower-case UUID, or null when the value is not one. */
export function uuidParam(raw: string | null | undefined): string | null {
	let v = (raw ?? '').trim();
	if (v.startsWith('{') && v.endsWith('}')) v = v.slice(1, -1);
	if (v.toLowerCase().startsWith('urn:uuid:')) v = v.slice(9);
	if (!UUID_RE.test(v)) return null;
	const hex = v.replace(/-/g, '').toLowerCase();
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
