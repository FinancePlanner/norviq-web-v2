import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createShareLink, revokeShareLink, shareScope } from '#lib/features/portfolio/holdings/holdings.server.js';

// POST / DELETE /portfolio/one-page/share-link — PortfolioShareLinkCreate /
// PortfolioShareLinkRevoke. Go swapped SharePanel in place; this answers its data.
export const POST: RequestHandler = async (event) => {
	const scope = shareScope(event.url.searchParams.get('portfolio'));
	return json(await createShareLink(event, scope));
};

export const DELETE: RequestHandler = async (event) => {
	const scope = shareScope(event.url.searchParams.get('portfolio'));
	const raw = event.url.searchParams.get('revoke') ?? '';
	const target = raw !== '' ? shareScope(raw) : scope;
	return json(await revokeShareLink(event, scope, target));
};
