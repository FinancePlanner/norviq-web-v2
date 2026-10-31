// Port of norviq-web internal/pages/landing (model.go, hero_cards.go,
// structured_data.go) and internal/landing/device.go. Pure; safe on server
// and client.

/** config.DiscordURL: the community invite (landing footer, llms.txt). */
export { DiscordURL } from '#lib/discord.js';

/** The 1200×630 share card. */
export const OGImagePath = '/static/images/og.png';

export interface LandingVM {
	appStoreURL: string;
	appStoreID: string;
	googlePlayURL: string;
	/** Canonical origin, no trailing slash (PUBLIC_BASE_URL). */
	publicBaseURL: string;
}

export function absoluteURL(vm: LandingVM, path: string): string {
	return vm.publicBaseURL ? vm.publicBaseURL + path : path;
}

// --- internal/landing/device.go ---

export const StayWebCookieName = 'norviq_stay_web';
export const StayWebQueryParam = 'web';

export function isIOSMobile(userAgent: string): boolean {
	const ua = userAgent.toLowerCase();
	return ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
}

// --- config.go helpers ---

/** AppStoreIDFromURL: the digits after the last "/id". */
export function appStoreIDFromURL(url: string): string {
	const i = url.lastIndexOf('/id');
	return i >= 0 ? url.slice(i + 3) : '';
}

/** GooglePlayListingURL: "" for the pre-launch store-search placeholder. */
export function googlePlayListingURL(url: string): string {
	const u = url.trim();
	return u.includes('play.google.com/store/search') ? '' : u;
}

// --- structured_data.go ---

const norviqXURL = 'https://x.com/NorviqPlanner';

/** Go json.Marshal: map keys sorted (struct-free maps only here), <>& escaped. */
function goJSON(value: unknown): string {
	const sortDeep = (v: unknown): unknown =>
		Array.isArray(v)
			? v.map(sortDeep)
			: v && typeof v === 'object'
				? Object.fromEntries(
						Object.keys(v)
							.sort()
							.map((k) => [k, sortDeep((v as Record<string, unknown>)[k])])
					)
				: v;
	return JSON.stringify(sortDeep(value))
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026');
}

/** The JSON-LD @graph: the product, its publisher and the website. */
export function structuredData(vm: LandingVM): string {
	const home = absoluteURL(vm, '/');
	const orgID = home + '#organization';
	const siteID = home + '#website';
	const appID = home + '#app';
	const image = {
		'@type': 'ImageObject',
		url: absoluteURL(vm, OGImagePath),
		width: 1200,
		height: 630
	};
	const sameAs = vm.appStoreURL ? [vm.appStoreURL, norviqXURL] : [norviqXURL];
	const app: Record<string, unknown> = {
		'@type': 'SoftwareApplication',
		'@id': appID,
		name: 'Norviq',
		url: home,
		applicationCategory: 'FinanceApplication',
		operatingSystem: 'iOS, Web',
		description:
			'Professional stock planning and portfolio intelligence for disciplined investors. Portfolio, budgeting, and AI-assisted research in one private workspace.',
		image,
		screenshot: image,
		featureList: [
			'Portfolio and watchlists',
			'Spending and budgets',
			'AI-powered signals',
			'MCP integrations'
		],
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		publisher: { '@id': orgID },
		isPartOf: { '@id': siteID },
		sameAs
	};
	if (vm.appStoreURL) {
		app.installUrl = vm.appStoreURL;
		app.downloadUrl = vm.appStoreURL;
	}
	const org = {
		'@type': 'Organization',
		'@id': orgID,
		name: 'Norviq',
		url: home,
		logo: image,
		sameAs
	};
	const site = {
		'@type': 'WebSite',
		'@id': siteID,
		url: home,
		name: 'Norviq',
		description:
			'Professional stock planning and portfolio intelligence for disciplined investors.',
		inLanguage: 'en',
		publisher: { '@id': orgID }
	};
	return goJSON({ '@context': 'https://schema.org', '@graph': [org, site, app] });
}
