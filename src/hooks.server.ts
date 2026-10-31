import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { LANG_COOKIE, resolveRequestLanguage, translator } from '#lib/i18n/index.ts';
import { Session } from '#lib/server/session.js';
import { config } from '#lib/server/env.js';
import { apiJSON } from '#lib/server/api.js';
import { resume, postAuthRedirect } from '#lib/server/onboarding.js';
import { redirect } from '@sveltejs/kit';

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
		const resp = await apiJSON<AuthResponse>(
			event,
			'POST',
			'/v1/auth/refresh',
			{
				refreshToken: auth.refreshToken
			},
			{ auth: 'none' }
		);
		await event.locals.session.saveAuth(resp);
	} catch (err) {
		console.error('refresh session token', err);
		await event.locals.session.destroy();
	}
}

// Staging preview wall: the preview Worker is on a public workers.dev URL, so
// PREVIEW_BASIC_AUTH ("user:pass") keeps strangers out. Unset in production.
function previewAuthorized(header: string | null, expected: string): boolean {
	if (!expected) return true;
	if (!header?.startsWith('Basic ')) return false;
	try {
		return atob(header.slice(6)) === expected;
	} catch {
		return false;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const cfg = config();
	if (!previewAuthorized(event.request.headers.get('authorization'), cfg.previewBasicAuth)) {
		return new Response('Authentication required', {
			status: 401,
			headers: { 'WWW-Authenticate': 'Basic realm="Norviq staging", charset="UTF-8"' }
		});
	}
	const locale = resolveRequestLanguage(
		event.cookies.get(LANG_COOKIE),
		event.request.headers.get('accept-language')
	);
	event.locals.locale = locale;
	event.locals.t = translator(locale);
	event.locals.session = await Session.load(event.cookies, {
		secret: cfg.sessionSecret,
		secure: cfg.cookieSecure,
		idleMinutes: cfg.sessionIdleMinutes
	});
	await refreshIfNeeded(event);

	// Route-group guards, mirroring the chi groups in norviq-web server.go:
	//   (guest)      RedirectIfAuthenticated
	//   (onboarding) RequireAuth
	//   (app)        RequireAuth + RequireOnboardingComplete
	// Done here rather than in layout loads so form actions and +server
	// endpoints inside a group are guarded too.
	const group = event.route.id ?? '';
	const authed = event.locals.session.isAuthenticated;
	if (group.startsWith('/(app)') || group.startsWith('/(onboarding)')) {
		if (!authed)
			redirect(303, '/login?next=' + encodeURIComponent(event.url.pathname + event.url.search));
		if (group.startsWith('/(app)')) {
			const path = await resume(event);
			if (path) redirect(303, path);
		}
	} else if (group.startsWith('/(guest)') && authed && event.request.method === 'GET') {
		redirect(303, await postAuthRedirect(event));
	}

	const response = await resolve(event, {
		// locals.locale, not the request's: a page whose language comes from its
		// URL (/brief/{date}/{slot}?lang=pt-PT) sets it in its load.
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	if (!response.headers.has('X-Frame-Options')) response.headers.set('X-Frame-Options', 'DENY');
	return response;
};

export const handleError: HandleServerError = (input) => {
	if (input.kind === 'unknown') console.error(input.event.url.pathname, input.error);
};
