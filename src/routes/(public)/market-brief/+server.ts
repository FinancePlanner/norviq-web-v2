import { json, type RequestHandler } from '@sveltejs/kit';
import { loadMarketBriefCard, parseMarketBriefQuery } from '#lib/features/dashboard/market-brief/load.server.js';

// GET /market-brief — Go marketBriefHandler.Partial("/market-brief"): the
// card on the logged-out landing page. Public on purpose: it reads the
// backend with PUBLIC_API_TOKEN, never a session. JSON for MarketBriefShell
// (same contract as /dashboard/market-brief); { vm: null } is Go's empty 200.
export const GET: RequestHandler = async (event) => {
	const key = parseMarketBriefQuery(event.url.searchParams, new Date());
	if (!key) return new Response(null, { status: 400, headers: { 'X-Robots-Tag': 'noindex' } });
	const vm = await loadMarketBriefCard(event, '/market-brief', key);
	return json({ vm }, { headers: { 'X-Robots-Tag': 'noindex' } });
};
