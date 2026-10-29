import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { config, DEFAULT_IOS_APP_STORE_URL } from '#lib/server/env.js';
import { postAuthRedirect } from '#lib/server/onboarding.js';
import {
	StayWebCookieName,
	StayWebQueryParam,
	appStoreIDFromURL,
	googlePlayListingURL,
	isIOSMobile,
	type LandingVM
} from '#lib/features/public/landing/landing.js';

// GET / — Go RootHandler + LandingHandler.Page (internal/handlers/app.go).
export const load: PageServerLoad = async (event) => {
	// A signed-in reader goes where a fresh sign-in would (PostAuthRedirectPath).
	if (event.locals.session.isAuthenticated) redirect(303, await postAuthRedirect(event));

	const cfg = config();
	const appStoreURL = cfg.iosAppStoreURL || DEFAULT_IOS_APP_STORE_URL;
	const googlePlayURL = googlePlayListingURL(cfg.googlePlayURL);

	// IOS_STORE_REDIRECT_ENABLED: an iPhone/iPad visitor goes to the App
	// Store unless they asked to stay on the web (?web=1, or its cookie).
	const wantsWeb = event.url.searchParams.get(StayWebQueryParam) === '1';
	const bypass = wantsWeb || event.cookies.get(StayWebCookieName) === '1';
	if (cfg.iosStoreRedirectEnabled && isIOSMobile(event.request.headers.get('user-agent') ?? '') && !bypass) {
		redirect(302, appStoreURL, { external: true });
	}
	if (wantsWeb) {
		event.cookies.set(StayWebCookieName, '1', {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			httpOnly: true,
			sameSite: 'lax',
			secure: cfg.cookieSecure
		});
	}

	const vm: LandingVM = {
		appStoreURL,
		appStoreID: appStoreIDFromURL(appStoreURL),
		googlePlayURL,
		publicBaseURL: cfg.publicBaseURL
	};
	return { vm };
};
