import { json, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { socialDo, socialErrorMessage, socialTimezone } from '#lib/features/settings-admin/social/social.server.js';
import type { SearchVM, SocialUserSearch, StreakSummary, XPCardVM, XPSummary } from './types.js';

// Server-side helpers for the friends/XP port (norviq-web
// internal/handlers/{social,gamification,achievements_api}.go).

export { socialDo, socialErrorMessage };

/** Header the friends components send on fetch-driven posts (Go's HX-Request). */
export const FETCH_HEADER = 'x-nq-fetch';

/** htmx.IsHTMX: the request came from one of our components, not a plain form. */
export const isFetch = (event: RequestEvent) => event.request.headers.get(FETCH_HEADER) === '1';

/** achievementsDo: socialDo plus Accept-Language, so the backend localizes titles. */
export function achievementsDo<T = unknown>(event: RequestEvent, method: string, path: string, body?: unknown): Promise<T> {
	return apiJSON<T>(event, method, path, body, {
		headers: { 'X-Timezone': socialTimezone(event), 'Accept-Language': event.locals.locale }
	});
}

export const isNotFound = (err: unknown) => isAPIError(err) && err.status === 404;

/**
 * redirectWith for a +server.ts POST. A plain form gets the 303 (Go's no-JS
 * path); a component fetch (hx-boost in Go) gets {location} and navigates
 * there itself, so the page does not reload.
 */
export function respondRedirect(event: RequestEvent, path: string, notice: string, errorMessage: string): Response {
	const query = new URLSearchParams();
	// url.Values.Encode sorts keys: error before notice.
	if (errorMessage) query.set('error', errorMessage);
	if (notice) query.set('notice', notice);
	const encoded = query.toString();
	const location = encoded ? `${path}${path.includes('?') ? '&' : '?'}${encoded}` : path;
	if (isFetch(event)) return json({ location });
	redirect(303, location);
}

/** searchUsers: the /friends/search partial and the no-JS ?q= render. */
export async function searchUsers(event: RequestEvent, raw: string): Promise<SearchVM> {
	let query = raw.trim().replace(/^@/, '');
	const vm: SearchVM = { query, users: [], errorMessage: '' };
	if (!query) return vm;
	if (query.length > 64) {
		query = query.slice(0, 64);
		vm.query = query;
	}
	try {
		const result = await socialDo<SocialUserSearch>(event, 'GET', '/v1/social/users/search?' + new URLSearchParams({ q: query }));
		vm.users = result?.users ?? [];
	} catch (err) {
		vm.errorMessage = socialErrorMessage(err, 'Search is unavailable right now.');
	}
	return vm;
}

/** todayIn: the viewer's calendar date in their own zone (YYYY-MM-DD). */
export function todayIn(timezone: string): string {
	try {
		return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
	} catch {
		return new Date().toISOString().slice(0, 10);
	}
}

/** loadXPCard (gamification.go): XP is required, streaks are best-effort. */
export async function loadXPCard(event: RequestEvent): Promise<XPCardVM> {
	const vm: XPCardVM = { xp: null, streaks: null, today: todayIn(socialTimezone(event)), errorMessage: '' };
	try {
		vm.xp = await socialDo<XPSummary>(event, 'GET', '/v1/gamification/xp');
	} catch (err) {
		vm.errorMessage = socialErrorMessage(err, 'Could not load your XP right now.');
		return vm;
	}
	try {
		vm.streaks = await socialDo<StreakSummary>(event, 'GET', '/v1/gamification/streaks');
	} catch {
		// streaks are optional on the card
	}
	return vm;
}
