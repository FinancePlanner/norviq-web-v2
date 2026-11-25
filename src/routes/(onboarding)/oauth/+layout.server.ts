import type { LayoutServerLoad } from './$types';
import { loadAppContext } from '#lib/server/app-context.js';
import { availableFeatures } from '#lib/billing.js';
import { sidebarDomains } from '#lib/nav/visible.js';

// /oauth/consent renders inside the app shell (Go renderShell) but sits in the
// RequireAuth-only group: an MCP client's sign-in must not detour through the
// onboarding funnel. Same shell data as (app)/+layout.server.ts.
export const load: LayoutServerLoad = async (event) => {
	const ctx = await loadAppContext(event);
	const auth = event.locals.session.auth!;
	return {
		username: auth.username,
		email: auth.email,
		trialExpired: ctx.trialExpired,
		billingUnknown: ctx.billingUnknown,
		// The shell resolves its active state and sub-nav from these, as in (app).
		features: availableFeatures(ctx.billing),
		social: ctx.social,
		articles: ctx.articles,
		sidebar: sidebarDomains(event.locals.t, {
			social: ctx.social,
			articles: ctx.articles,
			locked: ctx.locked
		})
	};
};
