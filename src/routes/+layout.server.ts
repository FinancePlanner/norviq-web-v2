import type { LayoutServerLoad } from './$types';
import { runtimeConfig } from '#lib/analytics/runtime.server.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	const auth = locals.session.auth;
	return {
		locale: locals.locale,
		user: auth ? { id: auth.userId, username: auth.username, email: auth.email } : null,
		// Sentry/PostHog settings + the capture-once flag (popped here), the
		// v2 replacement for Go's /runtime-config.js.
		runtime: await runtimeConfig({ locals })
	};
};
