import { json, type RequestHandler } from '@sveltejs/kit';
import {
	loadMarketBriefCard,
	parseMarketBriefQuery
} from '#lib/features/dashboard/market-brief/load.server.js';

// GET /dashboard/market-brief — Go marketBriefHandler.Partial("/dashboard/market-brief").
// JSON for MarketBriefShell instead of the card fragment; { vm: null } is Go's
// empty 200 (feature off, nothing generated, backend down). A malformed
// slot/date — which the card never sends — is a 400.
export const GET: RequestHandler = async (event) => {
	const key = parseMarketBriefQuery(event.url.searchParams, new Date());
	if (!key) return new Response(null, { status: 400, headers: { 'X-Robots-Tag': 'noindex' } });
	const vm = await loadMarketBriefCard(event, '/dashboard/market-brief', key);
	return json(
		{ vm },
		{ headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'private, no-store' } }
	);
};
