import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { clientIP } from '#lib/server/api.js';
import {
	allowVisitor,
	cachedPortfolioShare,
	ShareNotFound,
	ShareUnavailable,
	shareSlugPattern
} from '#lib/features/public/portfolio-share/load.server.js';

// GET /p/{slug} — handlers.PublicPortfolioShareHandler.Page. Not gated on
// PUBLIC_API_TOKEN: the backend route is unauthenticated.
export const load: PageServerLoad = async (event) => {
	const { slug } = event.params;
	// Checked before any backend call so enumeration costs nothing upstream.
	if (!shareSlugPattern.test(slug)) error(404, 'Not Found');

	if (!allowVisitor(clientIP(event))) {
		event.setHeaders({ 'Retry-After': '60' });
		error(429, 'Too many requests');
	}

	let vm;
	try {
		vm = await cachedPortfolioShare(event, slug);
	} catch (err) {
		if (err instanceof ShareNotFound) error(404, 'Not Found');
		if (err instanceof ShareUnavailable) {
			event.setHeaders({ 'Retry-After': '30' });
			error(503, 'Temporarily unavailable');
		}
		console.error('render portfolio share page', err);
		error(500, 'Failed to render page');
	}

	// no-cache, not max-age: a revoked link must stop rendering once the 60s
	// server cache expires.
	event.setHeaders({ 'Cache-Control': 'no-cache' });
	return { vm };
};
