import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/env';
import * as privateEnv from '$app/env/private';
import { apiJSON } from '#lib/server/api.js';

// DEV ONLY. Signs the browser in as a staging test account so porting work can
// check signed-in pages before the real /login port lands. 404 outside
// `vite dev`. Usage: /__dev/login?as=onboarding&next=/onboarding
export const GET: RequestHandler = async (event) => {
	if (!dev) error(404, 'Not found');
	const env = privateEnv as Record<string, string | undefined>;
	const which = event.url.searchParams.get('as') === 'onboarding' ? 'DEV_LOGIN_EMAIL_ONBOARDING' : 'DEV_LOGIN_EMAIL';
	const email = env[which];
	const password = env.DEV_LOGIN_PASSWORD;
	if (!email || !password) error(500, `${which} / DEV_LOGIN_PASSWORD not set in .env`);
	const res = await apiJSON<{ status?: string; auth?: Parameters<typeof event.locals.session.saveAuth>[0] }>(
		event,
		'POST',
		'/v1/auth/login',
		{ email, password },
		{ auth: 'none' }
	);
	const auth = res.auth ?? (res as unknown as Parameters<typeof event.locals.session.saveAuth>[0]);
	await event.locals.session.destroy();
	await event.locals.session.saveAuth(auth);
	redirect(303, event.url.searchParams.get('next') || '/dashboard');
};
