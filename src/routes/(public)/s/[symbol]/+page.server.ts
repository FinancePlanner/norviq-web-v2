import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { config, publicPagesEnabled } from '#lib/server/env.js';
import { allowedSymbol } from '#lib/publicsymbols.js';
import {
	cachedPublicStock,
	normalizePublicSymbol
} from '#lib/features/public/stock/load.server.js';

// GET /s/{symbol} — handlers.PublicStockHandler.Page.
export const load: PageServerLoad = async (event) => {
	// Off, not broken: without a token there is nothing to render, and a 404
	// keeps these URLs out of the index.
	if (!publicPagesEnabled(config())) error(404, 'Not Found');

	const symbol = normalizePublicSymbol(event.params.symbol);
	if (!symbol || !allowedSymbol(symbol)) error(404, 'Not Found');

	let vm;
	try {
		vm = await cachedPublicStock(event, symbol);
	} catch (err) {
		console.error('render public stock page', { symbol, error: String(err) });
		error(500, 'Failed to render page');
	}

	// Go: `public, max-age=900` with Set-Cookie and `Vary: Cookie` stripped.
	// Every visitor in Go got the same cached bytes; here the root layout also
	// serialises the signed-in user into the page, so a visitor with a session
	// gets the same max-age as a private response (deviation, see
	// docs/parity/public.md).
	event.setHeaders({
		'Cache-Control': event.locals.session.isAuthenticated
			? 'private, max-age=900'
			: 'public, max-age=900'
	});
	return { vm };
};
