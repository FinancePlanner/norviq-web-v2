import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { LANG_COOKIE, resolveRequestLanguage, translator } from '#lib/i18n/index.ts';
import { Session } from '#lib/server/session.js';
import { config } from '#lib/server/env.js';
import { apiJSON } from '#lib/server/api.js';

type AuthResponse = {
	token: string;
	refreshToken: string;
	expiresIn: number;
	refreshExpiresIn: number;
	userId: string;
	username: string;
	email: string;
};

// Port of middleware.refreshTokenIfNeeded: refresh when the access token is
// within 60s of expiry. A failed refresh drops the auth so route guards send
// the reader to /login, as RequireAuth did.
async function refreshIfNeeded(event: Parameters<Handle>[0]['event']) {
	const auth = event.locals.session.auth;
	if (!auth) return;
	const now = Math.floor(Date.now() / 1000);
	if (!auth.tokenExpiresAt || now < auth.tokenExpiresAt - 60) return;
	if (!auth.refreshToken) {
		await event.locals.session.destroy();
		return;
	}
	try {
		const resp = await apiJSON<AuthResponse>(event, 'POST', '/v1/auth/refresh', {
			refreshToken: auth.refreshToken
		}, { auth: 'none' });
		await event.locals.session.saveAuth(resp);
	} catch (err) {
		console.error('refresh session token', err);
		await event.locals.session.destroy();
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const cfg = config();
	const locale = resolveRequestLanguage(event.cookies.get(LANG_COOKIE), event.request.headers.get('accept-language'));
	event.locals.locale = locale;
	event.locals.t = translator(locale);
	event.locals.session = await Session.load(event.cookies, {
		secret: cfg.sessionSecret,
		secure: cfg.cookieSecure,
		idleMinutes: cfg.sessionIdleMinutes
	});
	await refreshIfNeeded(event);

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale)
	});
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	if (!response.headers.has('X-Frame-Options')) response.headers.set('X-Frame-Options', 'DENY');
	return response;
};

export const handleError: HandleServerError = (input) => {
	if (input.kind === 'unknown') console.error(input.event.url.pathname, input.error);
};
