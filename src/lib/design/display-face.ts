// Where the display face (Brygada 1918, --font-display) is above the fold: the
// Overview greeting, the brief, and the page title of Document-grammar pages
// (.vigil-page-title). hooks.server.ts preloads the font on exactly those
// routes when it renders them, so the list never ships to the browser (every
// app route has a size budget). Client-side navigations get no preload; the
// @font-face (font-display: swap) loads it on first use and it stays cached.
// display-face.spec.ts derives the same list from the route sources and fails
// when a route is missing or extra.

export const DISPLAY_FACE_HREF = '/static/fonts/brygada-1918-latin-wght-normal.woff2';

const APP_ROUTES = [
	'achievements',
	'boards/[slug]/submit',
	'boards/activity',
	'boards/guidelines',
	'dashboard',
	'friends',
	'friends/facebook/callback',
	'friends/feed',
	'friends/invite',
	'friends/leaderboard',
	'friends/u/[userId]',
	'friends/u/[userId]/achievements',
	'friends/x/callback',
	'groups/[groupID]/settings',
	'groups/new',
	'pilots/[slug]/follow',
	'settings',
	'settings/about',
	'settings/ai-providers',
	'settings/api-access',
	'settings/appearance',
	'settings/badges',
	'settings/banks',
	'settings/blocked',
	'settings/export',
	'settings/feedback',
	'settings/friends-privacy',
	'settings/integrations',
	'settings/language',
	'settings/news-ticker',
	'settings/notifications',
	'settings/profile',
	'settings/subscription',
	'tax/filing',
	'xp'
];

const ROUTES = new Set([
	...APP_ROUTES.map((route) => `/(app)/${route}`),
	'/(public)/brief/[date]/[slot]'
]);

/** True when the route (SvelteKit `page.route.id`) shows the display face above the fold. */
export function usesDisplayFace(routeId: string | null | undefined): boolean {
	return routeId ? ROUTES.has(routeId) : false;
}

const PRELOAD = `<link rel="preload" href="${DISPLAY_FACE_HREF}" as="font" type="font/woff2" crossorigin>`;

/** Adds the font preload before </head>; a streamed chunk without one is returned as is. */
export function withDisplayFacePreload(html: string): string {
	return html.replace('</head>', `${PRELOAD}</head>`);
}
