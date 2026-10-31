import type { LayoutServerLoad } from './$types';
import { loadAppContext } from '#lib/server/app-context.js';
import { sidebarItemsFor } from '#lib/nav.js';
import { availableFeatures } from '#lib/billing.js';
import { guidedStepLayer } from '#lib/features/auth-onboarding/guided-start/guided.server.js';

// Signed-in, onboarded pages. Auth and the onboarding gate run in
// hooks.server.ts; this loads what the shell needs (AttachProStatus +
// AttachSocialConfig + AttachArticlesAvailability).
export const load: LayoutServerLoad = async (event) => {
	const ctx = await loadAppContext(event);
	const auth = event.locals.session.auth!;
	return {
		username: auth.username,
		email: auth.email,
		isPro: ctx.isPro,
		billingUnknown: ctx.billingUnknown,
		trialExpired: ctx.trialExpired,
		features: availableFeatures(ctx.billing),
		social: ctx.social,
		articles: ctx.articles,
		sidebarItems: sidebarItemsFor(event.locals.t, {
			social: ctx.social,
			articles: ctx.articles,
			locked: ctx.locked
		}),
		// Go renderShell → withGuidedStepLayer: the open guided-start step, if any.
		guidedStep: await guidedStepLayer(event)
	};
};
